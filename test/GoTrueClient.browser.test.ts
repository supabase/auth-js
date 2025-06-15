/**
 * @jest-environment jsdom
 */

import {
    autoRefreshClient,
    getClientWithSpecificStorage,
    pkceClient
} from './lib/clients'
import { mockUserCredentials } from './lib/utils'

// Add structuredClone polyfill for jsdom
if (typeof structuredClone === 'undefined') {
    (global as any).structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
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

        // Mock window.location
        const mockLocation = {
            href: 'http://localhost:9999',
            assign: jest.fn(),
            replace: jest.fn(),
            reload: jest.fn(),
            toString: () => 'http://localhost:9999'
        }
        Object.defineProperty(window, 'location', {
            value: mockLocation,
            writable: true,
        })
    })

    it('should handle broadcast channel messages', async () => {
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

    it('should handle basic OAuth', async () => {
        const { data } = await pkceClient.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: 'http://localhost:9999/callback'
            }
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
                emailRedirectTo: 'http://localhost:9999/callback'
            }
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
}) 
