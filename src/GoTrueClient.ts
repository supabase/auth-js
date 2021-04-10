import GoTrueApi from './GoTrueApi'
import { isBrowser, getParameterByName, uuid, LocalStorage } from './lib/helpers'
import { GOTRUE_URL, DEFAULT_HEADERS, STORAGE_KEY } from './lib/constants'
import {
  Session,
  User,
  UserAttributes,
  Provider,
  Subscription,
  AuthChangeEvent,
  CookieOptions,
  UserCredentials,
} from './lib/types'
import { polyfillGlobalThis } from './lib/polyfills'

polyfillGlobalThis() // Make "globalThis" available

const DEFAULT_OPTIONS = {
  url: GOTRUE_URL,
  autoRefreshToken: true,
  persistSession: true,
  localStorage: globalThis.localStorage,
  detectSessionInUrl: true,
  headers: DEFAULT_HEADERS,
}
export default class GoTrueClient {
  /**
   * Namespace for the GoTrue API methods.
   * These can be used for example to get a user from a JWT in a server environment or reset a user's password.
   */
  api: GoTrueApi
  /**
   * The currently logged in user or null.
   */
  protected currentUser: User | null
  /**
   * The session object for the currently logged in user or null.
   */
  protected currentSession: Session | null

  protected autoRefreshToken: boolean
  protected persistSession: boolean
  protected localStorage: Storage
  protected stateChangeEmitters: Map<string, Subscription> = new Map()
  protected refreshTokenTimer?: ReturnType<typeof setTimeout>

  /**
   * Create a new client for use in the browser.
   * @param options.url The URL of the GoTrue server.
   * @param options.headers Any additional headers to send to the GoTrue server.
   * @param options.detectSessionInUrl Set to "true" if you want to automatically detects OAuth grants in the URL and signs in the user.
   * @param options.autoRefreshToken Set to "true" if you want to automatically refresh the token before expiring.
   * @param options.persistSession Set to "true" if you want to automatically save the user session into local storage.
   * @param options.localStorage
   */
  constructor(options: {
    url?: string
    headers?: { [key: string]: string }
    detectSessionInUrl?: boolean
    autoRefreshToken?: boolean
    persistSession?: boolean
    localStorage?: Storage
    cookieOptions?: CookieOptions
  }) {
    const settings = { ...DEFAULT_OPTIONS, ...options }
    this.currentUser = null
    this.currentSession = null
    this.autoRefreshToken = settings.autoRefreshToken
    this.persistSession = settings.persistSession
    this.localStorage = new LocalStorage(settings.localStorage)
    this.api = new GoTrueApi({
      url: settings.url,
      headers: settings.headers,
      cookieOptions: settings.cookieOptions,
    })
    this._recoverSession()
    this._recoverAndRefresh()

    // Handle the OAuth redirect
    try {
      if (settings.detectSessionInUrl && isBrowser() && !!getParameterByName('access_token')) {
        this.getSessionFromUrl({ storeSession: true })
      }
    } catch (error) {
      console.log('Error getting session from URL.')
    }
  }

  /**
   * Creates a new user.
   * @type UserCredentials
   * @param email The user's email address.
   * @param password The user's password.
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   */
  async signUp(
    { email, password }: UserCredentials,
    options: {
      redirectTo?: string
    } = {}
  ): Promise<{
    user: User | null
    session: Session | null
    error: Error | null
    data: Session | User | null // Deprecated
  }> {
    try {
      this._removeSession()

      const { data, error } = await this.api.signUpWithEmail(email!, password!, {
        redirectTo: options.redirectTo,
      })

      if (error) {
        throw error
      }

      if (!data) {
        throw 'An error occurred on sign up.'
      }

      let session: Session | null = null
      let user: User | null = null

      if ((data as Session).access_token) {
        session = data as Session
        user = session.user as User
        this._saveSession(session)
        this._notifyAllSubscribers('SIGNED_IN')
      }

      if ((data as User).id) {
        user = data as User
      }

      return { data, user, session, error: null }
    } catch (error) {
      return { data: null, user: null, session: null, error }
    }
  }

  /**
   * Log in an existing user, or login via a third-party provider.
   * @type UserCredentials
   * @param email The user's email address.
   * @param password The user's password.
   * @param provider One of the providers supported by GoTrue.
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   * @param scopes A space-separated list of scopes granted to the OAuth application.
   */
  async signIn(
    { email, password, provider }: UserCredentials,
    options: {
      redirectTo?: string
      scopes?: string
    } = {}
  ): Promise<{
    session: Session | null
    user: User | null
    provider?: Provider
    url?: string | null
    error: Error | null
    data: Session | null // Deprecated
  }> {
    try {
      this._removeSession()

      if (email && !password) {
        const { error } = await this.api.sendMagicLinkEmail(email, {
          redirectTo: options.redirectTo,
        })
        return { data: null, user: null, session: null, error }
      }
      if (email && password) {
        return this._handleEmailSignIn(email, password, {
          redirectTo: options.redirectTo,
        })
      }
      if (provider) {
        return this._handleProviderSignIn(provider, {
          redirectTo: options.redirectTo,
          scopes: options.scopes,
        })
      }
      throw new Error(`You must provide either an email or a third-party provider.`)
    } catch (error) {
      return { data: null, user: null, session: null, error }
    }
  }

  /**
   * Inside a browser context, `user()` will return the user data, if there is a logged in user.
   *
   * For server-side management, you can get a user through `auth.api.getUserByCookie()`
   */
  user(): User | null {
    return this.currentUser
  }

  /**
   * Returns the session data, if there is an active session.
   */
  session(): Session | null {
    return this.currentSession
  }

  /**
   * Force refreshes the session including the user data in case it was updated in a different session.
   */
  async refreshSession(): Promise<{
    data: Session | null
    user: User | null
    error: Error | null
  }> {
    try {
      if (!this.currentSession?.access_token) throw new Error('Not logged in.')

      // currentSession and currentUser will be updated to latest on _callRefreshToken
      const { error } = await this._callRefreshToken()
      if (error) throw error

      return { data: this.currentSession, user: this.currentUser, error: null }
    } catch (error) {
      return { data: null, user: null, error }
    }
  }

  /**
   * Updates user data, if there is a logged in user.
   */
  async update(
    attributes: UserAttributes
  ): Promise<{ data: User | null; user: User | null; error: Error | null }> {
    try {
      if (!this.currentSession?.access_token) throw new Error('Not logged in.')

      const { user, error } = await this.api.updateUser(
        this.currentSession.access_token,
        attributes
      )
      if (error) throw error
      if (!user) throw Error('Invalid user data.')

      const session = { ...this.currentSession, user }
      this._saveSession(session)
      this._notifyAllSubscribers('USER_UPDATED')

      return { data: user, user, error: null }
    } catch (error) {
      return { data: null, user: null, error }
    }
  }

  /**
   * Gets the session data from a URL string
   * @param options.storeSession Optionally store the session in the browser
   */
  async getSessionFromUrl(options?: {
    storeSession?: boolean
  }): Promise<{ data: Session | null; error: Error | null }> {
    try {
      if (!isBrowser()) throw new Error('No browser detected.')

      const error_description = getParameterByName('error_description')
      if (error_description) throw new Error(error_description)

      const provider_token = getParameterByName('provider_token')
      const access_token = getParameterByName('access_token')
      if (!access_token) throw new Error('No access_token detected.')
      const expires_in = getParameterByName('expires_in')
      if (!expires_in) throw new Error('No expires_in detected.')
      const refresh_token = getParameterByName('refresh_token')
      if (!refresh_token) throw new Error('No refresh_token detected.')
      const token_type = getParameterByName('token_type')
      if (!token_type) throw new Error('No token_type detected.')

      const timeNow = Math.round(Date.now() / 1000)
      const expires_at = timeNow + parseInt(expires_in)

      const { user, error } = await this.api.getUser(access_token)
      if (error) throw error

      const session: Session = {
        provider_token,
        access_token,
        expires_in: parseInt(expires_in),
        expires_at,
        refresh_token,
        token_type,
        user: user!,
      }
      if (options?.storeSession) {
        this._saveSession(session)
        this._notifyAllSubscribers('SIGNED_IN')
        if (getParameterByName('type') === 'recovery') {
          this._notifyAllSubscribers('PASSWORD_RECOVERY')
        }
      }
      // Remove tokens from URL
      window.location.hash = ''

      return { data: session, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Inside a browser context, `signOut()` will remove extract the logged in user from the browser session
   * and log them out - removing all items from localstorage and then trigger a "SIGNED_OUT" event.
   *
   * For server-side management, you can disable sessions by passing a JWT through to `auth.api.signOut(JWT: string)`
   */
  async signOut(): Promise<{ error: Error | null }> {
    const accessToken = this.currentSession?.access_token
    this._removeSession()
    this._notifyAllSubscribers('SIGNED_OUT')
    if (accessToken) {
      const { error } = await this.api.signOut(accessToken)
      if (error) {
        return { error }
      } else {
        return { error: null }
      }
    }
    return { error: null };
  }

  /**
   * Receive a notification every time an auth event happens.
   * @returns {Subscription} A subscription object which can be used to unsubscribe itself.
   */
  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): { data: Subscription | null; error: Error | null } {
    try {
      const id: string = uuid()
      const self = this
      const subscription: Subscription = {
        id,
        callback,
        unsubscribe: () => {
          self.stateChangeEmitters.delete(id)
        },
      }
      this.stateChangeEmitters.set(id, subscription)
      return { data: subscription, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  private async _handleEmailSignIn(
    email: string,
    password: string,
    options: {
      redirectTo?: string
    } = {}
  ) {
    try {
      const { data, error } = await this.api.signInWithEmail(email, password, {
        redirectTo: options.redirectTo,
      })
      if (error || !data) return { data: null, user: null, session: null, error }

      if (data?.user?.confirmed_at) {
        this._saveSession(data)
        this._notifyAllSubscribers('SIGNED_IN')
      }

      return { data, user: data.user, session: data, error: null }
    } catch (error) {
      return { data: null, user: null, session: null, error }
    }
  }

  private _handleProviderSignIn(
    provider: Provider,
    options: {
      redirectTo?: string
      scopes?: string
    } = {}
  ) {
    const url: string = this.api.getUrlForProvider(provider, {
      redirectTo: options.redirectTo,
      scopes: options.scopes,
    })

    try {
      // try to open on the browser
      if (isBrowser()) {
        window.location.href = url
      }
      return { provider, url, data: null, session: null, user: null, error: null }
    } catch (error) {
      // fallback to returning the URL
      if (!!url) return { provider, url, data: null, session: null, user: null, error: null }
      return { data: null, user: null, session: null, error }
    }
  }

  /**
   * Attempts to get the session from LocalStorage
   * Note: this should never be async (even for React Native), as we need it to return immediately in the constructor.
   */
  private _recoverSession() {
    try {
      const json = isBrowser() && this.localStorage?.getItem(STORAGE_KEY)
      if (!json) {
        return null
      }

      const data = JSON.parse(json)
      const { currentSession, expiresAt } = data
      const timeNow = Math.round(Date.now() / 1000)

      if (expiresAt >= timeNow && currentSession?.user) {
        this._saveSession(currentSession)
        this._notifyAllSubscribers('SIGNED_IN')
      }
    } catch (error) {
      console.log('error', error)
    }
  }

  /**
   * Recovers the session from LocalStorage and refreshes
   * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
   */
  private async _recoverAndRefresh() {
    try {
      const json = isBrowser() && (await this.localStorage.getItem(STORAGE_KEY))
      if (!json) {
        return null
      }

      const data = JSON.parse(json)
      const { currentSession, expiresAt } = data
      const timeNow = Math.round(Date.now() / 1000)

      if (expiresAt < timeNow) {
        if (this.autoRefreshToken && currentSession.refresh_token) {
          const { error } = await this._callRefreshToken(currentSession.refresh_token)
          if (error) {
            console.log(error.message)
            await this._removeSession()
          }
        } else {
          this._removeSession()
        }
      } else if (!currentSession || !currentSession.user) {
        console.log('Current session is missing data.')
        this._removeSession()
      } else {
        // should be handle on _recoverSession method already
        // this._saveSession(currentSession)
        // this._notifyAllSubscribers('SIGNED_IN')
      }
    } catch (err) {
      console.error(err)
      return null
    }
  }

  private async _callRefreshToken(refresh_token = this.currentSession?.refresh_token) {
    try {
      if (!refresh_token) {
        throw new Error('No current session.')
      }
      const { data, error } = await this.api.refreshAccessToken(refresh_token)
      if (error) throw error
      if (!data) throw Error('Invalid session data.')

      this._saveSession(data)
      this._notifyAllSubscribers('SIGNED_IN')

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  private _notifyAllSubscribers(event: AuthChangeEvent) {
    this.stateChangeEmitters.forEach((x) => x.callback(event, this.currentSession))
  }

  /**
   * set currentSession and currentUser
   * process to _startAutoRefreshToken if possible
   */
  private _saveSession(session: Session) {
    this.currentSession = session
    this.currentUser = session.user

    const expiresAt = session.expires_at
    const timeNow = Math.round(Date.now() / 1000)
    if (expiresAt) this._startAutoRefreshToken((expiresAt - timeNow - 60) * 1000)

    // Do we need any extra check before persist session
    // access_token or user ?
    if (this.persistSession && session.expires_at) {
      this._persistSession(this.currentSession)
    }
  }

  private _persistSession(currentSession: Session) {
    const data = { currentSession, expiresAt: currentSession.expires_at }
    isBrowser() && this.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  private async _removeSession() {
    this.currentSession = null
    this.currentUser = null
    if (this.refreshTokenTimer) clearTimeout(this.refreshTokenTimer)
    isBrowser() && (await this.localStorage.removeItem(STORAGE_KEY))
  }

  /**
   * Clear and re-create refresh token timer
   * @param value time intervals in milliseconds
   */
  private _startAutoRefreshToken(value: number) {
    if (this.refreshTokenTimer) clearTimeout(this.refreshTokenTimer)
    if (!value || !this.autoRefreshToken) return

    this.refreshTokenTimer = setTimeout(() => this._callRefreshToken(), value)
  }
}
