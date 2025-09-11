// from https://github.com/MasterKale/SimpleWebAuthn/blob/master/packages/browser/src/types/index.ts

import { StrictOmit } from './types'

/**
 * A variant of PublicKeyCredentialCreationOptions suitable for JSON transmission to the browser to
 * (eventually) get passed into navigator.credentials.create(...) in the browser.
 *
 * This should eventually get replaced with official TypeScript DOM types when WebAuthn L3 types
 * eventually make it into the language:
 *
 * https://w3c.github.io/webauthn/#dictdef-publickeycredentialcreationoptionsjson
 */
export interface PublicKeyCredentialCreationOptionsJSON {
  rp: PublicKeyCredentialRpEntity
  user: PublicKeyCredentialUserEntityJSON
  challenge: Base64URLString
  pubKeyCredParams: PublicKeyCredentialParameters[]
  timeout?: number
  excludeCredentials?: PublicKeyCredentialDescriptorJSON[]
  authenticatorSelection?: AuthenticatorSelectionCriteria
  hints?: PublicKeyCredentialHint[]
  attestation?: AttestationConveyancePreference
  attestationFormats?: AttestationFormat[]
  extensions?: AuthenticationExtensionsClientInputs
}

/**
 * A variant of PublicKeyCredentialRequestOptions suitable for JSON transmission to the browser to
 * (eventually) get passed into navigator.credentials.get(...) in the browser.
 */
export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: Base64URLString
  timeout?: number
  rpId?: string
  allowCredentials?: PublicKeyCredentialDescriptorJSON[]
  userVerification?: UserVerificationRequirement
  hints?: PublicKeyCredentialHint[]
  extensions?: AuthenticationExtensionsClientInputs
}

/**
 * https://w3c.github.io/webauthn/#dictdef-publickeycredentialdescriptorjson
 */
export interface PublicKeyCredentialDescriptorJSON {
  id: Base64URLString
  type: PublicKeyCredentialType
  transports?: AuthenticatorTransportFuture[]
}

/**
 * https://w3c.github.io/webauthn/#dictdef-publickeycredentialuserentityjson
 */
export interface PublicKeyCredentialUserEntityJSON {
  id: string
  name: string
  displayName: string
}

export interface PublicKeyCredentialUserEntity {
  /**
   * A unique identifier for the user account.
   * Maximum 64 bytes. Should not contain PII.
   */
  id: BufferSource // ArrayBuffer | TypedArray | DataView

  /**
   * A human-readable identifier for the account.
   * Typically an email, username, or phone number.
   */
  name: string

  /**
   * A human-friendly display name for the user.
   * Example: "John Doe"
   */
  displayName: string
}

/**
 * The value returned from navigator.credentials.create()
 */
export interface RegistrationCredential
  extends PublicKeyCredentialFuture<RegistrationResponseJSON> {
  response: AuthenticatorAttestationResponseFuture
}

/**
 * A slightly-modified RegistrationCredential to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 *
 * https://w3c.github.io/webauthn/#dictdef-registrationresponsejson
 */
export interface RegistrationResponseJSON {
  id: Base64URLString
  rawId: Base64URLString
  response: AuthenticatorAttestationResponseJSON
  authenticatorAttachment?: AuthenticatorAttachment
  clientExtensionResults: AuthenticationExtensionsClientOutputs
  type: PublicKeyCredentialType
}

/**
 * The value returned from navigator.credentials.get()
 */
export interface AuthenticationCredential
  extends PublicKeyCredentialFuture<AuthenticationResponseJSON> {
  response: AuthenticatorAssertionResponse
}

/**
 * A slightly-modified AuthenticationCredential to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 *
 * https://w3c.github.io/webauthn/#dictdef-authenticationresponsejson
 */
export interface AuthenticationResponseJSON {
  id: Base64URLString
  rawId: Base64URLString
  response: AuthenticatorAssertionResponseJSON
  authenticatorAttachment?: AuthenticatorAttachment
  clientExtensionResults: AuthenticationExtensionsClientOutputs
  type: PublicKeyCredentialType
}

/**
 * A slightly-modified AuthenticatorAttestationResponse to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 *
 * https://w3c.github.io/webauthn/#dictdef-authenticatorattestationresponsejson
 */
export interface AuthenticatorAttestationResponseJSON {
  clientDataJSON: Base64URLString
  attestationObject: Base64URLString
  // Optional in L2, but becomes required in L3. Play it safe until L3 becomes Recommendation
  authenticatorData?: Base64URLString
  // Optional in L2, but becomes required in L3. Play it safe until L3 becomes Recommendation
  transports?: AuthenticatorTransportFuture[]
  // Optional in L2, but becomes required in L3. Play it safe until L3 becomes Recommendation
  publicKeyAlgorithm?: COSEAlgorithmIdentifier
  publicKey?: Base64URLString
}

/**
 * A slightly-modified AuthenticatorAssertionResponse to simplify working with ArrayBuffers that
 * are Base64URL-encoded in the browser so that they can be sent as JSON to the server.
 *
 * https://w3c.github.io/webauthn/#dictdef-authenticatorassertionresponsejson
 */
export interface AuthenticatorAssertionResponseJSON {
  clientDataJSON: Base64URLString
  authenticatorData: Base64URLString
  signature: Base64URLString
  userHandle?: Base64URLString
}

/**
 * Public key credential information needed to verify authentication responses
 */
export type WebAuthnCredential = {
  id: Base64URLString
  publicKey: Uint8Array_
  // Number of times this authenticator is expected to have been used
  counter: number
  // From browser's `startRegistration()` -> RegistrationCredentialJSON.transports (API L2 and up)
  transports?: AuthenticatorTransportFuture[]
}

/**
 * An attempt to communicate that this isn't just any string, but a Base64URL-encoded string
 */
export type Base64URLString = string

/**
 * AuthenticatorAttestationResponse in TypeScript's DOM lib is outdated (up through v3.9.7).
 * Maintain an augmented version here so we can implement additional properties as the WebAuthn
 * spec evolves.
 *
 * See https://www.w3.org/TR/webauthn-2/#iface-authenticatorattestationresponse
 *
 * Properties marked optional are not supported in all browsers.
 */
export interface AuthenticatorAttestationResponseFuture extends AuthenticatorAttestationResponse {
  getTransports(): AuthenticatorTransportFuture[]
}

/**
 * A super class of TypeScript's `AuthenticatorTransport` that includes support for the latest
 * transports. Should eventually be replaced by TypeScript's when TypeScript gets updated to
 * know about it (sometime after 4.6.3)
 */
export type AuthenticatorTransportFuture =
  | 'ble'
  | 'cable'
  | 'hybrid'
  | 'internal'
  | 'nfc'
  | 'smart-card'
  | 'usb'

/**
 * A super class of TypeScript's `PublicKeyCredentialDescriptor` that knows about the latest
 * transports. Should eventually be replaced by TypeScript's when TypeScript gets updated to
 * know about it (sometime after 4.6.3)
 */
export interface PublicKeyCredentialDescriptorFuture
  extends Omit<PublicKeyCredentialDescriptor, 'transports'> {
  transports?: AuthenticatorTransportFuture[]
}

/**
 * Enhanced PublicKeyCredentialCreationOptions that knows about the latest features
 */
export interface PublicKeyCredentialCreationOptionsFuture
  extends StrictOmit<PublicKeyCredentialCreationOptions, 'excludeCredentials' | 'user'> {
  excludeCredentials?: PublicKeyCredentialDescriptorFuture[]
  user: PublicKeyCredentialUserEntity
  hints?: PublicKeyCredentialHint[]
  authenticatorSelection?: AuthenticatorSelectionCriteria
  pubKeyCredParams: PublicKeyCredentialParameters[]
  rp: PublicKeyCredentialRpEntity
}

export interface PublicKeyCredentialRequestOptionsFuture
  extends StrictOmit<PublicKeyCredentialRequestOptions, 'allowCredentials'> {
  allowCredentials?: PublicKeyCredentialDescriptorFuture[]
  hints?: PublicKeyCredentialHint[]
  attestation?: AttestationConveyancePreference
}

/** */
export type PublicKeyCredentialJSON = RegistrationResponseJSON | AuthenticationResponseJSON

/**
 * A super class of TypeScript's `PublicKeyCredential` that knows about upcoming WebAuthn features
 */
export interface PublicKeyCredentialFuture<
  T extends PublicKeyCredentialJSON = PublicKeyCredentialJSON
> extends PublicKeyCredential {
  type: PublicKeyCredentialType
  // See https://github.com/w3c/webauthn/issues/1745
  isConditionalMediationAvailable?(): Promise<boolean>
  // See https://w3c.github.io/webauthn/#sctn-parseCreationOptionsFromJSON
  parseCreationOptionsFromJSON(
    options: PublicKeyCredentialCreationOptionsJSON
  ): PublicKeyCredentialCreationOptionsFuture
  // See https://w3c.github.io/webauthn/#sctn-parseRequestOptionsFromJSON
  parseRequestOptionsFromJSON(
    options: PublicKeyCredentialRequestOptionsJSON
  ): PublicKeyCredentialRequestOptionsFuture
  // See https://w3c.github.io/webauthn/#dom-publickeycredential-tojson
  toJSON(): T
}

/**
 * The two types of credentials as defined by bit 3 ("Backup Eligibility") in authenticator data:
 * - `"singleDevice"` credentials will never be backed up
 * - `"multiDevice"` credentials can be backed up
 */
export type CredentialDeviceType = 'singleDevice' | 'multiDevice'

/**
 * Categories of authenticators that Relying Parties can pass along to browsers during
 * registration. Browsers that understand these values can optimize their modal experience to
 * start the user off in a particular registration flow:
 *
 * - `hybrid`: A platform authenticator on a mobile device
 * - `security-key`: A portable FIDO2 authenticator capable of being used on multiple devices via a USB or NFC connection
 * - `client-device`: The device that WebAuthn is being called on. Typically synonymous with platform authenticators
 *
 * See https://w3c.github.io/webauthn/#enumdef-publickeycredentialhint
 *
 * These values are less strict than `authenticatorAttachment`
 */
export type PublicKeyCredentialHint = 'hybrid' | 'security-key' | 'client-device'

/**
 * Values for an attestation object's `fmt`
 *
 * See https://www.iana.org/assignments/webauthn/webauthn.xhtml#webauthn-attestation-statement-format-ids
 */
export type AttestationFormat =
  | 'fido-u2f'
  | 'packed'
  | 'android-safetynet'
  | 'android-key'
  | 'tpm'
  | 'apple'
  | 'none'

/**
 * Equivalent to `Uint8Array` before TypeScript 5.7, and `Uint8Array<ArrayBuffer>` in TypeScript 5.7
 * and beyond.
 *
 * **Context**
 *
 * `Uint8Array` became a generic type in TypeScript 5.7, requiring types defined simply as
 * `Uint8Array` to be refactored to `Uint8Array<ArrayBuffer>` starting in Deno 2.2. `Uint8Array` is
 * _not_ generic in Deno 2.1.x and earlier, though, so this type helps bridge this gap.
 *
 * Inspired by Deno's std library:
 *
 * https://github.com/denoland/std/blob/b5a5fe4f96b91c1fe8dba5cc0270092dd11d3287/bytes/_types.ts#L11
 */
export type Uint8Array_ = ReturnType<Uint8Array['slice']>
export type AuthenticatorAttachment = 'cross-platform' | 'platform'
