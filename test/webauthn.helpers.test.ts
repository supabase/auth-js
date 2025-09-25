import {
  deserializeCredentialCreationOptions,
  deserializeCredentialRequestOptions, mergeCredentialCreationOptions,
  mergeCredentialRequestOptions, serializeCredentialCreationResponse,
  serializeCredentialRequestResponse
} from '../src/lib/webauthn'
import type {
  AuthenticationCredential,
  AuthenticatorTransportFuture, PublicKeyCredentialCreationOptionsFuture,
  PublicKeyCredentialRequestOptionsFuture, RegistrationCredential
} from '../src/lib/webauthn.dom'

describe('WebAuthn Serialization/Deserialization', () => {
  let originalPublicKeyCredential: any

  beforeEach(() => {
    originalPublicKeyCredential = (global as any).PublicKeyCredential
  })

  afterEach(() => {
    ;(global as any).PublicKeyCredential = originalPublicKeyCredential
  })

  describe('deserializeCredentialCreationOptions', () => {
    const validServerOptions = {
      challenge: 'dGVzdC1jaGFsbGVuZ2U', // "test-challenge" in base64url
      rp: {
        name: 'Test RP',
        id: 'example.com',
      },
      user: {
        id: 'dXNlci1pZA', // "user-id" in base64url
        name: 'test@example.com',
        displayName: 'Test User',
      },
      pubKeyCredParams: [
        { type: 'public-key' as const, alg: -7 },
        { type: 'public-key' as const, alg: -257 },
      ],
      timeout: 60000,
      attestation: 'direct' as const,
      excludeCredentials: [
        {
          id: 'Y3JlZC1pZA', // "cred-id" in base64url
          type: 'public-key' as const,
          transports: ['usb', 'nfc'] as AuthenticatorTransportFuture[],
        },
      ],
    }

    it('should convert base64url strings to ArrayBuffers using polyfill', () => {
      // Force polyfill path by removing PublicKeyCredential
      delete (global as any).PublicKeyCredential

      const result = deserializeCredentialCreationOptions(validServerOptions)

      // Verify challenge was converted to ArrayBuffer
      expect(result.challenge).toBeInstanceOf(ArrayBuffer)
      const challengeBytes = new Uint8Array(result.challenge)
      expect(challengeBytes).toEqual(
        new Uint8Array([116, 101, 115, 116, 45, 99, 104, 97, 108, 108, 101, 110, 103, 101])
      )

      // Verify user.id was converted to ArrayBuffer
      expect(result.user.id).toBeInstanceOf(ArrayBuffer)
      const userIdBytes = new Uint8Array(result.user.id)
      expect(userIdBytes).toEqual(new Uint8Array([117, 115, 101, 114, 45, 105, 100]))

      // Verify excludeCredentials[0].id was converted to ArrayBuffer
      expect(result.excludeCredentials![0].id).toBeInstanceOf(ArrayBuffer)
      const credIdBytes = new Uint8Array(result.excludeCredentials![0].id as ArrayBuffer)
      expect(credIdBytes).toEqual(new Uint8Array([99, 114, 101, 100, 45, 105, 100]))

      // Verify other fields are preserved
      expect(result.rp).toEqual(validServerOptions.rp)
      expect(result.pubKeyCredParams).toEqual(validServerOptions.pubKeyCredParams)
      expect(result.timeout).toBe(60000)
      expect(result.attestation).toBe('direct')
    })

    it('should use native parseCreationOptionsFromJSON when available', () => {
      const mockParseCreationOptions = jest.fn().mockReturnValue({
        challenge: new ArrayBuffer(8),
        rp: validServerOptions.rp,
        user: { ...validServerOptions.user, id: new ArrayBuffer(8) },
        pubKeyCredParams: validServerOptions.pubKeyCredParams,
      })

      ;(global as any).PublicKeyCredential = {
        parseCreationOptionsFromJSON: mockParseCreationOptions,
      }

      const result = deserializeCredentialCreationOptions(validServerOptions)

      expect(mockParseCreationOptions).toHaveBeenCalledWith(validServerOptions)
      expect(result.challenge).toBeInstanceOf(ArrayBuffer)
      expect(result.user.id).toBeInstanceOf(ArrayBuffer)
    })

    it('should handle missing optional fields correctly', () => {
      const minimalOptions = {
        challenge: 'dGVzdC1jaGFsbGVuZ2U',
        rp: { name: 'Test RP' },
        user: {
          id: 'dXNlci1pZA',
          name: 'test@example.com',
          displayName: 'Test User',
        },
        pubKeyCredParams: [{ type: 'public-key' as const, alg: -7 }],
      }

      delete (global as any).PublicKeyCredential

      const result = deserializeCredentialCreationOptions(minimalOptions)

      expect(result.excludeCredentials).toBeUndefined()
      expect(result.attestation).toBeUndefined()
      expect(result.timeout).toBeUndefined()
    })

    it('should throw on null/undefined options', () => {
      expect(() => deserializeCredentialCreationOptions(null as any)).toThrow(
        'Credential creation options are required'
      )
      expect(() => deserializeCredentialCreationOptions(undefined as any)).toThrow(
        'Credential creation options are required'
      )
    })
  })

  describe('deserializeCredentialRequestOptions', () => {
    const validServerOptions = {
      challenge: 'dGVzdC1jaGFsbGVuZ2U',
      timeout: 60000,
      rpId: 'example.com',
      userVerification: 'preferred' as const,
      allowCredentials: [
        {
          id: 'Y3JlZC1pZA',
          type: 'public-key' as const,
          transports: ['usb', 'nfc'] as AuthenticatorTransportFuture[],
        },
      ],
    }

    it('should convert base64url strings to ArrayBuffers using polyfill', () => {
      delete (global as any).PublicKeyCredential

      const result = deserializeCredentialRequestOptions(validServerOptions)

      // Verify challenge was converted
      expect(result.challenge).toBeInstanceOf(ArrayBuffer)
      const challengeBytes = new Uint8Array(result.challenge)
      expect(challengeBytes).toEqual(
        new Uint8Array([116, 101, 115, 116, 45, 99, 104, 97, 108, 108, 101, 110, 103, 101])
      )

      // Verify allowCredentials[0].id was converted
      expect(result.allowCredentials![0].id).toBeInstanceOf(ArrayBuffer)
      const credIdBytes = new Uint8Array(result.allowCredentials![0].id as ArrayBuffer)
      expect(credIdBytes).toEqual(new Uint8Array([99, 114, 101, 100, 45, 105, 100]))

      // Verify other fields preserved
      expect(result.rpId).toBe('example.com')
      expect(result.userVerification).toBe('preferred')
      expect(result.timeout).toBe(60000)
    })

    it('should use native parseRequestOptionsFromJSON when available', () => {
      const mockParseRequestOptions = jest.fn().mockReturnValue({
        challenge: new ArrayBuffer(8),
        rpId: 'example.com',
        allowCredentials: [{ id: new ArrayBuffer(8), type: 'public-key', transports: ['usb'] }],
      })

      ;(global as any).PublicKeyCredential = {
        parseRequestOptionsFromJSON: mockParseRequestOptions,
      }

      const result = deserializeCredentialRequestOptions(validServerOptions)

      expect(mockParseRequestOptions).toHaveBeenCalledWith(validServerOptions)
      expect(result.challenge).toBeInstanceOf(ArrayBuffer)
    })

    it('should handle empty allowCredentials array', () => {
      delete (global as any).PublicKeyCredential

      const optionsWithEmptyArray = {
        ...validServerOptions,
        allowCredentials: [],
      }

      const result = deserializeCredentialRequestOptions(optionsWithEmptyArray)
      // Empty array is not added to result per implementation
      expect(result.allowCredentials).toBeUndefined()
    })

    it('should handle missing allowCredentials', () => {
      delete (global as any).PublicKeyCredential

      const optionsWithoutAllow = {
        challenge: 'dGVzdC1jaGFsbGVuZ2U',
        rpId: 'example.com',
      }

      const result = deserializeCredentialRequestOptions(optionsWithoutAllow)
      expect(result.allowCredentials).toBeUndefined()
    })
  })

  describe('serializeCredentialCreationResponse', () => {
    it('should convert ArrayBuffers to base64url strings using polyfill', () => {
      const attestationBytes = new Uint8Array([1, 2, 3, 4, 5])
      const clientDataBytes = new Uint8Array([6, 7, 8, 9, 10])
      const credIdBytes = new Uint8Array([11, 12, 13, 14, 15])

      const mockCredential: RegistrationCredential = {
        id: 'credential-id-string',
        rawId: credIdBytes.buffer,
        response: {
          attestationObject: attestationBytes.buffer,
          clientDataJSON: clientDataBytes.buffer,
          getPublicKey: jest.fn().mockReturnValue(null),
          getPublicKeyAlgorithm: jest.fn().mockReturnValue(-7),
          getTransports: jest.fn().mockReturnValue(['usb']),
          getAuthenticatorData: jest.fn().mockReturnValue(new ArrayBuffer(0)),
        },
        type: 'public-key',
        getClientExtensionResults: jest.fn().mockReturnValue({ credProps: { rk: true } }),
        authenticatorAttachment: 'platform' as AuthenticatorAttachment,
      } as unknown as RegistrationCredential

      const result = serializeCredentialCreationResponse(mockCredential)

      // Verify ArrayBuffers were converted to base64url
      expect(result.rawId).toBe(mockCredential.id) // Now correctly converts rawId ArrayBuffer to base64url
      expect(result.response.attestationObject).toBe('AQIDBAU')
      expect(result.response.clientDataJSON).toBe('BgcICQo')
      expect(result.authenticatorAttachment).toBe('platform')
      expect(result.clientExtensionResults).toEqual({ credProps: { rk: true } })
    })

    it('should use native toJSON when available', () => {
      const mockToJSON = jest.fn().mockReturnValue({
        id: 'test-id',
        rawId: 'dGVzdC1yYXdJZA',
        response: {
          attestationObject: 'YXR0ZXN0',
          clientDataJSON: 'Y2xpZW50',
        },
        type: 'public-key',
        authenticatorAttachment: 'cross-platform',
        clientExtensionResults: {},
      })

      const mockCredential = {
        id: 'test-id',
        rawId: new ArrayBuffer(8),
        response: {
          toJSON: mockToJSON,
          attestationObject: new ArrayBuffer(8),
          clientDataJSON: new ArrayBuffer(8),
        },
        type: 'public-key',
        toJSON: mockToJSON,
        getClientExtensionResults: jest.fn().mockReturnValue({}),
      } as unknown as RegistrationCredential

      const result = serializeCredentialCreationResponse(mockCredential)

      expect(mockToJSON).toHaveBeenCalled()
      expect(result.id).toBe('test-id')
      expect(result.rawId).toBe('dGVzdC1yYXdJZA')
    })

    it('should handle null authenticatorAttachment correctly', () => {
      const mockCredential = {
        id: 'test-id',
        rawId: new Uint8Array([1, 2, 3]).buffer,
        response: {
          attestationObject: new ArrayBuffer(0),
          clientDataJSON: new ArrayBuffer(0),
          getPublicKey: jest.fn(),
          getPublicKeyAlgorithm: jest.fn(),
          getTransports: jest.fn(),
          getAuthenticatorData: jest.fn(),
        },
        type: 'public-key',
        authenticatorAttachment: null,
        getClientExtensionResults: jest.fn().mockReturnValue({}),
      } as unknown as RegistrationCredential

      const result = serializeCredentialCreationResponse(mockCredential)
      expect(result.authenticatorAttachment).toBeUndefined()
    })
  })

  describe('serializeCredentialRequestResponse', () => {
    it('should convert ArrayBuffers to base64url strings using polyfill', () => {
      const authDataBytes = new Uint8Array([1, 2, 3, 4, 5])
      const clientDataBytes = new Uint8Array([6, 7, 8, 9, 10])
      const signatureBytes = new Uint8Array([11, 12, 13, 14, 15])
      const userHandleBytes = new Uint8Array([16, 17, 18, 19, 20])
      const credIdBytes = new Uint8Array([21, 22, 23, 24, 25])

      const mockCredential: AuthenticationCredential = {
        id: 'credential-id-string',
        rawId: credIdBytes.buffer,
        response: {
          authenticatorData: authDataBytes.buffer,
          clientDataJSON: clientDataBytes.buffer,
          signature: signatureBytes.buffer,
          userHandle: userHandleBytes.buffer,
        },
        type: 'public-key',
        getClientExtensionResults: jest.fn().mockReturnValue({}),
        authenticatorAttachment: 'cross-platform' as AuthenticatorAttachment,
      } as unknown as AuthenticationCredential

      const result = serializeCredentialRequestResponse(mockCredential)

      // Verify conversions
      expect(result.rawId).toBe(mockCredential.id) // Now correctly converts rawId ArrayBuffer to base64url
      expect(result.response.authenticatorData).toBe('AQIDBAU')
      expect(result.response.clientDataJSON).toBe('BgcICQo')
      expect(result.response.signature).toBe('CwwNDg8')
      expect(result.response.userHandle).toBe('EBESExQ')
    })

    it('should handle null userHandle correctly', () => {
      const mockCredential = {
        id: 'test-id',
        rawId: new Uint8Array([1, 2, 3]).buffer,
        response: {
          authenticatorData: new ArrayBuffer(0),
          clientDataJSON: new ArrayBuffer(0),
          signature: new ArrayBuffer(0),
          userHandle: null,
        },
        type: 'public-key',
        getClientExtensionResults: jest.fn().mockReturnValue({}),
      } as unknown as AuthenticationCredential

      const result = serializeCredentialRequestResponse(mockCredential)
      expect(result.response.userHandle).toBeUndefined()
    })

    it('should use native toJSON when available', () => {
      const mockToJSON = jest.fn().mockReturnValue({
        id: 'test-id',
        rawId: 'dGVzdC1yYXdJZA',
        response: {
          authenticatorData: 'YXV0aERhdGE',
          clientDataJSON: 'Y2xpZW50',
          signature: 'c2lnbmF0dXJl',
          userHandle: 'dXNlckhhbmRsZQ',
        },
        type: 'public-key',
        authenticatorAttachment: 'platform',
        clientExtensionResults: {},
      })

      const mockCredential = {
        id: 'test-id',
        rawId: new ArrayBuffer(8),
        response: {
          toJSON: mockToJSON,
          authenticatorData: new ArrayBuffer(8),
          clientDataJSON: new ArrayBuffer(8),
          signature: new ArrayBuffer(8),
          userHandle: new ArrayBuffer(8),
        },
        type: 'public-key',
        toJSON: mockToJSON,
        getClientExtensionResults: jest.fn().mockReturnValue({}),
      } as unknown as AuthenticationCredential

      const result = serializeCredentialRequestResponse(mockCredential)

      expect(mockToJSON).toHaveBeenCalled()
      expect(result.response.authenticatorData).toBe('YXV0aERhdGE')
      expect(result.response.signature).toBe('c2lnbmF0dXJl')
    })
  })

  describe('mergeCredentialCreationOptions', () => {
    const baseOptions: PublicKeyCredentialCreationOptionsFuture = {
      challenge: new Uint8Array([1, 2, 3, 4]).buffer,
      rp: { name: 'Test RP', id: 'example.com' },
      user: {
        id: new Uint8Array([5, 6, 7, 8]).buffer,
        name: 'user@example.com',
        displayName: 'Test User',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
    }

    it('should apply DEFAULT_CREATION_OPTIONS correctly', () => {
      const result = mergeCredentialCreationOptions(baseOptions)

      // Verify defaults are applied
      expect(result.authenticatorSelection).toEqual({
        authenticatorAttachment: 'cross-platform',
        requireResidentKey: false,
        userVerification: 'preferred',
        residentKey: 'discouraged',
      })
      expect(result.hints).toEqual(['security-key'])
      expect(result.attestation).toBe('direct')

      // Verify base options are preserved
      expect(result.challenge).toBe(baseOptions.challenge)
      expect(result.rp).toEqual(baseOptions.rp)
      expect(result.user).toEqual(baseOptions.user)
    })

    it('should deep merge authenticatorSelection correctly', () => {
      const result = mergeCredentialCreationOptions(baseOptions, {
        authenticatorSelection: {
          userVerification: 'required',
        },
      })

      // Should merge, not replace
      expect(result.authenticatorSelection).toEqual({
        authenticatorAttachment: 'cross-platform',
        requireResidentKey: false,
        residentKey: 'discouraged',
        userVerification: 'required', // Override applied
      })
    })

    it('should allow complete override of nested objects', () => {
      const result = mergeCredentialCreationOptions(baseOptions, {
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: true,
          residentKey: 'required',
          userVerification: 'discouraged',
        },
        attestation: 'none',
        hints: ['client-device'],
      })

      expect(result.authenticatorSelection).toEqual({
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        residentKey: 'required',
        userVerification: 'discouraged',
      })
      expect(result.attestation).toBe('none')
      expect(result.hints).toEqual(['client-device'])
    })

    it('should not modify ArrayBuffer fields during merge', () => {
      const customChallenge = new Uint8Array([9, 10, 11, 12]).buffer
      const result = mergeCredentialCreationOptions(baseOptions, {
        challenge: customChallenge,
      })

      expect(result.challenge).toBe(customChallenge)
      expect(result.challenge).not.toBe(baseOptions.challenge)
    })
  })

  describe('mergeCredentialRequestOptions', () => {
    const baseOptions: PublicKeyCredentialRequestOptionsFuture = {
      challenge: new Uint8Array([1, 2, 3, 4]).buffer,
      rpId: 'example.com',
      allowCredentials: [
        {
          id: new Uint8Array([5, 6, 7, 8]).buffer,
          type: 'public-key',
          transports: ['usb'],
        },
      ],
    }

    it('should apply DEFAULT_REQUEST_OPTIONS correctly', () => {
      const result = mergeCredentialRequestOptions(baseOptions)

      expect(result.userVerification).toBe('preferred')
      expect(result.hints).toEqual(['security-key'])

      // Base options preserved
      expect(result.challenge).toBe(baseOptions.challenge)
      expect(result.allowCredentials).toBe(baseOptions.allowCredentials)
    })

    it('should allow overriding defaults', () => {
      const result = mergeCredentialRequestOptions(baseOptions, {
        userVerification: 'required',
        hints: ['hybrid', 'security-key'],
        timeout: 120000,
      })

      expect(result.userVerification).toBe('required')
      expect(result.hints).toEqual(['hybrid', 'security-key'])
      expect(result.timeout).toBe(120000)
    })

    it('should preserve allowCredentials ArrayBuffers', () => {
      const newCreds = [
        {
          id: new Uint8Array([9, 10, 11, 12]).buffer,
          type: 'public-key' as const,
          transports: ['nfc'] as AuthenticatorTransportFuture[],
        },
      ]

      const result = mergeCredentialRequestOptions(baseOptions, {
        allowCredentials: newCreds,
      })

      expect(result.allowCredentials).toBe(newCreds)
      expect(result.allowCredentials![0].id).toBeInstanceOf(ArrayBuffer)
    })
  })
})
