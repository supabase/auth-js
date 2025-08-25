import { base64UrlToUint8Array, bytesToBase64URL } from './base64url'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types'

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

  // Convert challenge from base64url to ArrayBuffer
  const challenge = base64UrlToUint8Array(options.challenge).buffer

  // Convert user.id from base64url to ArrayBuffer
  const user: PublicKeyCredentialUserEntity = {
    ...options.user,
    id: base64UrlToUint8Array(options.user.id).buffer as ArrayBuffer & { buffer: ArrayBuffer },
  }

  // Convert excludeCredentials[].id from base64url to ArrayBuffer
  const excludeCredentials = options.excludeCredentials?.map(
    (cred: { id: string; type: 'public-key' }) => ({
      ...cred,
      id: base64UrlToUint8Array(cred.id).buffer,
      type: cred.type || ('public-key' as PublicKeyCredentialType),
    })
  )

  return {
    ...options,
    challenge,
    user,
    excludeCredentials,
  } as PublicKeyCredentialCreationOptions
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

  // Convert challenge from base64url to ArrayBuffer
  const challenge = base64UrlToUint8Array(options.challenge).buffer

  // Convert allowCredentials[].id from base64url to ArrayBuffer
  const allowCredentials = options.allowCredentials?.map(
    (cred: { id: string; type: 'public-key' }) => ({
      ...cred,
      id: base64UrlToUint8Array(cred.id).buffer,
      type: cred.type || ('public-key' as PublicKeyCredentialType),
    })
  )

  return {
    ...options,
    challenge,
    allowCredentials,
  } as PublicKeyCredentialRequestOptions
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
  return {
    id: credential.id,
    rawId: credential.id,
    response: {
      attestationObject: bytesToBase64URL(new Uint8Array(credential.response.attestationObject)),
      clientDataJSON: bytesToBase64URL(new Uint8Array(credential.response.clientDataJSON)),
    },
    type: 'public-key',
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment as
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
    authenticatorAttachment: credential.authenticatorAttachment as
      | AuthenticatorAttachment
      | undefined,
  }
}
