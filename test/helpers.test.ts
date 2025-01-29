import { User } from '../src/lib/types'
import {
  parseParametersFromURL,
  parseResponseAPIVersion,
  userNotAvailableProxy,
  uuid,
} from '../src/lib/helpers'

describe('parseParametersFromURL', () => {
  it('should parse parameters from a URL with query params only', () => {
    const url = new URL('https://supabase.com')
    url.searchParams.set('a', 'b')
    url.searchParams.set('b', 'c')

    const result = parseParametersFromURL(url.href)
    expect(result).toMatchObject({
      a: 'b',
      b: 'c',
    })
  })

  it('should parse parameters from a URL with fragment params only', () => {
    const url = new URL('https://supabase.com')
    const fragmentParams = new URLSearchParams({ a: 'b', b: 'c' })
    url.hash = fragmentParams.toString()

    const result = parseParametersFromURL(url.href)
    expect(result).toMatchObject({
      a: 'b',
      b: 'c',
    })
  })

  it('should parse parameters from a URL with both query params and fragment params', () => {
    const url = new URL('https://supabase.com')
    url.searchParams.set('a', 'b')
    url.searchParams.set('b', 'c')
    url.searchParams.set('x', 'z')

    const fragmentParams = new URLSearchParams({ d: 'e', x: 'y' })
    url.hash = fragmentParams.toString()

    const result = parseParametersFromURL(url.href)
    expect(result).toMatchObject({
      a: 'b',
      b: 'c',
      d: 'e',
      x: 'z', // search params take precedence
    })
  })
})

describe('parseResponseAPIVersion', () => {
  it('should parse valid dates', () => {
    expect(
      parseResponseAPIVersion({
        headers: {
          get: () => {
            return '2024-01-01'
          },
        },
      } as any)
    ).toEqual(new Date('2024-01-01T00:00:00.0Z'))
  })

  it('should return null on invalid dates', () => {
    ;['2024-01-32', '', 'notadate', 'Sat Feb 24 2024 17:59:17 GMT+0100'].forEach((example) => {
      expect(
        parseResponseAPIVersion({
          headers: {
            get: () => {
              return example
            },
          },
        } as any)
      ).toBeNull()
    })
  })
})

describe('uuid', () => {
  if ('crypto' in globalThis) {
    // nodejs 18, 20 don't have crypto

    it('should generate a uuid when crypto.randomUUID() throws an error', () => {
      const originalRandomUUID = crypto.randomUUID

      try {
        crypto.randomUUID = () => {
          throw new Error('Fail for test')
        }

        expect(typeof uuid()).toEqual('string')
      } finally {
        crypto.randomUUID = originalRandomUUID
      }
    })

    it('should generate a uuid with crypto.randomUUID()', () => {
      const originalRandomUUID = crypto.randomUUID

      try {
        crypto.randomUUID = () => {
          return 'random-uuid'
        }

        expect(uuid()).toEqual('random-uuid')
      } finally {
        crypto.randomUUID = originalRandomUUID
      }
    })
  }

  it('should generate a uuid', () => {
    expect(typeof uuid()).toEqual('string')
  })
})

describe('userNotAvailableProxy', () => {
  it('should show a warning when calling toString()', () => {
    expect(`${userNotAvailableProxy({} as User, 'REASON-0')}`).toMatchInlineSnapshot(
      `"WARNING: @supabase/auth-js: Accessing any property of this object is insecure. Reason: REASON-0 -- [object Object]"`
    )
  })

  it('should show a warning when calling toString()', () => {
    const originalWarn = console.warn

    try {
      let numberOfWarnings = 0
      console.warn = (...args: any[]) => {
        expect(args).toMatchInlineSnapshot(`
          Array [
            "@supabase/auth-js: Accessing the \\"id\\" (or any other) property of the user object is not secure. Reason: REASON-1",
          ]
        `)
        numberOfWarnings += 1
      }

      const object = userNotAvailableProxy(
        {
          id: 'user-id',
          created_at: new Date(0).toISOString(),
          aud: 'audience',
          app_metadata: {},
          user_metadata: {},
        },
        'REASON-1'
      )

      expect(`${object}`).toMatchInlineSnapshot(
        `"WARNING: @supabase/auth-js: Accessing any property of this object is insecure. Reason: REASON-1 -- [object Object]"`
      )

      expect(object.id).toMatchInlineSnapshot(`"user-id"`)
      expect(object.created_at).toMatchInlineSnapshot(`"1970-01-01T00:00:00.000Z"`)
      expect(object.aud).toMatchInlineSnapshot(`"audience"`)
      expect(object.app_metadata).toMatchInlineSnapshot(`
        Object {
          Symbol(WARNING): "@supabase/auth-js: Accessing any property of this object is insecure. Reason: REASON-1",
        }
      `)
      expect(object.user_metadata).toMatchInlineSnapshot(`
        Object {
          Symbol(WARNING): "@supabase/auth-js: Accessing any property of this object is insecure. Reason: REASON-1",
        }
      `)
      expect(object.email).toMatchInlineSnapshot(`undefined`)

      expect(numberOfWarnings).toEqual(1)
    } finally {
      console.warn = originalWarn
    }
  })
})
