/**
 * @jest-environment jsdom
 */

import GoTrueClient from '../src/GoTrueClient'
import {
    autoRefreshClient,
    getClientWithSpecificStorage,
} from './lib/clients'

describe('GoTrueClient in browser environment', () => {
    let authClient: GoTrueClient
    let pkceClient: GoTrueClient

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

        authClient = getClientWithSpecificStorage({
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        })
        pkceClient = getClientWithSpecificStorage({
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        })
        window.location.href = 'http://localhost:9999'
    })

    it('should handle visibility change events with autoRefreshClient', async () => {
        Object.defineProperty(document, 'visibilityState', {
            value: 'visible',
            writable: true,
        })

        await autoRefreshClient.startAutoRefresh()

        document.dispatchEvent(new Event('visibilitychange'))

        await autoRefreshClient.stopAutoRefresh()
    })

    it('should handle broadcast channel messages with authClient', async () => {
        const mockPostMessage = jest.fn()
        const mockAddEventListener = jest.fn()
        const mockRemoveEventListener = jest.fn()
        const mockClose = jest.fn()

        const mockBroadcastChannel = jest.fn().mockImplementation(() => ({
            postMessage: mockPostMessage,
            addEventListener: mockAddEventListener,
            removeEventListener: mockRemoveEventListener,
            close: mockClose,
        }))

        Object.defineProperty(window, 'BroadcastChannel', {
            value: mockBroadcastChannel,
            writable: true,
        })

        const newClient = getClientWithSpecificStorage({
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        })

        expect(mockBroadcastChannel).toHaveBeenCalled()
        expect(mockAddEventListener).toHaveBeenCalled()
    })

    it.each([
        {
            name: 'basic OAuth',
            options: {
                redirectTo: 'http://localhost:9999/callback'
            },
            expectedUrl: 'provider=github',
            shouldRedirect: true
        },
        {
            name: 'skip browser redirect',
            options: {
                skipBrowserRedirect: true
            },
            expectedUrl: '',
            shouldRedirect: false
        },
        {
            name: 'with query parameters',
            options: {
                queryParams: { foo: 'bar' }
            },
            expectedUrl: 'foo=bar',
            shouldRedirect: true
        },
        {
            name: 'with scopes',
            options: {
                scopes: 'read:user'
            },
            expectedUrl: 'scopes=read%3Auser',
            shouldRedirect: true
        }
    ])('should handle OAuth with $name', async ({ options, expectedUrl, shouldRedirect }) => {
        const { data } = await pkceClient.signInWithOAuth({
            provider: 'github',
            options
        })

        expect(data?.url).toBeDefined()
        if (shouldRedirect) {
            expect(data?.url).toContain(expectedUrl)
        }
    })

    it('should handle session detection in URL with authClient', async () => {
        window.location.href = 'http://localhost:9999/callback#access_token=test-token&refresh_token=test-refresh-token'

        await authClient.initialize()

        const { data: { session } } = await authClient.getSession()
        expect(session).toBeDefined()
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

    it('should handle broadcast channel message events', async () => {
        const mockMessageHandler = jest.fn()
        const mockBroadcastChannel = jest.fn().mockImplementation(() => ({
            postMessage: jest.fn(),
            addEventListener: (event: string, handler: any) => {
                if (event === 'message') {
                    mockMessageHandler(handler)
                }
            },
            removeEventListener: jest.fn(),
            close: jest.fn(),
        }))

        Object.defineProperty(window, 'BroadcastChannel', {
            value: mockBroadcastChannel,
            writable: true,
        })

        const newClient = getClientWithSpecificStorage({
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        })

        const messageHandler = mockMessageHandler.mock.calls[0][0]
        messageHandler({ data: { event: 'SIGNED_IN', session: null } })
    })

    it('should handle session persistence with different storage types', async () => {
        const localStorageClient = getClientWithSpecificStorage(window.localStorage)
        await localStorageClient.initialize()

        const sessionStorageClient = getClientWithSpecificStorage(window.sessionStorage)
        await sessionStorageClient.initialize()

        const customStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        }
        const customStorageClient = getClientWithSpecificStorage(customStorage)
        await customStorageClient.initialize()
    })

    it('should handle auth state change events', async () => {
        const mockCallback = jest.fn()

        const { data: { subscription } } = authClient.onAuthStateChange(mockCallback)

        await authClient.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: 'http://localhost:9999/callback',
                skipBrowserRedirect: true,
            },
        })

        subscription.unsubscribe()
    })

    it('should handle auto refresh token with different intervals', async () => {
        await autoRefreshClient.startAutoRefresh()

        await autoRefreshClient.stopAutoRefresh()

        const customStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        }
        const customRefreshClient = getClientWithSpecificStorage(customStorage)
        await customRefreshClient.startAutoRefresh()
        await customRefreshClient.stopAutoRefresh()
    })

    it('should handle broadcast channel with different events', async () => {
        const mockMessageHandler = jest.fn()
        const mockBroadcastChannel = jest.fn().mockImplementation(() => ({
            postMessage: jest.fn(),
            addEventListener: (event: string, handler: any) => {
                if (event === 'message') {
                    mockMessageHandler(handler)
                }
            },
            removeEventListener: jest.fn(),
            close: jest.fn(),
        }))

        Object.defineProperty(window, 'BroadcastChannel', {
            value: mockBroadcastChannel,
            writable: true,
        })

        const newClient = getClientWithSpecificStorage({
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        })

        const messageHandler = mockMessageHandler.mock.calls[0][0]
        messageHandler({ data: { event: 'SIGNED_IN', session: null } })
        messageHandler({ data: { event: 'SIGNED_OUT', session: null } })
        messageHandler({ data: { event: 'USER_UPDATED', session: null } })
        messageHandler({ data: { event: 'PASSWORD_RECOVERY', session: null } })
        messageHandler({ data: { event: 'TOKEN_REFRESHED', session: null } })
    })
}) 
