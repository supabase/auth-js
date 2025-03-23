import { LockFunc } from './types'

export class LockClient {
  private pendingInLock: Promise<any>[] = []
  constructor(
    private lock: LockFunc,
    private storageKey: string = '',
    private _debug: (...args: any[]) => void
  ) {}

  /**
   * status of the lock
   */
  public lockAcquired = false

  /**
   * Acquires a global lock based on the storage key.
   */
  public async acquireLock<R>(acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
    this._debug('#_acquireLock', 'begin', acquireTimeout)

    try {
      if (this.lockAcquired) return this._handleExistingLock(fn)
      return this._handleNewLock(acquireTimeout, fn)
    } finally {
      this._debug('#_acquireLock', 'end')
    }
  }

  private async _handleExistingLock<R>(fn: () => Promise<R>): Promise<R> {
    const lastPending = this.pendingInLock[this.pendingInLock.length - 1] || Promise.resolve()
    await lastPending
    return await fn()
  }

  private async _handleNewLock<R>(acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
    return this.lock(`lock:${this.storageKey}`, acquireTimeout, async () => {
      this._debug('#_acquireLock', 'lock acquired for storage key', this.storageKey)

      try {
        this.lockAcquired = true
        const result = fn()

        // make sure fn is the last for this batch
        this.pendingInLock.push(result)
        await this._drainPendingQueue()

        // result have already completed, just unwrap the promise now.
        return await result
      } finally {
        this._debug('#_acquireLock', 'lock released for storage key', this.storageKey)
        this.lockAcquired = false
      }
    })
  }

  private async _drainPendingQueue(): Promise<void> {
    while (this.pendingInLock.length) {
      const batch = [...this.pendingInLock]
      // guaranteed that promise will be completed with either resolved or rejected
      await Promise.allSettled(batch)
      this.pendingInLock.splice(0, batch.length)
    }
  }
}
