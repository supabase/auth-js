import { base64UrlToUint8Array, bytesToBase64URL } from './base64url'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorAttachment,
} from './webauthn.dom'

import { WebAuthnError, isWebAuthnError } from './webauthn.errors'

export { WebAuthnError, isWebAuthnError }

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
export function browserSupportsWebAuthn(): boolean {
  return _browserSupportsWebAuthnInternals.stubThis(
    globalThis?.PublicKeyCredential !== undefined &&
      typeof globalThis.PublicKeyCredential === 'function'
  )
}

/**
 * Make it possible to stub the return value during testing
 * @ignore Don't include this in docs output
 */
export const _browserSupportsWebAuthnInternals = {
  stubThis: (value: boolean) => value,
}
