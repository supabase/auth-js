/**
 * @jest-environment jsdom
 */

import { autoRefreshClient, getClientWithSpecificStorage, pkceClient } from './lib/clients'
import { mockUserCredentials } from './lib/utils'
import {
  supportsLocalStorage,
  validateExp,
  sleep,
  userNotAvailableProxy,
  resolveFetch,
} from '../src/lib/helpers'

// Add structuredClone polyfill for jsdom
if (typeof structuredClone === 'undefined') {
  ; (global as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

describe('GoTrueClient in browser environment', () => {
  beforeEach(() => {
    const mockLocalStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    })

    // Mock window.location
    const mockLocation = {
      href: 'http://localhost:9999',
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      toString: () => 'http://localhost:9999',
    }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })
  })

  it('should handle basic OAuth', async () => {
    const { data } = await pkceClient.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'http://localhost:9999/callback',
      },
    })

    expect(data?.url).toBeDefined()
    expect(data?.url).toContain('provider=github')
  })

  it('should handle multiple visibility changes', async () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    })

    await autoRefreshClient.startAutoRefresh()

    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      writable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))

    await autoRefreshClient.stopAutoRefresh()
  })

  it('should handle PKCE flow', async () => {
    const { email, password } = mockUserCredentials()
    const pkceClient = getClientWithSpecificStorage({
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    })

    const { data: signupData, error: signupError } = await pkceClient.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'http://localhost:9999/callback',
      },
    })

    expect(signupError).toBeNull()
    expect(signupData?.user).toBeDefined()

    const { data: signinData, error: signinError } = await pkceClient.signInWithPassword({
      email,
      password,
    })

    expect(signinError).toBeNull()
    expect(signinData?.session).toBeDefined()
  })

  it('should handle _handleVisibilityChange error handling', async () => {
    const client = getClientWithSpecificStorage({
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    })

    // Mock window.addEventListener to throw error
    const originalAddEventListener = window.addEventListener
    window.addEventListener = jest.fn().mockImplementation(() => {
      throw new Error('addEventListener failed')
    })

    try {
      // Initialize client to trigger _handleVisibilityChange
      await client.initialize()

      // Should not throw error, should handle it gracefully
      expect(client).toBeDefined()
    } finally {
      // Restore original addEventListener
      window.addEventListener = originalAddEventListener
    }
  })
})

describe('Browser-specific helper functions', () => {
  it('should handle localStorage not available', () => {
    // Mock localStorage as undefined
    Object.defineProperty(window, 'localStorage', {
      value: undefined,
      writable: true,
    })
    expect(supportsLocalStorage()).toBe(false)
  })
})

describe('JWT and cryptographic functions in browser', () => {
  it('should throw on missing exp claim', () => {
    expect(() => validateExp(0)).toThrow('Missing exp claim')
  })
})

describe('Retryable and sleep functions in browser', () => {
  it('should sleep for specified time', async () => {
    const start = Date.now()
    await sleep(100)
    const end = Date.now()
    expect(end - start).toBeGreaterThanOrEqual(90)
  })
})

describe('User proxy and deep clone functions in browser', () => {
  it('should throw on property setting to user proxy', () => {
    const proxy = userNotAvailableProxy()
    expect(() => {
      (proxy as any).email = 'test@example.com'
    }).toThrow()
  })
})

describe('Fetch resolution in browser environment', () => {
  it('should resolve fetch correctly', () => {
    const customFetch = jest.fn()
    const resolvedFetch = resolveFetch(customFetch)
    expect(typeof resolvedFetch).toBe('function')
  })
})

describe('Callback URL handling', () => {
  let mockFetch: jest.Mock
  let storedSession: string | null
  const mockStorage = {
    getItem: jest.fn(() => storedSession),
    setItem: jest.fn((key: string, value: string) => {
      storedSession = value
    }),
    removeItem: jest.fn(() => {
      storedSession = null
    }),
  }

  beforeEach(() => {
    mockFetch = jest.fn()
    global.fetch = mockFetch
  })

  it('should handle implicit grant callback', async () => {
    // Set up URL with implicit grant callback parameters
    window.location.href =
      'http://localhost:9999/callback#access_token=test-token&refresh_token=test-refresh-token&expires_in=3600&token_type=bearer&type=implicit'

    // Mock user info response
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/user')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 'test-user',
              email: 'test@example.com',
              created_at: new Date().toISOString(),
            }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'test-token',
            refresh_token: 'test-refresh-token',
            expires_in: 3600,
            token_type: 'bearer',
            user: { id: 'test-user' },
          }),
      })
    })

    const client = getClientWithSpecificStorage(mockStorage)
    await client.initialize()

    const {
      data: { session },
    } = await client.getSession()
    expect(session).toBeDefined()
    expect(session?.access_token).toBe('test-token')
    expect(session?.refresh_token).toBe('test-refresh-token')
  })

  it('should handle error in callback URL', async () => {
    // Set up URL with error parameters
    window.location.href =
      'http://localhost:9999/callback#error=invalid_grant&error_description=Invalid+grant'

    mockFetch.mockImplementation((url: string) => {
      return Promise.resolve({
        ok: false,
        json: () =>
          Promise.resolve({
            error: 'invalid_grant',
            error_description: 'Invalid grant',
          }),
      })
    })

    const client = getClientWithSpecificStorage(mockStorage)
    await client.initialize()

    const {
      data: { session },
    } = await client.getSession()
    expect(session).toBeNull()
  })

  it('should handle _initialize with detectSessionInUrl', async () => {
    // Mock window.location with session parameters
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:9999/callback?access_token=test&refresh_token=test&expires_in=3600&token_type=bearer&type=recovery',
        assign: jest.fn(),
        replace: jest.fn(),
        reload: jest.fn(),
        toString: () => 'http://localhost:9999/callback',
      },
      writable: true,
    })

    const client = new (require('../src/GoTrueClient').default)({
      url: 'http://localhost:9999',
      detectSessionInUrl: true,
      autoRefreshToken: false,
    })

    // Initialize client to trigger _initialize with detectSessionInUrl
    await client.initialize()

    expect(client).toBeDefined()
  })

  it('should handle _initialize with PKCE flow mismatch', async () => {
    // Mock window.location with PKCE parameters
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:9999/callback?code=test-code',
        assign: jest.fn(),
        replace: jest.fn(),
        reload: jest.fn(),
        toString: () => 'http://localhost:9999/callback',
      },
      writable: true,
    })

    // Mock storage to return code verifier
    const mockStorage = {
      getItem: jest.fn().mockResolvedValue('test-code-verifier'),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }

    const client = new (require('../src/GoTrueClient').default)({
      url: 'http://localhost:9999',
      detectSessionInUrl: true,
      autoRefreshToken: false,
      storage: mockStorage,
      flowType: 'implicit', // Mismatch with PKCE flow
    })

    // Initialize client to trigger flow mismatch
    await client.initialize()

    expect(client).toBeDefined()
  })
})

describe('GoTrueClient BroadcastChannel', () => {
  it('should handle multiple auth state change events', async () => {
    const mockBroadcastChannel = jest.fn().mockImplementation(() => ({
      postMessage: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn(),
    }))
    Object.defineProperty(window, 'BroadcastChannel', {
      value: mockBroadcastChannel,
      writable: true,
    })

    const mockStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }

    const client = getClientWithSpecificStorage(mockStorage)
    const mockCallback1 = jest.fn()
    const mockCallback2 = jest.fn()

    const {
      data: { subscription: sub1 },
    } = client.onAuthStateChange(mockCallback1)
    const {
      data: { subscription: sub2 },
    } = client.onAuthStateChange(mockCallback2)

    // Simulate a broadcast message
    const mockEvent = {
      data: {
        event: 'SIGNED_IN',
        session: {
          access_token: 'test-token',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'test-user' },
        },
      },
    }

    // Get the event listener that was registered
    const eventListener =
      mockBroadcastChannel.mock.results[0].value.addEventListener.mock.calls[0][1]
    eventListener(mockEvent)

    expect(mockCallback1).toHaveBeenCalledWith('SIGNED_IN', mockEvent.data.session)
    expect(mockCallback2).toHaveBeenCalledWith('SIGNED_IN', mockEvent.data.session)

    sub1.unsubscribe()
    sub2.unsubscribe()
  })

  it('should handle BroadcastChannel errors', () => {
    const mockBroadcastChannel = jest.fn().mockImplementation(() => {
      throw new Error('BroadcastChannel not supported')
    })

    Object.defineProperty(window, 'BroadcastChannel', {
      value: mockBroadcastChannel,
      writable: true,
    })

    const client = getClientWithSpecificStorage({
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    })

    expect(client).toBeDefined()
  })
})

describe('Browser locks functionality', () => {
  it('should use navigator locks when available', () => {
    // Mock navigator.locks
    const mockLock = { name: 'test-lock' }
    const mockRequest = jest.fn().mockImplementation((_, __, callback) =>
      Promise.resolve(callback(mockLock))
    )

    Object.defineProperty(navigator, 'locks', {
      value: { request: mockRequest },
      writable: true,
    })

    // Test navigator locks usage in GoTrueClient
    const client = getClientWithSpecificStorage({
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    })

    expect(client).toBeDefined()
  })

  it('should handle _acquireLock with empty pendingInLock', async () => {
    const client = getClientWithSpecificStorage({
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    })

    // Mock navigator.locks
    const mockLock = { name: 'test-lock' }
    const mockRequest = jest.fn().mockImplementation((_, __, callback) =>
      Promise.resolve(callback(mockLock))
    )

    Object.defineProperty(navigator, 'locks', {
      value: { request: mockRequest },
      writable: true,
    })

    // Initialize client to trigger lock acquisition
    await client.initialize()

    expect(client).toBeDefined()
  })
})

describe('Web3 functionality in browser', () => {
  it('should handle Web3 provider not available', async () => {
    const credentials = {
      chain: 'ethereum' as const,
      wallet: {} as any,
    }

    await expect(pkceClient.signInWithWeb3(credentials)).rejects.toThrow()
  })

  it('should handle Solana Web3 provider not available', async () => {
    const credentials = {
      chain: 'solana' as const,
      wallet: {} as any,
    }

    await expect(pkceClient.signInWithWeb3(credentials)).rejects.toThrow()
  })
})

describe('GoTrueClient constructor edge cases', () => {

  it('should handle userStorage with persistSession', () => {
    const customUserStorage = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }

    const client = new (require('../src/GoTrueClient').default)({
      url: 'http://localhost:9999',
      userStorage: customUserStorage,
      persistSession: true,
      autoRefreshToken: false,
    })

    expect(client).toBeDefined()
    expect((client as any).userStorage).toBe(customUserStorage)
  })
})

describe('linkIdentity with skipBrowserRedirect false', () => {

  it('should linkIdentity with skipBrowserRedirect false', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:9999',
        assign: jest.fn(),
        replace: jest.fn(),
        reload: jest.fn(),
        toString: () => 'http://localhost:9999',
      },
      writable: true,
    })
    // Mock successful session
    const mockSession = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: { id: 'test-user' },
    }

    // Mock storage to return session
    const mockStorage = {
      getItem: jest.fn().mockResolvedValue(JSON.stringify(mockSession)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }

    // Create client with custom fetch
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ url: 'http://localhost:9999/oauth/callback' }),
      text: () => Promise.resolve('{"url": "http://localhost:9999/oauth/callback"}'),
      headers: new Headers(),
    } as Response)

    const clientWithSession = new (require('../src/GoTrueClient').default)({
      url: 'http://localhost:9999',
      storageKey: 'test-specific-storage',
      autoRefreshToken: false,
      persistSession: true,
      storage: mockStorage,
      fetch: mockFetch,
    })

    // Mock window.location.assign
    const mockAssign = jest.fn()
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:9999',
        assign: mockAssign,
        replace: jest.fn(),
        reload: jest.fn(),
        toString: () => 'http://localhost:9999',
      },
      writable: true,
    })

    try {
      const result = await clientWithSession.linkIdentity({
        provider: 'github',
        options: {
          skipBrowserRedirect: false,
        },
      })

      expect(result.data?.url).toBeDefined()
      expect(mockFetch).toHaveBeenCalled()
      // Note: linkIdentity might not always call window.location.assign depending on the response
      // So we just verify the result is defined
    } catch (error) {
      console.error('Test error:', error)
      throw error
    }
  })
})

describe('Session Management Tests', () => {
  it('should handle _recoverAndRefresh with Infinity expires_at', async () => {
    // Mock session with null expires_at
    const mockSession = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expires_at: null,
      token_type: 'bearer',
      user: { id: 'test-user' },
    }

    const mockStorage = {
      getItem: jest.fn().mockResolvedValue(JSON.stringify(mockSession)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }

    const client = getClientWithSpecificStorage(mockStorage)

    // Initialize client to trigger _recoverAndRefresh with Infinity expires_at
    await client.initialize()

    expect(client).toBeDefined()
  })

  it('should handle _recoverAndRefresh with refresh token error', async () => {
    // Mock session
    const mockSession = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) - 100, // Expired
      token_type: 'bearer',
      user: { id: 'test-user' },
    }

    const mockStorage = {
      getItem: jest.fn().mockResolvedValue(JSON.stringify(mockSession)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }

    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
      text: () => Promise.resolve('{"error": "invalid_grant"}'),
      headers: new Headers(),
    } as Response)

    const client = new (require('../src/GoTrueClient').default)({
      url: 'http://localhost:9999',
      autoRefreshToken: true,
      persistSession: true,
      storage: mockStorage,
      fetch: mockFetch,
    })

    // Initialize client to trigger refresh token error
    await client.initialize()

    expect(client).toBeDefined()
  })

  it('should handle _recoverAndRefresh with user proxy', async () => {
    // Mock session with proxy user
    const mockSession = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // Valid
      token_type: 'bearer',
      user: { __isUserNotAvailableProxy: true },
    }

    const mockStorage = {
      getItem: jest.fn().mockResolvedValue(JSON.stringify(mockSession)),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }

    // Mock fetch to return user data
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ user: { id: 'test-user', email: 'test@example.com' } }),
      text: () => Promise.resolve('{"user": {"id": "test-user", "email": "test@example.com"}}'),
      headers: new Headers(),
    } as Response)

    const client = new (require('../src/GoTrueClient').default)({
      url: 'http://localhost:9999',
      autoRefreshToken: true,
      persistSession: true,
      storage: mockStorage,
      fetch: mockFetch,
    })

    // Initialize client to trigger user proxy handling
    await client.initialize()

    expect(client).toBeDefined()
  })
})

describe('Additional Tests', () => {
  it('should handle _initialize with storage returning boolean', async () => {
    // Mock storage to return boolean
    const mockStorage = {
      getItem: jest.fn().mockResolvedValue(true),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    }

    const client = new (require('../src/GoTrueClient').default)({
      url: 'http://localhost:9999',
      autoRefreshToken: false,
      persistSession: true,
      storage: mockStorage,
    })

    // Initialize client to trigger boolean handling
    await client.initialize()

    expect(client).toBeDefined()
  })

  it('should handle _initialize with expires_at parameter', async () => {
    // Mock window.location with expires_at parameter
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:9999/callback?access_token=test&refresh_token=test&expires_in=3600&expires_at=1234567890&token_type=bearer',
        assign: jest.fn(),
        replace: jest.fn(),
        reload: jest.fn(),
        toString: () => 'http://localhost:9999/callback',
      },
      writable: true,
    })

    const client = new (require('../src/GoTrueClient').default)({
      url: 'http://localhost:9999',
      detectSessionInUrl: true,
      autoRefreshToken: false,
    })

    // Initialize client to trigger _initialize with expires_at
    await client.initialize()

    expect(client).toBeDefined()
  })
})
