import { broadcastLock, INTERNALS } from '../src/lib/locks'
import { sleep } from '../src/lib/helpers'

const MAX_CONCURRENT_LOCKS_UNDER_TEST = 25

jest.useRealTimers()

function now() {
  const hrTime = process.hrtime()

  return hrTime[0] * 1000000 + hrTime[1] / 1000
}

describe('broadcastLock', () => {
  it(`should run ${MAX_CONCURRENT_LOCKS_UNDER_TEST} concurrent broadcastLocks in order`, async () => {
    const durations = Array.from({ length: MAX_CONCURRENT_LOCKS_UNDER_TEST }, () => [0, 0])

    const start = now()

    const locks = await Promise.all(
      durations.map(async (duration, i) => {
        await broadcastLock('test', -1, async () => {
          duration[0] = now()

          await sleep(50 + 25 * Math.random())

          duration[1] = now() - duration[0]
        })
      })
    )

    // sort by start times
    durations.sort((a, b) => {
      if (a[0] === b[0]) return 0
      if (a[0] < b[0]) return -1
      return 1
    })

    let maxSyncTime = 0
    let minSyncTime = Number.MAX_SAFE_INTEGER

    for (let i = 1; i < durations.length; i += 1) {
      const previous = durations[i - 1]
      const current = durations[i]

      if (previous[0] > current[0]) {
        throw new Error('Not sorted based on start times')
      }

      // current start time - previous end time
      const syncTime = current[0] - (previous[0] + previous[1])

      minSyncTime = Math.min(minSyncTime, syncTime)
      maxSyncTime = Math.max(maxSyncTime, syncTime)
    }

    const firstSyncTime = durations[0][0] - start

    minSyncTime = Math.min(minSyncTime, firstSyncTime)
    maxSyncTime = Math.max(maxSyncTime, firstSyncTime)

    const usefulTime = durations.reduce((a, i) => a + i[1], 0)
    const totalTime =
      durations[durations.length - 1][0] + durations[durations.length - 1][1] - durations[0][0]

    console.log(
      'Concurrency =',
      durations.length,
      'Useful time =',
      (usefulTime / 1000).toFixed(4),
      'Total time =',
      (totalTime / 1000).toFixed(4),
      'Ratio =',
      (totalTime / usefulTime).toFixed(4),
      'Max sync time =',
      (maxSyncTime / 1000).toFixed(4),
      'Min sync time =',
      (minSyncTime / 1000).toFixed(4),
      'First sync time =',
      (firstSyncTime / 1000).toFixed(4)
    )

    if (totalTime - usefulTime <= 0) {
      throw new Error(
        'Assumptions seem broken (useful time always must be < total time). Test is broken?'
      )
    }

    if (firstSyncTime < INTERNALS.LOCK_WAIT * 1000) {
      throw new Error(
        `First sync time must not be quicker than LOCK_WAIT (${INTERNALS.LOCK_WAIT}). Check algorithm!`
      )
    }

    if (minSyncTime <= 10 /* microseconds */) {
      throw new Error(
        `Interleaved ordering, locks were serialized very close one after another ${minSyncTime}! Check algorithm!`
      )
    }

    if (totalTime / usefulTime >= 2) {
      throw new Error(
        `Algorithm is inefficient at ordering a high concurrency of locks, overhead = ${(
          (totalTime / usefulTime - 1) *
          100
        ).toFixed(4)}%`
      )
    }
  })

  it('should fail with a isAcquireTimeout error with acquireTimeout of 0', async () => {
    let acquired = false
    let error: any | null = null

    // first acquire the lock without any acquireTimeout and run it in the background for 100ms
    broadcastLock('test', -1, async () => {
      acquired = true
      await sleep(100)
    })

    await sleep(50) // to make sure the lock got fully acquired

    expect(acquired).toBe(true)

    try {
      await broadcastLock('test', 0, async () => {
        await sleep(50)
      })
    } catch (e: any) {
      error = e
    }

    expect(error).not.toBeNull()
    expect(error.isAcquireTimeout).toBe(true)
  })
})
