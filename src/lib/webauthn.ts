import GoTrueClient from '../GoTrueClient'
import { base64UrlToUint8Array, bytesToBase64URL } from './base64url'
import { AuthError, AuthUnknownError, isAuthError } from './errors'
import {
  AuthMFAEnrollWebAuthnResponse,
  AuthMFAVerifyResponse,
  BaseMFAChallengeParams,
  MFAChallengeWebAuthnParams,
  MFAEnrollWebAuthnParams,
  MFAVerifyResponse,
  WebAuthnMFAVerifyParams,
} from './types'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorAttachment,
  PublicKeyCredentialHint,
} from './webauthn.dom'

import {
  WebAuthnError,
  isWebAuthnError,
  identifyRegistrationError,
  identifyAuthenticationError,
} from './webauthn.errors'

export { WebAuthnError, isWebAuthnError, identifyRegistrationError, identifyAuthenticationError }

/**
 * WebAuthn abort service to manage ceremony cancellation
 */
export class WebAuthnAbortService {
  private controller: AbortController | undefined

  /**
   * Create an abort signal for a new WebAuthn operation.
   * Automatically cancels any existing operation.
   */
  createNewAbortSignal(): AbortSignal {
    // Abort any existing calls to navigator.credentials.create() or navigator.credentials.get()
    if (this.controller) {
      const abortError = new Error('Cancelling existing WebAuthn API call for new one')
      abortError.name = 'AbortError'
      this.controller.abort(abortError)
    }

    const newController = new AbortController()
    this.controller = newController
    return newController.signal
  }

  /**
   * Manually cancel the current WebAuthn operation
   */
  cancelCeremony(): void {
    if (this.controller) {
      const abortError = new Error('Manually cancelling existing WebAuthn API call')
      abortError.name = 'AbortError'
      this.controller.abort(abortError)
      this.controller = undefined
    }
  }
}

/**
 * Singleton instance to ensure only one WebAuthn ceremony is active at a time.
 * This prevents "operation already in progress" errors when retrying WebAuthn operations.
 */
export const webAuthnAbortService = new WebAuthnAbortService()

/**
 * Server response format for WebAuthn credential creation options
 * Uses SimpleWebAuthn's JSON format with base64url-encoded binary fields
 */
export type ServerCredentialCreationOptions = PublicKeyCredentialCreationOptionsJSON

/**
 * Server response format for WebAuthn credential request options
 * Uses SimpleWebAuthn's JSON format with base64url-encoded binary fields
 */
export type ServerCredentialRequestOptions = PublicKeyCredentialRequestOptionsJSON

/**
 * Convert base64url encoded strings in WebAuthn credential creation options to ArrayBuffers
 * as required by the WebAuthn browser API
 */
export function prepareCredentialCreationOptionsForBrowser(
  options: ServerCredentialCreationOptions
): PublicKeyCredentialCreationOptions {
  if (!options) {
    throw new Error('Credential creation options are required')
  }

  // Destructure to separate fields that need transformation
  const { challenge: challengeStr, user: userOpts, excludeCredentials, ...restOptions } = options

  // Convert challenge from base64url to ArrayBuffer
  const challenge = base64UrlToUint8Array(challengeStr).buffer as ArrayBuffer

  // Convert user.id from base64url to ArrayBuffer
  const user: PublicKeyCredentialUserEntity = {
    ...userOpts,
    id: base64UrlToUint8Array(userOpts.id).buffer as ArrayBuffer,
  }

  // Build the result object
  const result: PublicKeyCredentialCreationOptions = {
    ...restOptions,
    challenge,
    user,
  }

  // Only add excludeCredentials if it exists
  if (excludeCredentials) {
    result.excludeCredentials = excludeCredentials.map((cred) => ({
      ...cred,
      id: base64UrlToUint8Array(cred.id).buffer as ArrayBuffer,
      type: cred.type || ('public-key' as PublicKeyCredentialType),
      // Cast transports to handle future transport types like "cable"
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    }))
  }

  return result
}

/**
 * Convert base64url encoded strings in WebAuthn credential request options to ArrayBuffers
 * as required by the WebAuthn browser API
 */
export function prepareCredentialRequestOptionsForBrowser(
  options: ServerCredentialRequestOptions
): PublicKeyCredentialRequestOptions {
  if (!options) {
    throw new Error('Credential request options are required')
  }

  // Destructure to separate fields that need transformation
  const { challenge: challengeStr, allowCredentials, ...restOptions } = options

  // Convert challenge from base64url to ArrayBuffer
  const challenge = base64UrlToUint8Array(challengeStr).buffer as ArrayBuffer

  // Build the result object
  const result: PublicKeyCredentialRequestOptions = {
    ...restOptions,
    challenge,
  }

  // Only add allowCredentials if it exists
  if (allowCredentials) {
    result.allowCredentials = allowCredentials.map((cred) => ({
      ...cred,
      id: base64UrlToUint8Array(cred.id).buffer as ArrayBuffer,
      type: cred.type || ('public-key' as PublicKeyCredentialType),
      // Cast transports to handle future transport types like "cable"
      transports: cred.transports as AuthenticatorTransport[] | undefined,
    }))
  }

  return result
}

/**
 * Server format for credential response with base64url-encoded binary fields
 * Can be either a registration or authentication response
 */
export type ServerCredentialResponse = RegistrationResponseJSON | AuthenticationResponseJSON

// Re-export the JSON types for use in other files
export type { RegistrationResponseJSON, AuthenticationResponseJSON }

/**
 * Convert a registration/enrollment credential response to server format
 */
export function prepareRegistrationResponseForServer(
  credential: PublicKeyCredential & { response: AuthenticatorAttestationResponse }
): RegistrationResponseJSON {
  // Access authenticatorAttachment via type assertion to handle TypeScript version differences
  // @simplewebauthn/types includes this property but base TypeScript 4.7.4 doesn't
  const credentialWithAttachment = credential as PublicKeyCredential & {
    response: AuthenticatorAttestationResponse
    authenticatorAttachment?: string | null
  }

  return {
    id: credential.id,
    rawId: credential.id,
    response: {
      attestationObject: bytesToBase64URL(new Uint8Array(credential.response.attestationObject)),
      clientDataJSON: bytesToBase64URL(new Uint8Array(credential.response.clientDataJSON)),
    },
    type: 'public-key',
    clientExtensionResults: credential.getClientExtensionResults(),
    // Convert null to undefined and cast to AuthenticatorAttachment type
    authenticatorAttachment: (credentialWithAttachment.authenticatorAttachment ?? undefined) as
      | AuthenticatorAttachment
      | undefined,
  }
}

/**
 * Convert an authentication/verification credential response to server format
 */
export function prepareAuthenticationResponseForServer(
  credential: PublicKeyCredential & { response: AuthenticatorAssertionResponse }
): AuthenticationResponseJSON {
  // Access authenticatorAttachment via type assertion to handle TypeScript version differences
  // @simplewebauthn/types includes this property but base TypeScript 4.7.4 doesn't
  const credentialWithAttachment = credential as PublicKeyCredential & {
    response: AuthenticatorAssertionResponse
    authenticatorAttachment?: string | null
  }

  const clientExtensionResults = credential.getClientExtensionResults()
  const assertionResponse = credential.response

  return {
    id: credential.id,
    rawId: credential.id, // SimpleWebAuthn expects base64url id here
    response: {
      authenticatorData: bytesToBase64URL(new Uint8Array(assertionResponse.authenticatorData)),
      clientDataJSON: bytesToBase64URL(new Uint8Array(assertionResponse.clientDataJSON)),
      signature: bytesToBase64URL(new Uint8Array(assertionResponse.signature)),
      userHandle: assertionResponse.userHandle
        ? bytesToBase64URL(new Uint8Array(assertionResponse.userHandle))
        : undefined,
    },
    type: 'public-key',
    clientExtensionResults,
    // Convert null to undefined and cast to AuthenticatorAttachment type
    authenticatorAttachment: (credentialWithAttachment.authenticatorAttachment ?? undefined) as
      | AuthenticatorAttachment
      | undefined,
  }
}

/**
 * A simple test to determine if a hostname is a properly-formatted domain name
 *
 * A "valid domain" is defined here: https://url.spec.whatwg.org/#valid-domain
 *
 * Regex sourced from here:
 * https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch08s15.html
 */
export function isValidDomain(hostname: string): boolean {
  return (
    // Consider localhost valid as well since it's okay wrt Secure Contexts
    hostname === 'localhost' || /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(hostname)
  )
}

/**
 * Determine if the browser is capable of Webauthn
 * Referenced from @link https://github.com/MasterKale/SimpleWebAuthn/blob/master/packages/browser/src/helpers/browserSupportsWebAuthn.ts#L4
 */
function browserSupportsWebAuthn(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof navigator?.credentials?.create === 'function' &&
    typeof navigator?.credentials?.get === 'function'
  )
}

/**
 * Make it possible to stub the return value during testing
 * @ignore Don't include this in docs output
 */
export const _browserSupportsWebAuthnInternals = {
  stubThis: (value: boolean) => value,
}

export class WebAuthnApi {
  public enroll: (
    params: Omit<MFAEnrollWebAuthnParams, 'factorType'>
  ) => Promise<AuthMFAEnrollWebAuthnResponse>
  public challenge: (
    params: BaseMFAChallengeParams &
      MFAChallengeWebAuthnParams & { friendlyName?: string; signal?: AbortSignal }
  ) => Promise<any>
  public verify: (params: {
    challengeId: string
    factorId: string
    credential: PublicKeyCredential
    webAuthn?: Partial<WebAuthnMFAVerifyParams['webAuthn']>
  }) => Promise<AuthMFAVerifyResponse>
  public authenticate: (params?: {
    factorId?: string
    rpId?: string
    rpOrigins?: string[]
    signal?: AbortSignal
  }) => Promise<AuthMFAVerifyResponse>
  public register: (params: {
    friendlyName: string
    rpId?: string
    rpOrigins?: string[]
    signal?: AbortSignal
  }) => Promise<
    | {
        data: MFAVerifyResponse
        error: null
      }
    | {
        data: null
        error: AuthError | WebAuthnError
      }
  >

  constructor(private client: GoTrueClient) {
    // Bind all methods so they can be destructured
    this.enroll = this._enroll.bind(this)
    this.challenge = this._challenge.bind(this)
    this.verify = this._verify.bind(this)
    this.authenticate = this._authenticate.bind(this)
    this.register = this._register.bind(this)
  }

  /**
   * Enroll a new WebAuthn factor
   * @param params - Enrollment parameters (friendlyName required)
   */
  public async _enroll(
    params: Omit<MFAEnrollWebAuthnParams, 'factorType'>
  ): Promise<AuthMFAEnrollWebAuthnResponse> {
    return this.client.mfa.enroll({ ...params, factorType: 'webauthn' })
  }

  /**
   * Challenge for WebAuthn credential creation or authentication
   * Combines server challenge with browser credential operations
   * @param params - Challenge parameters including factorId
   */
  public async _challenge({
    factorId,
    webAuthn,
    friendlyName,
    signal,
  }: BaseMFAChallengeParams &
    MFAChallengeWebAuthnParams & { friendlyName?: string; signal?: AbortSignal }): Promise<
    | {
        data: {
          challengeId: string
          credential: PublicKeyCredential
          factorId: string
        }
        error: null
      }
    | { data: null; error: AuthError | WebAuthnError }
  > {
    try {
      // Get challenge from server using the client's MFA methods
      const { data: challengeResponse, error: challengeError } = await this.client.mfa.challenge({
        factorId,
        webAuthn,
      })

      if (!challengeResponse) {
        return { data: null, error: challengeError }
      }

      let credentials: PublicKeyCredential | null = null
      const abortSignal = signal ?? webAuthnAbortService.createNewAbortSignal()

      // === Registration flow (creating new credential) ===
      if (
        'credential_creation_options' in challengeResponse &&
        challengeResponse.credential_creation_options
      ) {
        const options: CredentialCreationOptions & {
          publicKey: PublicKeyCredentialCreationOptions & { hints?: PublicKeyCredentialHint[] }
        } = {
          ...challengeResponse.credential_creation_options,
          publicKey: {
            ...challengeResponse.credential_creation_options.publicKey,
            authenticatorSelection: {
              authenticatorAttachment: 'cross-platform',
              requireResidentKey: false,
              userVerification: 'required',
            },
            user: {
              ...challengeResponse.credential_creation_options.publicKey.user,
              name:
                challengeResponse.credential_creation_options.publicKey.user.name ||
                friendlyName ||
                'user',
            },
            hints: ['security-key'],
          },
          signal: abortSignal,
        }

        try {
          const response = await navigator.credentials.create(options)
          if (!(response instanceof PublicKeyCredential)) {
            return {
              data: null,
              error: new AuthUnknownError('Browser returned unexpected credential type', response),
            }
          }
          credentials = response
        } catch (err) {
          return {
            data: null,
            error: identifyRegistrationError({
              error: err as Error,
              options,
            }),
          }
        }
      }
      // === Authentication flow (using existing credential) ===
      else if (
        'credential_request_options' in challengeResponse &&
        challengeResponse.credential_request_options
      ) {
        const options: CredentialRequestOptions & {
          publicKey: PublicKeyCredentialRequestOptions & { hints?: PublicKeyCredentialHint[] }
        } = {
          ...challengeResponse.credential_request_options,
          publicKey: {
            ...challengeResponse.credential_request_options.publicKey,
            allowCredentials:
              challengeResponse.credential_request_options.publicKey.allowCredentials,
            userVerification: 'required',
            hints: ['security-key'],
          },
          signal: abortSignal,
        }

        try {
          const response = await navigator.credentials.get(options)
          if (!(response instanceof PublicKeyCredential)) {
            return {
              data: null,
              error: new AuthUnknownError('Browser returned unexpected credential type', response),
            }
          }
          credentials = response
        } catch (err) {
          return {
            data: null,
            error: identifyAuthenticationError({
              error: err as Error,
              options,
            }),
          }
        }
      } else {
        return {
          data: null,
          error: new AuthUnknownError(
            'Challenge response missing credential options',
            challengeResponse
          ),
        }
      }

      return {
        data: {
          challengeId: challengeResponse.id,
          credential: credentials,
          factorId,
        },
        error: null,
      }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: null, error }
      }
      return {
        data: null,
        error: new AuthUnknownError('Unexpected error in challenge', error),
      }
    }
  }

  /**
   * Verify a WebAuthn credential with the server
   * @param params - Verification parameters including credential
   */
  public async _verify({
    challengeId,
    factorId,
    credential,
    webAuthn,
  }: {
    challengeId: string
    factorId: string
    credential: PublicKeyCredential
    webAuthn?: Partial<WebAuthnMFAVerifyParams['webAuthn']>
  }): Promise<AuthMFAVerifyResponse> {
    const isRegistration = credential.response instanceof AuthenticatorAttestationResponse

    return this.client.mfa.verify({
      factorId,
      challengeId,
      webAuthn: isRegistration
        ? {
            rpId: webAuthn?.rpId,
            rpOrigins: webAuthn?.rpOrigins,
            creationResponse: credential,
          }
        : {
            rpId: webAuthn?.rpId,
            rpOrigins: webAuthn?.rpOrigins,
            assertionResponse: credential,
          },
    })
  }

  /**
   * Complete WebAuthn authentication flow
   * @param params - Authentication parameters including factorId
   */
  public async _authenticate({
    factorId,
    rpId = typeof window !== 'undefined' ? window.location.hostname : undefined,
    rpOrigins = typeof window !== 'undefined' ? [window.location.origin] : undefined,
    signal,
  }: {
    factorId?: string
    rpId?: string
    rpOrigins?: string[]
    signal?: AbortSignal
  } = {}): Promise<AuthMFAVerifyResponse> {
    if (!rpId) {
      return {
        data: null,
        error: new AuthError('rpId is required for WebAuthn authentication'),
      }
    }
    try {
      if (!browserSupportsWebAuthn()) {
        return {
          data: null,
          error: new AuthUnknownError('Browser does not support WebAuthn', null),
        }
      }

      // Auto-detect factor if not provided
      let resolvedFactorId = factorId
      if (!resolvedFactorId) {
        const { data: factors, error: listError } = await this.client.mfa.listFactors()
        if (listError) {
          return { data: null, error: listError }
        }

        const webAuthnFactor = factors?.all.find(
          (f) => f.factor_type === 'webauthn' && f.status === 'verified'
        )
        if (!webAuthnFactor) {
          return {
            data: null,
            error: new AuthError('No verified WebAuthn factor found'),
          }
        }
        resolvedFactorId = webAuthnFactor.id
      }

      // Get challenge and credential
      const { data: challengeResponse, error: challengeError } = await this.challenge({
        factorId: resolvedFactorId,
        webAuthn: { rpId, rpOrigins },
        signal,
      })

      if (!challengeResponse) {
        const error = isAuthError(challengeError)
          ? challengeError
          : new AuthUnknownError(challengeError?.message || 'Challenge failed', challengeError)
        return { data: null, error }
      }

      // Verify credential
      return this._verify({
        factorId: resolvedFactorId,
        challengeId: challengeResponse.challengeId,
        credential: challengeResponse.credential,
        webAuthn: { rpId, rpOrigins },
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: null, error }
      }
      return {
        data: null,
        error: new AuthUnknownError('Unexpected error in authenticate', error),
      }
    }
  }

  /**
   * Complete WebAuthn registration flow
   * @param params - Registration parameters including friendlyName
   */
  public async _register({
    friendlyName,
    rpId = typeof window !== 'undefined' ? window.location.hostname : undefined,
    rpOrigins = typeof window !== 'undefined' ? [window.location.origin] : undefined,
    signal,
  }: {
    friendlyName: string
    rpId?: string
    rpOrigins?: string[]
    signal?: AbortSignal
  }): Promise<
    | {
        data: MFAVerifyResponse
        error: null
      }
    | {
        data: null
        error: AuthError | WebAuthnError
      }
  > {
    if (!rpId) {
      return {
        data: null,
        error: new AuthError('rpId is required for WebAuthn registration'),
      }
    }
    try {
      if (!browserSupportsWebAuthn()) {
        return {
          data: null,
          error: new AuthUnknownError('Browser does not support WebAuthn', null),
        }
      }

      // Enroll factor
      const { data: factor, error: enrollError } = await this._enroll({
        friendlyName,
      })

      if (!factor) {
        return { data: null, error: enrollError }
      }

      // Get challenge and create credential
      const { data: challengeResponse, error: challengeError } = await this._challenge({
        factorId: factor.id,
        friendlyName: factor.friendly_name,
        webAuthn: { rpId, rpOrigins },
        signal,
      })

      if (!challengeResponse) {
        return { data: null, error: challengeError }
      }

      // Verify credential
      return this._verify({
        factorId: factor.id,
        challengeId: challengeResponse.challengeId,
        credential: challengeResponse.credential,
        webAuthn: { rpId, rpOrigins },
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: null, error }
      }
      return {
        data: null,
        error: new AuthUnknownError('Unexpected error in register', error),
      }
    }
  }
}
