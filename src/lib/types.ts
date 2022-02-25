export type Provider =
  | 'apple'
  | 'azure'
  | 'bitbucket'
  | 'discord'
  | 'facebook'
  | 'github'
  | 'gitlab'
  | 'google'
  | 'linkedin'
  | 'notion'
  | 'slack'
  | 'spotify'
  | 'twitch'
  | 'twitter'

export type AuthChangeEvent =
  | 'PASSWORD_RECOVERY'
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'USER_DELETED'

export interface ApiError {
  message: string
  status: number
}

export interface Session {
  provider_token?: string | null
  access_token: string
  /**
   * The number of seconds until the token expires (since it was issued). Returned when a login is confirmed.
   */
  expires_in?: number
  /**
   * A timestamp of when the token will expire. Returned when a login is confirmed.
   */
  expires_at?: number
  refresh_token?: string
  token_type: string
  user: User | null
}

export interface UserIdentity {
  id: string
  user_id: string
  identity_data: {
    [key: string]: any
  }
  provider: string
  created_at: string
  last_sign_in_at: string
  updated_at?: string
}

export interface User {
  id: string
  app_metadata: {
    provider?: string
    [key: string]: any
  }
  user_metadata: {
    [key: string]: any
  }
  aud: string
  confirmation_sent_at?: string
  recovery_sent_at?: string
  invited_at?: string
  action_link?: string
  email?: string
  phone?: string
  created_at: string
  confirmed_at?: string
  email_confirmed_at?: string
  phone_confirmed_at?: string
  last_sign_in_at?: string
  role?: string
  updated_at?: string
  identities?: UserIdentity[]
}

export interface UserAttributes {
  /**
   * The user's email.
   */
  email?: string

  /**
   * The user's password.
   */
  password?: string

  /**
   * An email change token.
   */
  email_change_token?: string

  /**
   * A custom data object for user_metadata that a user can modify. Can be any JSON.
   */
  data?: object
}

export interface AdminUserAttributes extends UserAttributes {
  /**
   * A custom data object for user_metadata.
   *
   * Can be any JSON.
   *
   * Only a service role can modify.
   *
   * Note: When using the GoTrueAdminApi and wanting to modify a user's user_metadata,
   * this attribute is used instead of UserAttributes data.
   *
   */
  user_metadata?: object

  /**
   * A custom data object for app_metadata that.
   *
   * Only a service role can modify.
   *
   * Can be any JSON that includes app-specific info, such as identity providers, roles, and other
   * access control information.
   */
  app_metadata?: object

  /**
   * Sets if a user has confirmed their email address.
   *
   * Only a service role can modify.
   */
  email_confirm?: boolean

  /**
   * Sets if a user has confirmed their phone number.
   *
   * Only a service role can modify.
   */
  phone_confirm?: boolean
}

export interface Subscription {
  /**
   * The subscriber UUID. This will be set by the client.
   */
  id: string
  /**
   * The function to call every time there is an event. eg: (eventName) => {}
   */
  callback: (event: AuthChangeEvent, session: Session | null) => void
  /**
   * Call this to remove the listener.
   */
  unsubscribe: () => void
}

export interface CookieOptions {
  // (Optional) The Cookie name prefix. Defaults to `sb` meaning the cookies will be `sb-access-token` and `sb-refresh-token`.
  name?: string
  // (Optional) The cookie lifetime (expiration) in seconds. Set to 8 hours by default.
  lifetime?: number
  // (Optional) The cookie domain this should run on. Leave it blank to restrict it to your domain.
  domain?: string
  path?: string
  // (Optional) SameSite configuration for the session cookie. Defaults to 'lax', but can be changed to 'strict' or 'none'. Set it to false if you want to disable the SameSite setting.
  sameSite?: string
}

export interface UserCredentials {
  email?: string
  phone?: string
  password?: string
  refreshToken?: string
  // (Optional) The name of the provider.
  provider?: Provider
  oidc?: OpenIDConnectCredentials
}

export interface VerifyOTPParams {
  phone: string
  token: string
}

export interface OpenIDConnectCredentials {
  id_token: string
  nonce: string
  provider?: Provider
  client_id?: string
  issuer?: string
}
