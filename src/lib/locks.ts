import { uuid, WrappedBroadcastChannel } from './helpers'

/**
 * Exposed to allow for slight tweaks of the locking algorithm for testing.
 *
 * @experimental
 */
export const INTERNALS = {
  /**
   * Whether debug messages for each lock are emitted.
   *
   * @experimental
   */
  DEBUG:
    globalThis.localStorage &&
    globalThis.localStorage.getItem &&
    globalThis.localStorage.getItem('supabase.gotrue-js.broadcastLock.debug') === 'true',

  /**
   * Minimum time a lock will wait for messages on the channel before
   * considering the lock as acquired.
   *
   * @experimental
   */
  LOCK_WAIT:
    globalThis.localStorage && globalThis.localStorage.getItem
      ? parseInt(
          globalThis.localStorage.getItem('supabase.gotrue-js.broadcastLock.lock-wait') || '25',
          10
        )
      : 25,

  PROCESSED_MESSAGES: 0,
}

/**
 * Implements cancellable sleep for the specified duration in ms.
 *
 * @returns An object with a `sleeper` promise which you should await. If you
 * call the `cancel` function, the sleep is cancelled and the promise resolves
 * immediately.
 */
function sleep(duration: number) {
  if (globalThis && globalThis.document && globalThis.document.visibilityState !== 'visible') {
    console.warn(
      'gotrue-js broadcastLock: sleeping when the document is not visible may use throttled timers: https://developer.chrome.com/blog/timer-throttling-in-chrome-88/'
    )
  }

  let timeout: any | null = null
  let resolve: (() => void) | null = null

  const promise = new Promise<void>((accept) => {
    resolve = accept
    timeout = setTimeout(() => {
      timeout = null
      resolve = null

      accept()
    }, duration)
  })

  return {
    sleeper: promise,
    cancel: () => {
      if (timeout) {
        clearTimeout(timeout)
      }

      if (resolve) {
        resolve()
      }

      timeout = null
      resolve = null
    },
  }
}

/**
 * Messages sent on the `BroadcastChannel` for {@link #broadcastLock}.
 */
type LockEvent = {
  msg: 'I will acquire the lock!' | 'I have the lock, please wait!' | 'Go'
  id: string
  go?: string
}

/**
 * Implements a distributed global lock based on `BroadcastChannel` with the
 * provided name.
 *
 * The lock will attempt to be acquired until `acquireTimeout` is up. If
 * negative, there will be no timeout. If 0, if the lock can't be acquired
 * immediately a timeout will be thrown.
 *
 * You must not call this recursively, as it will lead to a deadlock.
 *
 * Internals: The lock has 3 states -- acquiring, backoff and acquired.
 *
 * When in the Acquiring state, a message is broadcast `I will acquire the
 * lock!` and a timeout is started. If any message is received in this state,
 * the lock immediately moves to the Backoff state. If no message is received,
 * the lock moves to the Acquired state. It is assumed that if two messages are
 * posted simultaneously at the channel, that both locks will receive the
 * other's message.
 *
 * When in the Backoff state, the lock sleeps for random amount of time before
 * moving back in the Acquiring state. Each time it enters this state, it waits
 * exponentially longer than the last time.
 *
 * When in the Acquired state, the lock broadcasts `I have the lock, please
 * wait!`. If any message is received on the channel, `I have the lock!` is
 * broadcast immediately. The sender of the first `I will acquire the lock!`
 * message received in this state will be sent the `Go` message after the
 * operation is done which gives it priority over all other competing locks.
 * This helps reduce the time needed for the locks to identify who should go
 * next. Once the operation is done, the lock stops replying with `I have the
 * lock, please wait!` messages on the channel.
 *
 * Lock wait times have a default of 25ms but can be configured with the
 * `supabase.gotrue-js.broadcastLock.lock-wait` local storage key.
 *
 * You can check for timeout with the `isAcquireTimeout` property on the error.
 *
 * @experimental
 */
export async function broadcastLock<R>(
  name: string,
  acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  const bc = new WrappedBroadcastChannel<LockEvent>(name)

  try {
    if (acquireTimeout >= 0 && acquireTimeout < INTERNALS.LOCK_WAIT) {
      acquireTimeout = INTERNALS.LOCK_WAIT
    }

    const start = Date.now()

    const id = uuid()

    let state: 'acquiring' | 'backoff' | 'backoff-extend' | 'acquired' = 'acquiring'
    let sleepOperation: ReturnType<typeof sleep> = {
      sleeper: Promise.resolve(),
      cancel: () => {
        /* no-op */
      },
    }

    let nextId: string | null = null

    bc.onmessage = (event: { data: { msg: string; id: string; go?: string } }) => {
      if (INTERNALS.DEBUG) {
        console.log(`broadcastLock(${name})@${id}: received message`, event.data)
      }

      if (state !== 'acquired' && event.data.msg === 'Go' && event.data.go === id) {
        // current lock owner says we can acquire the lock right away
        state = 'acquired'
        sleepOperation.cancel()
      } else {
        if (state === 'acquiring') {
          // any message was received, move to backoff state
          state = 'backoff'
          sleepOperation.cancel()
        } else if (state === 'acquired') {
          // any message was received, reply that the lock is taken
          bc.postMessage({ msg: 'I have the lock, please wait!', id })

          if (event.data.msg === 'I have the lock, please wait!') {
            console.error(
              `broadcastLock(${name})@${id}: multiple tabs have the lock!`,
              event.data.id
            )
          } else if (event.data.msg !== 'Go') {
            if (!nextId) {
              // record the first one who wants the lock since we acquired it so we
              // give them the chance to go after us
              nextId = event.data.id
            }
          }
        } else {
          // backoff state
          if (event.data.msg === 'I have the lock, please wait!') {
            // someone asked about the lock and it's still taken, so immediately pick another longer backoff to minimize the number of messages sent over the channel
            state = 'backoff-extend'
            sleepOperation.cancel()
          }
        }
      }
    }

    let backoffMultiplier = 0

    while (acquireTimeout < 0 || Date.now() - start < acquireTimeout) {
      if (state === 'acquiring') {
        bc.postMessage({ msg: 'I will acquire the lock!', id })

        sleepOperation = sleep(INTERNALS.LOCK_WAIT)
        await sleepOperation.sleeper

        if (state === 'acquiring') {
          // state did not change while sleeping
          state = 'acquired' as typeof state
          // ^^^ cast is to force typescript to consider the onmessage handler
          // above, otherwise it thinks that state can't ever be backoff
        }
      } else if (state === 'backoff') {
        backoffMultiplier += 1
        // sleep randomly but exponentially longer each time
        sleepOperation = sleep(
          INTERNALS.LOCK_WAIT + Math.random() * ((INTERNALS.LOCK_WAIT * backoffMultiplier) / 2)
        )
        await sleepOperation.sleeper

        if (state === 'backoff') {
          // state did not change while in backoff
          state = 'acquiring' as typeof state
        } else if (state === 'backoff-extend') {
          // re-enter the backoff state to extend it
          backoffMultiplier -= 1
          state = 'backoff' as typeof state
        }
      } else {
        bc.postMessage({ msg: 'I have the lock, please wait!', id })
        // ^^^^ essentially moves any other locks from the acquiring state into
        // the backoff state

        try {
          // lock is acquired, do the operation
          return await fn()
        } finally {
          if (nextId) {
            // someone wanted the lock while we had it, so let's give them a
            // prompt chance to go right after us
            bc.postMessage({ msg: 'Go', id, go: nextId })
            // this message also moves all locks that are not mentioned in `go`
            // into the backoff state immediately, meaning that the `nextId`
            // lock has `LOCK_WAIT` time to notice it's now its turn
          }

          nextId = null
        }
      }
    }

    const timeout: any = new Error(`Acquiring the lock "${name}" timed out!`)
    timeout.isAcquireTimeout = true

    throw timeout
  } finally {
    bc.onmessage = null
    bc.close()
  }
}
