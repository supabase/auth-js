/**
 * Known error codes. Note that the server may also return other error codes
 * not included in this list (if the client library is older than the version
 * on the server).
 */

export const AUTH_ERROR_CODES = {
  // Anonymous sign-ins are disabled.
  ANONYMOUS_PROVIDER_DISABLED: 'anonymous_provider_disabled',
  // Returned from the PKCE flow where the provided code verifier does not match the expected one. Indicates a bug in the implementation of the client library.
  BAD_CODE_VERIFIER: 'bad_code_verifier',
  // Usually used when the HTTP body of the request is not valid JSON.
  BAD_JSON: 'bad_json',
  // JWT sent in the Authorization header is not valid.
  BAD_JWT: 'bad_jwt',
  // OAuth callback from provider to Auth does not have all the required attributes (state). Indicates an issue with the OAuth provider or client library implementation.
  BAD_OAUTH_CALLBACK: 'bad_oauth_callback',
  // OAuth state (data echoed back by the OAuth provider to Supabase Auth) is not in the correct format. Indicates an issue with the OAuth provider integration.
  BAD_OAUTH_STATE: 'bad_oauth_state',
  // Captcha challenge could not be verified with the captcha provider. Check your captcha integration.
  CAPTCHA_FAILED: 'captcha_failed',
  // General database conflict, such as concurrent requests on resources that should not be modified concurrently. Can often occur when you have too many session refresh requests firing off at the same time for a user. Check your app for concurrency issues, and if detected, back off exponentially.
  CONFLICT: 'conflict',
  // Email sending is not allowed for this address as your project is using the default SMTP service. Emails can only be sent to members in your Supabase organization. If you want to send emails to others, please set up a custom SMTP provider.
  EMAIL_ADDRESS_NOT_AUTHORIZED: 'email_address_not_authorized',
  // Unlinking this identity causes the user's account to change to an email address which is already used by another user account. Indicates an issue where the user has two different accounts using different primary email addresses. You may need to migrate user data to one of their accounts in this case.
  EMAIL_CONFLICT_IDENTITY_NOT_DELETABLE: 'email_conflict_identity_not_deletable',
  // Email address already exists in the system.
  EMAIL_EXISTS: 'email_exists',
  // Signing in is not allowed for this user as the email address is not confirmed.
  EMAIL_NOT_CONFIRMED: 'email_not_confirmed',
  // Signups are disabled for email and password.
  EMAIL_PROVIDER_DISABLED: 'email_provider_disabled',
  // PKCE flow state to which the API request relates has expired. Ask the user to sign in again.
  FLOW_STATE_EXPIRED: 'flow_state_expired',
  // PKCE flow state to which the API request relates no longer exists. Flow states expire after a while and are progressively cleaned up, which can cause this error. Retried requests can cause this error, as the previous request likely destroyed the flow state. Ask the user to sign in again.
  FLOW_STATE_NOT_FOUND: 'flow_state_not_found',
  // Payload from Auth exceeds maximum size limit.
  HOOK_PAYLOAD_OVER_SIZE_LIMIT: 'hook_payload_over_size_limit',
  // Unable to reach hook within maximum time allocated.
  HOOK_TIMEOUT: 'hook_timeout',
  // Unable to reach hook after maximum number of retries.
  HOOK_TIMEOUT_AFTER_RETRY: 'hook_timeout_after_retry',
  // The identity to which the API relates is already linked to a user.
  IDENTITY_ALREADY_EXISTS: 'identity_already_exists',
  // Identity to which the API call relates does not exist, such as when an identity is unlinked or deleted.
  IDENTITY_NOT_FOUND: 'identity_not_found',
  // To call this API, the user must have a higher Authenticator Assurance Level. To resolve, ask the user to solve an MFA challenge.
  INSUFFICIENT_AAL: 'insufficient_aal',
  // Invite is expired or already used.
  INVITE_NOT_FOUND: 'invite_not_found',
  // Login credentials or grant type not recognized.
  INVALID_CREDENTIALS: 'invalid_credentials',
  // Calling the supabase.auth.linkUser() and related APIs is not enabled on the Auth server.
  MANUAL_LINKING_DISABLED: 'manual_linking_disabled',
  // Responding to an MFA challenge should happen within a fixed time period. Request a new challenge when encountering this error.
  MFA_CHALLENGE_EXPIRED: 'mfa_challenge_expired',
  // MFA factors for a single user should not have the same friendly name.
  MFA_FACTOR_NAME_CONFLICT: 'mfa_factor_name_conflict',
  // MFA factor no longer exists.
  MFA_FACTOR_NOT_FOUND: 'mfa_factor_not_found',
  // The enrollment process for MFA factors must begin and end with the same IP address.
  MFA_IP_ADDRESS_MISMATCH: 'mfa_ip_address_mismatch',
  // MFA challenge could not be verified -- wrong TOTP code.
  MFA_VERIFICATION_FAILED: 'mfa_verification_failed',
  // Further MFA verification is rejected. Only returned if the MFA verification attempt hook returns a reject decision.
  MFA_VERIFICATION_REJECTED: 'mfa_verification_rejected',
  // Verified phone factor already exists for a user. Unenroll existing verified phone factor to continue.
  MFA_VERIFIED_FACTOR_EXISTS: 'mfa_verified_factor_exists',
  // Enrollment of MFA TOTP factors is disabled.
  MFA_TOTP_ENROLL_DISABLED: 'mfa_totp_enroll_disabled',
  // Login via TOTP factors and verification of new TOTP factors is disabled.
  MFA_TOTP_VERIFY_DISABLED: 'mfa_totp_verify_disabled',
  // Enrollment of MFA Phone factors is disabled.
  MFA_PHONE_ENROLL_DISABLED: 'mfa_phone_enroll_disabled',
  // Login via Phone factors and verification of new Phone factors is disabled.
  MFA_PHONE_VERIFY_DISABLED: 'mfa_phone_verify_disabled',
  // This HTTP request requires an Authorization header, which is not provided.
  NO_AUTHORIZATION: 'no_authorization',
  // User accessing the API is not admin, i.e. the JWT does not contain a role claim that identifies them as an admin of the Auth server.
  NOT_ADMIN: 'not_admin',
  // Using an OAuth provider which is disabled on the Auth server.
  OAUTH_PROVIDER_NOT_SUPPORTED: 'oauth_provider_not_supported',
  // Sign in with OTPs (magic link, email OTP) is disabled. Check your sever's configuration.
  OTP_DISABLED: 'otp_disabled',
  // OTP code for this sign-in has expired. Ask the user to sign in again.
  OTP_EXPIRED: 'otp_expired',
  // Too many emails have been sent to this email address. Ask the user to wait a while before trying again.
  OVER_EMAIL_SEND_RATE_LIMIT: 'over_email_send_rate_limit',
  // Too many requests have been sent by this client (IP address). Ask the user to try again in a few minutes. Sometimes can indicate a bug in your application that mistakenly sends out too many requests (such as a badly written useEffect React hook).
  OVER_REQUEST_RATE_LIMIT: 'over_request_rate_limit',
  // Too many SMS messages have been sent to this phone number. Ask the user to wait a while before trying again.
  OVER_SMS_SEND_RATE_LIMIT: 'over_sms_send_rate_limit',
  // Phone number already exists in the system.
  PHONE_EXISTS: 'phone_exists',
  // Signing in is not allowed for this user as the phone number is not confirmed.
  PHONE_NOT_CONFIRMED: 'phone_not_confirmed',
  // Signups are disabled for phone and password.
  PHONE_PROVIDER_DISABLED: 'phone_provider_disabled',
  // OAuth provider is disabled for use. Check your server's configuration.
  PROVIDER_DISABLED: 'provider_disabled',
  // Not all OAuth providers verify their user's email address. Supabase Auth requires emails to be verified, so this error is sent out when a verification email is sent after completing the OAuth flow.
  PROVIDER_EMAIL_NEEDS_VERIFICATION: 'provider_email_needs_verification',
  // A user needs to reauthenticate to change their password. Ask the user to reauthenticate by calling the supabase.auth.reauthenticate() API.
  REAUTHENTICATION_NEEDED: 'reauthentication_needed',
  // Verifying a reauthentication failed, the code is incorrect. Ask the user to enter a new code.
  REAUTHENTICATION_NOT_VALID: 'reauthentication_not_valid',
  // Processing the request took too long. Retry the request.
  REQUEST_TIMEOUT: 'request_timeout',
  // A user that is updating their password must use a different password than the one currently used.
  SAME_PASSWORD: 'same_password',
  // SAML assertion (user information) was received after sign in, but no email address was found in it, which is required. Check the provider's attribute mapping and/or configuration.
  SAML_ASSERTION_NO_EMAIL: 'saml_assertion_no_email',
  // SAML assertion (user information) was received after sign in, but a user ID (called NameID) was not found in it, which is required. Check the SAML identity provider's configuration.
  SAML_ASSERTION_NO_USER_ID: 'saml_assertion_no_user_id',
  // (Admin API.) Updating the SAML metadata for a SAML identity provider is not possible, as the entity ID in the update does not match the entity ID in the database. This is equivalent to creating a new identity provider, and you should do that instead.
  SAML_ENTITY_ID_MISMATCH: 'saml_entity_id_mismatch',
  // (Admin API.) Adding a SAML identity provider that is already added.
  SAML_IDP_ALREADY_EXISTS: 'saml_idp_already_exists',
  // SAML identity provider not found. Most often returned after IdP-initiated sign-in with an unregistered SAML identity provider in Supabase Auth.
  SAML_IDP_NOT_FOUND: 'saml_idp_not_found',
  // (Admin API.) Adding or updating a SAML provider failed as its metadata could not be fetched from the provided URL.
  SAML_METADATA_FETCH_FAILED: 'saml_metadata_fetch_failed',
  // Using Enterprise SSO with SAML 2.0 is not enabled on the Auth server.
  SAML_PROVIDER_DISABLED: 'saml_provider_disabled',
  // SAML relay state is an object that tracks the progress of a supabase.auth.signInWithSSO() request. The SAML identity provider should respond after a fixed amount of time, after which this error is shown. Ask the user to sign in again.
  SAML_RELAY_STATE_EXPIRED: 'saml_relay_state_expired',
  // SAML relay states are progressively cleaned up after they expire, which can cause this error. Ask the user to sign in again.
  SAML_RELAY_STATE_NOT_FOUND: 'saml_relay_state_not_found',
  // Session to which the API request relates no longer exists. This can occur if the user has signed out, or the session entry in the database was deleted in some other way.
  SESSION_NOT_FOUND: 'session_not_found',
  // Sign ups (new account creation) are disabled on the server.
  SIGNUP_DISABLED: 'signup_disabled',
  // Every user must have at least one identity attached to it, so deleting (unlinking) an identity is not allowed if it's the only one for the user.
  SINGLE_IDENTITY_NOT_DELETABLE: 'single_identity_not_deletable',
  // Sending an SMS message failed. Check your SMS provider configuration.
  SMS_SEND_FAILED: 'sms_send_failed',
  // (Admin API.) Only one SSO domain can be registered per SSO identity provider.
  SSO_DOMAIN_ALREADY_EXISTS: 'sso_domain_already_exists',
  // SSO provider not found. Check the arguments in supabase.auth.signInWithSSO().
  SSO_PROVIDER_NOT_FOUND: 'sso_provider_not_found',
  // A user can only have a fixed number of enrolled MFA factors.
  TOO_MANY_ENROLLED_MFA_FACTORS: 'too_many_enrolled_mfa_factors',
  // (Deprecated feature not available via Supabase client libraries.) The request's X-JWT-AUD claim does not match the JWT's audience.
  UNEXPECTED_AUDIENCE: 'unexpected_audience',
  // Auth service is degraded or a bug is present, without a specific reason.
  UNEXPECTED_FAILURE: 'unexpected_failure',
  // User with this information (email address, phone number) cannot be created again as it already exists.
  USER_ALREADY_EXISTS: 'user_already_exists',
  // User to which the API request relates has a banned_until property which is still active. No further API requests should be attempted until this field is cleared.
  USER_BANNED: 'user_banned',
  // User to which the API request relates no longer exists.
  USER_NOT_FOUND: 'user_not_found',
  // When a user comes from SSO, certain fields of the user cannot be updated (like email).
  USER_SSO_MANAGED: 'user_sso_managed',
  // Provided parameters are not in the expected format.
  VALIDATION_FAILED: 'validation_failed',
  // User is signing up or changing their password without meeting the password strength criteria. Use the AuthWeakPasswordError class to access more information about what they need to do to make the password pass.
  WEAK_PASSWORD: 'weak_password',
} as const

export type ErrorCode = typeof AUTH_ERROR_CODES[keyof typeof AUTH_ERROR_CODES]
