import GoTrueAdminApi from './GoTrueAdminApi'
import {
  DEFAULT_HEADERS,
  EXPIRY_MARGIN,
  GOTRUE_URL,
  NETWORK_FAILURE,
  STORAGE_KEY,
} from './lib/constants'
import {
  AuthError,
  AuthImplicitGrantRedirectError,
  AuthInvalidCredentialsError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
  isAuthError,
} from './lib/errors'
import { Fetch, _request, _sessionResponse, _userResponse } from './lib/fetch'
import {
  Deferred,
  getItemAsync,
  getParameterByName,
  isBrowser,
  removeItemAsync,
  resolveFetch,
  setItemAsync,
  uuid,
  decodeJWTPayload,
} from './lib/helpers'
import localStorageAdapter from './lib/local-storage'
import { polyfillGlobalThis } from './lib/polyfills'
import type {
  AuthChangeEvent,
  AuthResponse,
  CallRefreshTokenResult,
  GoTrueClientOptions,
  InitializeResult,
  OAuthResponse,
  Provider,
  Session,
  SignInWithOAuthCredentials,
  SignInWithPasswordCredentials,
  SignInWithPasswordlessCredentials,
  SignUpWithPasswordCredentials,
  Subscription,
  SupportedStorage,
  User,
  UserAttributes,
  UserResponse,
  VerifyOtpParams,
  GoTrueMFAApi,
  MFAEnrollParams,
  AuthMFAEnrollResponse,
  MFAChallengeParams,
  AuthMFAChallengeResponse,
  MFAUnenrollParams,
  AuthMFAUnenrollResponse,
  MFAVerifyParams,
  AuthMFAVerifyResponse,
  AuthMFAListFactorsResponse,
  AMREntry,
  AuthMFAGetAuthenticatorAssuranceLevelResponse,
  AuthenticatorAssuranceLevels,
  Factor,
  MFAChallengeAndVerifyParams,
} from './lib/types'

polyfillGlobalThis() // Make "globalThis" available

const DEFAULT_OPTIONS: Omit<Required<GoTrueClientOptions>, 'fetch' | 'storage'> = {
  url: GOTRUE_URL,
  storageKey: STORAGE_KEY,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  headers: DEFAULT_HEADERS,
}

export default class GoTrueClient {
  /**
   * Namespace for the GoTrue admin methods.
   * These methods should only be used in a trusted server-side environment.
   */
  admin: GoTrueAdminApi
  /**
   * Namespace for the MFA methods.
   */
  mfa: GoTrueMFAApi
  /**
   * The storage key used to identify the values saved in localStorage
   */
  protected storageKey: string

  /**
   * The session object for the currently logged in user. If null, it means there isn't a logged-in user.
   * Only used if persistSession is false.
   */
  protected inMemorySession: Session | null

  protected autoRefreshToken: boolean
  protected persistSession: boolean
  protected storage: SupportedStorage
  protected stateChangeEmitters: Map<string, Subscription> = new Map()
  protected refreshTokenTimer?: ReturnType<typeof setTimeout>
  protected networkRetries = 0
  protected refreshingDeferred: Deferred<CallRefreshTokenResult> | null = null
  /**
   * Keeps track of the async client initialization.
   * When null or not yet resolved the auth state is `unknown`
   * Once resolved the the auth state is known and it's save to call any further client methods.
   * Keep extra care to never reject or throw uncaught errors
   */
  protected initializePromise: Promise<InitializeResult> | null = null
  protected detectSessionInUrl = true
  protected url: string
  protected headers: {
    [key: string]: string
  }
  protected fetch: Fetch

  /**
   * Create a new client for use in the browser.
   */
  constructor(options: GoTrueClientOptions) {
    const settings = { ...DEFAULT_OPTIONS, ...options }
    this.inMemorySession = null
    this.storageKey = settings.storageKey
    this.autoRefreshToken = settings.autoRefreshToken
    this.persistSession = settings.persistSession
    this.storage = settings.storage || localStorageAdapter
    this.admin = new GoTrueAdminApi({
      url: settings.url,
      headers: settings.headers,
      fetch: settings.fetch,
    })

    this.url = settings.url
    this.headers = settings.headers
    this.fetch = resolveFetch(settings.fetch)
    this.detectSessionInUrl = settings.detectSessionInUrl

    this.initialize()
    this.mfa = {
      verify: this._verify.bind(this),
      enroll: this._enroll.bind(this),
      unenroll: this._unenroll.bind(this),
      challenge: this._challenge.bind(this),
      listFactors: this._listFactors.bind(this),
      challengeAndVerify: this._challengeAndVerify.bind(this),
      getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this),
    }
  }

  /**
   * Initializes the client session either from the url or from storage.
   * This method is automatically called when instantiating the client, but should also be called
   * manually when checking for an error from an auth redirect (oauth, magiclink, password recovery, etc).
   */
  initialize(): Promise<InitializeResult> {
    if (!this.initializePromise) {
      this.initializePromise = this._initialize()
    }

    return this.initializePromise
  }

  /**
   * IMPORTANT:
   * 1. Never throw in this method, as it is called from the constructor
   * 2. Never return a session from this method as it would be cached over
   *    the whole lifetime of the client
   */
  private async _initialize(): Promise<InitializeResult> {
    if (this.initializePromise) {
      return this.initializePromise
    }

    try {
      if (this.detectSessionInUrl && this._isImplicitGrantFlow()) {
        const { data, error } = await this._getSessionFromUrl()

        if (error) {
          // failed login attempt via url,
          // remove old session as in verifyOtp, signUp and signInWith*
          await this._removeSession()

          return { error }
        }

        const { session, redirectType } = data

        await this._saveSession(session)
        this._notifyAllSubscribers('SIGNED_IN', session)
        if (redirectType === 'recovery') {
          this._notifyAllSubscribers('PASSWORD_RECOVERY', session)
        }

        return { error: null }
      }

      // no login attempt via callback url try to recover session from storage
      await this._recoverAndRefresh()
      return { error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { error }
      }

      return {
        error: new AuthUnknownError('Unexpected error during initialization', error),
      }
    } finally {
      this._handleVisibilityChange()
    }
  }

  /**
   * Creates a new user.
   * @returns A logged-in session if the server has "autoconfirm" ON
   * @returns A user if the server has "autoconfirm" OFF
   */
  async signUp(credentials: SignUpWithPasswordCredentials): Promise<AuthResponse> {
    try {
      await this._removeSession()

      let res: AuthResponse
      if ('email' in credentials) {
        const { email, password, options } = credentials
        res = await _request(this.fetch, 'POST', `${this.url}/signup`, {
          headers: this.headers,
          redirectTo: options?.emailRedirectTo,
          body: {
            email,
            password,
            data: options?.data ?? {},
            gotrue_meta_security: { captcha_token: options?.captchaToken },
          },
          xform: _sessionResponse,
        })
      } else if ('phone' in credentials) {
        const { phone, password, options } = credentials
        res = await _request(this.fetch, 'POST', `${this.url}/signup`, {
          headers: this.headers,
          body: {
            phone,
            password,
            data: options?.data ?? {},
            gotrue_meta_security: { captcha_token: options?.captchaToken },
          },
          xform: _sessionResponse,
        })
      } else {
        throw new AuthInvalidCredentialsError(
          'You must provide either an email or phone number and a password'
        )
      }

      const { data, error } = res

      if (error || !data) {
        return { data: { user: null, session: null }, error: error }
      }

      const session: Session | null = data.session
      const user: User | null = data.user

      if (data.session) {
        await this._saveSession(data.session)
        this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return { data: { user, session }, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null, session: null }, error }
      }

      throw error
    }
  }

  /**
   * Log in an existing user with an email and password or phone and password.
   */
  async signInWithPassword(credentials: SignInWithPasswordCredentials): Promise<AuthResponse> {
    try {
      await this._removeSession()

      let res: AuthResponse
      if ('email' in credentials) {
        const { email, password, options } = credentials
        res = await _request(this.fetch, 'POST', `${this.url}/token?grant_type=password`, {
          headers: this.headers,
          body: {
            email,
            password,
            data: options?.data ?? {},
            gotrue_meta_security: { captcha_token: options?.captchaToken },
          },
          xform: _sessionResponse,
        })
      } else if ('phone' in credentials) {
        const { phone, password, options } = credentials
        res = await _request(this.fetch, 'POST', `${this.url}/token?grant_type=password`, {
          headers: this.headers,
          body: {
            phone,
            password,
            data: options?.data ?? {},
            gotrue_meta_security: { captcha_token: options?.captchaToken },
          },
          xform: _sessionResponse,
        })
      } else {
        throw new AuthInvalidCredentialsError(
          'You must provide either an email or phone number and a password'
        )
      }
      const { data, error } = res
      if (error || !data) return { data: { user: null, session: null }, error }
      if (data.session) {
        await this._saveSession(data.session)
        this._notifyAllSubscribers('SIGNED_IN', data.session)
      }
      return { data, error }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null, session: null }, error }
      }
      throw error
    }
  }

  /**
   * Log in an existing user via a third-party provider.
   */
  async signInWithOAuth(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse> {
    await this._removeSession()
    return this._handleProviderSignIn(credentials.provider, {
      redirectTo: credentials.options?.redirectTo,
      scopes: credentials.options?.scopes,
      queryParams: credentials.options?.queryParams,
    })
  }

  /**
   * Log in a user using magiclink or a one-time password (OTP).
   * If the `{{ .ConfirmationURL }}` variable is specified in the email template, a magiclink will be sent.
   * If the `{{ .Token }}` variable is specified in the email template, an OTP will be sent.
   * If you're using phone sign-ins, only an OTP will be sent. You won't be able to send a magiclink for phone sign-ins.
   */
  async signInWithOtp(credentials: SignInWithPasswordlessCredentials): Promise<AuthResponse> {
    try {
      await this._removeSession()

      if ('email' in credentials) {
        const { email, options } = credentials
        const { error } = await _request(this.fetch, 'POST', `${this.url}/otp`, {
          headers: this.headers,
          body: {
            email,
            data: options?.data ?? {},
            create_user: options?.shouldCreateUser ?? true,
            gotrue_meta_security: { captcha_token: options?.captchaToken },
          },
          redirectTo: options?.emailRedirectTo,
        })
        return { data: { user: null, session: null }, error }
      }
      if ('phone' in credentials) {
        const { phone, options } = credentials
        const { error } = await _request(this.fetch, 'POST', `${this.url}/otp`, {
          headers: this.headers,
          body: {
            phone,
            data: options?.data ?? {},
            create_user: options?.shouldCreateUser ?? true,
            gotrue_meta_security: { captcha_token: options?.captchaToken },
          },
        })
        return { data: { user: null, session: null }, error }
      }
      throw new AuthInvalidCredentialsError('You must provide either an email or phone number.')
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null, session: null }, error }
      }

      throw error
    }
  }

  /**
   * Log in a user given a User supplied OTP received via mobile.
   */
  async verifyOtp(params: VerifyOtpParams): Promise<AuthResponse> {
    try {
      await this._removeSession()

      const { data, error } = await _request(this.fetch, 'POST', `${this.url}/verify`, {
        headers: this.headers,
        body: {
          ...params,
          gotrue_meta_security: { captcha_token: params.options?.captchaToken },
        },
        redirectTo: params.options?.redirectTo,
        xform: _sessionResponse,
      })

      if (error) {
        throw error
      }

      if (!data) {
        throw 'An error occurred on token verification.'
      }

      const session: Session | null = data.session
      const user: User = data.user

      if (session?.access_token) {
        await this._saveSession(session as Session)
        this._notifyAllSubscribers('SIGNED_IN', session)
      }

      return { data: { user, session }, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null, session: null }, error }
      }

      throw error
    }
  }

  /**
   * Returns the session, refreshing it if necessary.
   * The session returned can be null if the session is not detected which can happen in the event a user is not signed-in or has logged out.
   */
  async getSession(): Promise<
    | {
        data: {
          session: Session
        }
        error: null
      }
    | {
        data: {
          session: null
        }
        error: AuthError
      }
    | {
        data: {
          session: null
        }
        error: null
      }
  > {
    // make sure we've read the session from the url if there is one
    // save to just await, as long we make sure _initialize() never throws
    await this.initializePromise

    let currentSession: Session | null = null

    if (this.persistSession) {
      const maybeSession = await getItemAsync(this.storage, this.storageKey)

      if (maybeSession !== null) {
        if (this._isValidSession(maybeSession)) {
          currentSession = maybeSession
        } else {
          await this._removeSession()
        }
      }
    } else {
      currentSession = this.inMemorySession
    }

    if (!currentSession) {
      return { data: { session: null }, error: null }
    }

    const hasExpired = currentSession.expires_at
      ? currentSession.expires_at <= Date.now() / 1000
      : false
    if (!hasExpired) {
      return { data: { session: currentSession }, error: null }
    }

    const { session, error } = await this._callRefreshToken(currentSession.refresh_token)
    if (error) {
      return { data: { session: null }, error }
    }

    return { data: { session }, error: null }
  }

  /**
   * Gets the current user details if there is an existing session.
   * @param jwt Takes in an optional access token jwt. If no jwt is provided, getUser() will attempt to get the jwt from the current session.
   */
  async getUser(jwt?: string): Promise<UserResponse> {
    try {
      if (!jwt) {
        const { data, error } = await this.getSession()
        if (error) {
          throw error
        }

        // Default to Authorization header if there is no existing session
        jwt = data.session?.access_token ?? undefined
      }

      return await _request(this.fetch, 'GET', `${this.url}/user`, {
        headers: this.headers,
        jwt: jwt,
        xform: _userResponse,
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null }, error }
      }

      throw error
    }
  }

  /**
   * Updates user data, if there is a logged in user.
   */
  async updateUser(attributes: UserAttributes): Promise<UserResponse> {
    try {
      const { data: sessionData, error: sessionError } = await this.getSession()
      if (sessionError) {
        throw sessionError
      }
      if (!sessionData.session) {
        throw new AuthSessionMissingError()
      }
      const session: Session = sessionData.session
      const { data, error: userError } = await _request(this.fetch, 'PUT', `${this.url}/user`, {
        headers: this.headers,
        body: attributes,
        jwt: session.access_token,
        xform: _userResponse,
      })
      if (userError) throw userError
      session.user = data.user as User
      await this._saveSession(session)
      this._notifyAllSubscribers('USER_UPDATED', session)

      return { data: { user: session.user }, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null }, error }
      }

      throw error
    }
  }

  /**
   * Decodes a JWT (without performing any validation).
   */
  private _decodeJWT(jwt: string): {
    exp?: number
    aal?: AuthenticatorAssuranceLevels | null
    amr?: AMREntry[] | null
  } {
    return decodeJWTPayload(jwt)
  }

  /**
   * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
   * If the refresh token in the current session is invalid and the current session has expired, an error will be thrown.
   * If the current session does not contain at expires_at field, setSession will use the exp claim defined in the access token.
   * @param currentSession The current session that minimally contains an access token and refresh token.
   */
  async setSession(currentSession: {
    access_token: string
    refresh_token: string
  }): Promise<AuthResponse> {
    try {
      const timeNow = Date.now() / 1000
      let expiresAt = timeNow
      let hasExpired = true
      let session: Session | null = null
      if (currentSession.access_token && currentSession.access_token.split('.')[1]) {
        const payload = this._decodeJWT(currentSession.access_token)

        if (payload.exp) {
          expiresAt = payload.exp
          hasExpired = expiresAt <= timeNow
        }
      }

      if (hasExpired) {
        if (!currentSession.refresh_token) {
          throw new AuthSessionMissingError()
        }
        const { data, error } = await this._refreshAccessToken(currentSession.refresh_token)
        if (error) {
          return { data: { session: null, user: null }, error: error }
        }

        if (!data.session) {
          return { data: { session: null, user: null }, error: null }
        }
        session = data.session
      } else {
        const { data, error } = await this.getUser(currentSession.access_token)
        if (error) {
          throw error
        }
        session = {
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
          user: data.user,
          token_type: 'bearer',
          expires_in: expiresAt - timeNow,
          expires_at: expiresAt,
        }
      }

      await this._saveSession(session)
      this._notifyAllSubscribers('TOKEN_REFRESHED', session)

      return { data: { session, user: session.user }, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { session: null, user: null }, error }
      }

      throw error
    }
  }

  /**
   * Returns a new session, regardless of expiry status.
   * Takes in an optional current session. If not passed in, then refreshSession() will attempt to retrieve it from getSession().
   * If the current session's refresh token is invalid, an error will be thrown.
   * @param currentSession The current session. If passed in, it must contain a refresh token.
   */
  async refreshSession(currentSession?: { refresh_token: string }): Promise<AuthResponse> {
    try {
      if (!currentSession) {
        const { data, error } = await this.getSession()
        if (error) {
          throw error
        }

        currentSession = data.session ?? undefined
      }

      if (!currentSession?.refresh_token) {
        throw new AuthSessionMissingError()
      }

      const { session, error } = await this._callRefreshToken(currentSession.refresh_token)
      if (error) {
        return { data: { user: null, session: null }, error: error }
      }

      if (!session) {
        return { data: { user: null, session: null }, error: null }
      }

      return { data: { user: session.user, session }, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { user: null, session: null }, error }
      }

      throw error
    }
  }

  /**
   * Gets the session data from a URL string
   */
  private async _getSessionFromUrl(): Promise<
    | {
        data: { session: Session; redirectType: string | null }
        error: null
      }
    | { data: { session: null; redirectType: null }; error: AuthError }
  > {
    try {
      if (!isBrowser()) throw new AuthImplicitGrantRedirectError('No browser detected.')
      if (!this._isImplicitGrantFlow()) {
        throw new AuthImplicitGrantRedirectError('Not a valid implicit grant flow url.')
      }

      const error_description = getParameterByName('error_description')
      if (error_description) {
        const error_code = getParameterByName('error_code')
        if (!error_code) throw new AuthImplicitGrantRedirectError('No error_code detected.')
        const error = getParameterByName('error')
        if (!error) throw new AuthImplicitGrantRedirectError('No error detected.')

        throw new AuthImplicitGrantRedirectError(error_description, { error, code: error_code })
      }

      const provider_token = getParameterByName('provider_token')
      const provider_refresh_token = getParameterByName('provider_refresh_token')
      const access_token = getParameterByName('access_token')
      if (!access_token) throw new AuthImplicitGrantRedirectError('No access_token detected.')
      const expires_in = getParameterByName('expires_in')
      if (!expires_in) throw new AuthImplicitGrantRedirectError('No expires_in detected.')
      const refresh_token = getParameterByName('refresh_token')
      if (!refresh_token) throw new AuthImplicitGrantRedirectError('No refresh_token detected.')
      const token_type = getParameterByName('token_type')
      if (!token_type) throw new AuthImplicitGrantRedirectError('No token_type detected.')

      const timeNow = Math.round(Date.now() / 1000)
      const expires_at = timeNow + parseInt(expires_in)

      const { data, error } = await this.getUser(access_token)
      if (error) throw error
      const user: User = data.user
      const session: Session = {
        provider_token,
        provider_refresh_token,
        access_token,
        expires_in: parseInt(expires_in),
        expires_at,
        refresh_token,
        token_type,
        user,
      }
      const redirectType = getParameterByName('type')

      // Remove tokens from URL
      window.location.hash = ''

      return { data: { session, redirectType }, error: null }
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { session: null, redirectType: null }, error }
      }

      throw error
    }
  }

  /**
   * Checks if the current URL contains parameters given by an implicit oauth grant flow (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2)
   */
  private _isImplicitGrantFlow(): boolean {
    return (
      isBrowser() &&
      (Boolean(getParameterByName('access_token')) ||
        Boolean(getParameterByName('error_description')))
    )
  }

  /**
   * Inside a browser context, `signOut()` will remove the logged in user from the browser session
   * and log them out - removing all items from localstorage and then trigger a `"SIGNED_OUT"` event.
   *
   * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
   * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    const { data, error: sessionError } = await this.getSession()
    if (sessionError) {
      return { error: sessionError }
    }
    const accessToken = data.session?.access_token
    if (accessToken) {
      const { error } = await this.admin.signOut(accessToken)
      if (error) return { error }
    }
    await this._removeSession()
    this._notifyAllSubscribers('SIGNED_OUT', null)
    return { error: null }
  }

  /**
   * Receive a notification every time an auth event happens.
   * @param callback A callback function to be invoked when an auth event happens.
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): {
    data: { subscription: Subscription }
  } {
    const id: string = uuid()
    const subscription: Subscription = {
      id,
      callback,
      unsubscribe: () => {
        this.stateChangeEmitters.delete(id)
      },
    }

    this.stateChangeEmitters.set(id, subscription)

    return { data: { subscription } }
  }

  /**
   * Sends a password reset request to an email address.
   * @param email The email address of the user.
   * @param options.redirectTo The URL to send the user to after they click the password reset link.
   * @param options.captchaToken Verification token received when the user completes the captcha on the site.
   */
  async resetPasswordForEmail(
    email: string,
    options: {
      redirectTo?: string
      captchaToken?: string
    } = {}
  ): Promise<
    | {
        data: {}
        error: null
      }
    | { data: null; error: AuthError }
  > {
    try {
      return await _request(this.fetch, 'POST', `${this.url}/recover`, {
        body: { email, gotrue_meta_security: { captcha_token: options.captchaToken } },
        headers: this.headers,
        redirectTo: options.redirectTo,
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: null, error }
      }

      throw error
    }
  }

  /**
   * Generates a new JWT.
   * @param refreshToken A valid refresh token that was returned on login.
   */
  private async _refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    try {
      return await _request(this.fetch, 'POST', `${this.url}/token?grant_type=refresh_token`, {
        body: { refresh_token: refreshToken },
        headers: this.headers,
        xform: _sessionResponse,
      })
    } catch (error) {
      if (isAuthError(error)) {
        return { data: { session: null, user: null }, error }
      }
      throw error
    }
  }

  private _isValidSession(maybeSession: unknown): maybeSession is Session {
    const isValidSession =
      typeof maybeSession === 'object' &&
      maybeSession !== null &&
      'access_token' in maybeSession &&
      'refresh_token' in maybeSession &&
      'expires_at' in maybeSession

    return isValidSession
  }

  private _handleProviderSignIn(
    provider: Provider,
    options: {
      redirectTo?: string
      scopes?: string
      queryParams?: { [key: string]: string }
    } = {}
  ) {
    const url: string = this._getUrlForProvider(provider, {
      redirectTo: options.redirectTo,
      scopes: options.scopes,
      queryParams: options.queryParams,
    })
    // try to open on the browser
    if (isBrowser()) {
      window.location.href = url
    }
    return { data: { provider, url }, error: null }
  }

  /**
   * Recovers the session from LocalStorage and refreshes
   * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
   */
  private async _recoverAndRefresh() {
    try {
      const currentSession = await getItemAsync(this.storage, this.storageKey)
      if (!this._isValidSession(currentSession)) {
        if (currentSession !== null) {
          await this._removeSession()
        }

        return
      }

      const timeNow = Math.round(Date.now() / 1000)

      if ((currentSession.expires_at ?? Infinity) < timeNow + EXPIRY_MARGIN) {
        if (this.autoRefreshToken && currentSession.refresh_token) {
          this.networkRetries++
          const { error } = await this._callRefreshToken(currentSession.refresh_token)
          if (error) {
            console.log(error.message)
            if (
              error instanceof AuthRetryableFetchError &&
              this.networkRetries < NETWORK_FAILURE.MAX_RETRIES
            ) {
              if (this.refreshTokenTimer) clearTimeout(this.refreshTokenTimer)
              this.refreshTokenTimer = setTimeout(
                () => this._recoverAndRefresh(),
                NETWORK_FAILURE.RETRY_INTERVAL ** this.networkRetries * 100 // exponential backoff
              )
              return
            }
            await this._removeSession()
          }
          this.networkRetries = 0
        } else {
          await this._removeSession()
        }
      } else {
        if (this.persistSession) {
          await this._saveSession(currentSession)
        }
        this._notifyAllSubscribers('SIGNED_IN', currentSession)
      }
    } catch (err) {
      console.error(err)
      return
    }
  }

  private async _callRefreshToken(refreshToken: string): Promise<CallRefreshTokenResult> {
    // refreshing is already in progress
    if (this.refreshingDeferred) {
      return this.refreshingDeferred.promise
    }

    try {
      this.refreshingDeferred = new Deferred<CallRefreshTokenResult>()

      if (!refreshToken) {
        throw new AuthSessionMissingError()
      }
      const { data, error } = await this._refreshAccessToken(refreshToken)
      if (error) throw error
      if (!data.session) throw new AuthSessionMissingError()

      await this._saveSession(data.session)
      this._notifyAllSubscribers('TOKEN_REFRESHED', data.session)

      const result = { session: data.session, error: null }

      this.refreshingDeferred.resolve(result)

      return result
    } catch (error) {
      if (isAuthError(error)) {
        const result = { session: null, error }

        this.refreshingDeferred?.resolve(result)

        return result
      }

      this.refreshingDeferred?.reject(error)
      throw error
    } finally {
      this.refreshingDeferred = null
    }
  }

  private _notifyAllSubscribers(event: AuthChangeEvent, session: Session | null) {
    this.stateChangeEmitters.forEach((x) => x.callback(event, session))
  }

  /**
   * set currentSession and currentUser
   * process to _startAutoRefreshToken if possible
   */
  private async _saveSession(session: Session) {
    if (!this.persistSession) {
      this.inMemorySession = session
    }

    const expiresAt = session.expires_at
    if (expiresAt) {
      const timeNow = Math.round(Date.now() / 1000)
      const expiresIn = expiresAt - timeNow
      const refreshDurationBeforeExpires = expiresIn > EXPIRY_MARGIN ? EXPIRY_MARGIN : 0.5
      this._startAutoRefreshToken((expiresIn - refreshDurationBeforeExpires) * 1000)
    }

    if (this.persistSession && session.expires_at) {
      await this._persistSession(session)
    }
  }

  private _persistSession(currentSession: Session) {
    return setItemAsync(this.storage, this.storageKey, currentSession)
  }

  private async _removeSession() {
    if (this.persistSession) {
      await removeItemAsync(this.storage, this.storageKey)
    } else {
      this.inMemorySession = null
    }

    if (this.refreshTokenTimer) {
      clearTimeout(this.refreshTokenTimer)
    }
  }

  /**
   * Clear and re-create refresh token timer
   * @param value time intervals in milliseconds.
   * @param session The current session.
   */
  private _startAutoRefreshToken(value: number) {
    if (this.refreshTokenTimer) clearTimeout(this.refreshTokenTimer)
    if (value <= 0 || !this.autoRefreshToken) return

    this.refreshTokenTimer = setTimeout(async () => {
      this.networkRetries++
      const {
        data: { session },
        error: sessionError,
      } = await this.getSession()
      if (!sessionError && session) {
        const { error } = await this._callRefreshToken(session.refresh_token)
        if (!error) this.networkRetries = 0
        if (
          error instanceof AuthRetryableFetchError &&
          this.networkRetries < NETWORK_FAILURE.MAX_RETRIES
        )
          this._startAutoRefreshToken(NETWORK_FAILURE.RETRY_INTERVAL ** this.networkRetries * 100) // exponential backoff
      }
    }, value)
    if (typeof this.refreshTokenTimer.unref === 'function') this.refreshTokenTimer.unref()
  }

  private _handleVisibilityChange() {
    if (!isBrowser() || !window?.addEventListener) {
      return false
    }

    try {
      window?.addEventListener('visibilitychange', async () => {
        if (document.visibilityState === 'visible') {
          await this.initializePromise
          await this._recoverAndRefresh()
        }
      })
    } catch (error) {
      console.error('_handleVisibilityChange', error)
    }
  }

  /**
   * Generates the relevant login URL for a third-party provider.
   * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
   * @param options.scopes A space-separated list of scopes granted to the OAuth application.
   * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
   */
  private _getUrlForProvider(
    provider: Provider,
    options: {
      redirectTo?: string
      scopes?: string
      queryParams?: { [key: string]: string }
    }
  ) {
    const urlParams: string[] = [`provider=${encodeURIComponent(provider)}`]
    if (options?.redirectTo) {
      urlParams.push(`redirect_to=${encodeURIComponent(options.redirectTo)}`)
    }
    if (options?.scopes) {
      urlParams.push(`scopes=${encodeURIComponent(options.scopes)}`)
    }
    if (options?.queryParams) {
      const query = new URLSearchParams(options.queryParams)
      urlParams.push(query.toString())
    }
    return `${this.url}/authorize?${urlParams.join('&')}`
  }

  private async _unenroll(params: MFAUnenrollParams): Promise<AuthMFAUnenrollResponse> {
    const { data: sessionData, error: sessionError } = await this.getSession()
    if (sessionError) {
      return { data: null, error: sessionError }
    }

    return await _request(this.fetch, 'DELETE', `${this.url}/factors/${params.factorId}`, {
      headers: this.headers,
      jwt: sessionData?.session?.access_token,
    })
  }

  /**
   * Deletes a registered factor from GoTrue
   * @param friendlyName Human readable name assigned to a device
   * @param factorType device which we're validating against. Can only be TOTP for now.
   * @param issuer domain which the user is enrolling with
   */
  private async _enroll(params: MFAEnrollParams): Promise<AuthMFAEnrollResponse> {
    const { data: sessionData, error: sessionError } = await this.getSession()
    if (sessionError) {
      return { data: null, error: sessionError }
    }

    const { data, error } = await _request(this.fetch, 'POST', `${this.url}/factors`, {
      body: {
        friendly_name: params.friendlyName,
        factor_type: params.factorType,
        issuer: params.issuer,
      },
      headers: this.headers,
      jwt: sessionData?.session?.access_token,
    })

    if (error) {
      return { data: null, error }
    }

    if (data?.totp?.qr_code) {
      data.totp.qr_code = `data:image/svg+xml;utf-8,${data.totp.qr_code}`
    }

    return { data, error: null }
  }

  /**
   * Validates a device as part of the enrollment step.
   * @param factorID System assigned identifier for authenticator device as returned by enroll
   * @param code Code Generated by an authenticator device
   */
  private async _verify(params: MFAVerifyParams): Promise<AuthMFAVerifyResponse> {
    const { data: sessionData, error: sessionError } = await this.getSession()
    if (sessionError) {
      return { data: null, error: sessionError }
    }

    const { data, error } = await _request(
      this.fetch,
      'POST',
      `${this.url}/factors/${params.factorId}/verify`,
      {
        body: { code: params.code, challenge_id: params.challengeId },
        headers: this.headers,
        jwt: sessionData?.session?.access_token,
      }
    )
    if (error) {
      return { data: null, error }
    }

    await this._saveSession({
      expires_at: Math.round(Date.now() / 1000) + data.expires_in,
      ...data,
    })
    this._notifyAllSubscribers('MFA_CHALLENGE_VERIFIED', data)

    return { data, error }
  }

  /**
   * Creates a challenge which a user can verify against
   * @param factorID System assigned identifier for authenticator device as returned by enroll
   */
  private async _challenge(params: MFAChallengeParams): Promise<AuthMFAChallengeResponse> {
    const { data: sessionData, error: sessionError } = await this.getSession()
    if (sessionError) {
      return { data: null, error: sessionError }
    }

    return await _request(this.fetch, 'POST', `${this.url}/factors/${params.factorId}/challenge`, {
      headers: this.headers,
      jwt: sessionData?.session?.access_token,
    })
  }
  private async _challengeAndVerify(
    params: MFAChallengeAndVerifyParams
  ): Promise<AuthMFAVerifyResponse> {
    const { data: challengeData, error: challengeError } = await this._challenge({
      factorId: params.factorId,
    })
    if (challengeError) {
      return { data: null, error: challengeError }
    }
    return await this._verify({
      factorId: params.factorId,
      challengeId: challengeData.id,
      code: params.code,
    })
  }

  /**
   * Displays all devices for a given user
   */
  private async _listFactors(): Promise<AuthMFAListFactorsResponse> {
    const {
      data: { user },
      error: userError,
    } = await this.getUser()
    if (userError) {
      return { data: null, error: userError }
    }

    const factors = user?.factors || []
    const totp = factors.filter(
      (factor) => factor.factor_type === 'totp' && factor.status === 'verified'
    )

    return {
      data: {
        all: factors,
        totp,
      },
      error: null,
    }
  }

  private async _getAuthenticatorAssuranceLevel(): Promise<AuthMFAGetAuthenticatorAssuranceLevelResponse> {
    const {
      data: { session },
      error: sessionError,
    } = await this.getSession()
    if (sessionError) {
      return { data: null, error: sessionError }
    }
    if (!session) {
      return {
        data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] },
        error: null,
      }
    }

    const payload = this._decodeJWT(session.access_token)

    let currentLevel: AuthenticatorAssuranceLevels | null = null

    if (payload.aal) {
      currentLevel = payload.aal
    }

    let nextLevel: AuthenticatorAssuranceLevels | null = currentLevel

    const verifiedFactors =
      session.user.factors?.filter((factor: Factor) => factor.status === 'verified') ?? []

    if (verifiedFactors.length > 0) {
      nextLevel = 'aal2'
    }

    const currentAuthenticationMethods = payload.amr || []

    return { data: { currentLevel, nextLevel, currentAuthenticationMethods }, error: null }
  }
}
