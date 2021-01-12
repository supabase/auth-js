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
} from './lib/types'

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
   * @param credentials The user login details.
   * @param credentials.email The user's email address.
   * @param credentials.password The user's password.
   */
  async signUp(credentials: {
    email: string
    password: string
  }): Promise<{ data: Session | null; user: User | null; error: Error | null }> {
    try {
      this._removeSession()

      let { data, error } = await this.api.signUpWithEmail(credentials.email, credentials.password)
      if (error) throw error

      if (data?.user?.confirmed_at) {
        this._saveSession(data)
        this._notifyAllSubscribers('SIGNED_IN')
      }

      return { data, user: data?.user ?? null, error: null }
    } catch (error) {
      return { data: null, user: null, error }
    }
  }

  /**
   * Log in an existing user, or login via a third-party provider.
   * @param credentials The user login details.
   * @param credentials.email The user's email address.
   * @param credentials.password The user's password.
   * @param credentials.provider One of the providers supported by GoTrue.
   */
  async signIn(credentials: {
    email?: string
    password?: string
    provider?: Provider
  }): Promise<{
    data: Session | null
    user: User | null
    provider?: Provider
    url?: string | null
    error: Error | null
  }> {
    try {
      this._removeSession()
      const { email, password, provider } = credentials
      if (email && !password) {
        const { error } = await this.api.sendMagicLinkEmail(email)
        return { data: null, user: null, error }
      }
      if (email && password) return this._handleEmailSignIn(email, password)
      if (provider) return this._handleProviderSignIn(provider)
      else throw new Error(`You must provide either an email or a third-party provider.`)
    } catch (error) {
      return { data: null, user: null, error }
    }
  }

  /**
   * Returns the user data, if there is a logged in user.
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

      await this._callRefreshToken()

      let { data, error } = await this.api.getUser(this.currentSession.access_token)
      if (error) throw error

      this.currentUser = data
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

      let { data, error } = await this.api.updateUser(this.currentSession.access_token, attributes)
      if (error) throw error

      this.currentUser = data
      this._notifyAllSubscribers('USER_UPDATED')

      return { data, user: this.currentUser, error: null }
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

      const access_token = getParameterByName('access_token')
      const expires_in = getParameterByName('expires_in')
      const refresh_token = getParameterByName('refresh_token')
      const token_type = getParameterByName('token_type')
      if (!access_token) throw new Error('No access_token detected.')
      if (!expires_in) throw new Error('No expires_in detected.')
      if (!refresh_token) throw new Error('No refresh_token detected.')
      if (!token_type) throw new Error('No token_type detected.')

      const { user, error } = await this.api.getUser(access_token)
      if (error) throw error

      const session: Session = {
        access_token,
        expires_in: parseInt(expires_in),
        refresh_token,
        token_type,
        user: user!,
      }
      if (options?.storeSession) {
        this._saveSession(session)
        this._notifyAllSubscribers('SIGNED_IN')
      }
      // Remove tokens from URL
      window.location.hash = ''

      return { data: session, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  /**
   * Signs out the current user, if there is a logged in user.
   */
  async signOut(): Promise<{ error: Error | null }> {
    if (this.currentSession) {
      const { error } = await this.api.signOut(this.currentSession.access_token)
      if (error) return { error }
    }
    this._removeSession()
    this._notifyAllSubscribers('SIGNED_OUT')
    return { error: null }
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
      let self = this
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

  private async _handleEmailSignIn(email: string, password: string) {
    try {
      let { data, error } = await this.api.signInWithEmail(email, password)
      if (error || !data) return { data: null, user: null, error }

      if (data?.user?.confirmed_at) {
        this._saveSession(data)
        this._notifyAllSubscribers('SIGNED_IN')
      }

      return { data, user: data.user, error: null }
    } catch (error) {
      return { data: null, user: null, error }
    }
  }

  private _handleProviderSignIn(provider: Provider) {
    let url: string = this.api.getUrlForProvider(provider)

    try {
      // try to open on the browser
      if (isBrowser()) {
        window.location.href = url
      }
      return { provider, url, data: null, user: null, error: null }
    } catch (error) {
      // fallback to returning the URL
      if (!!url) return { provider, url, data: null, user: null, error: null }
      else return { data: null, user: null, error }
    }
  }

  private _saveSession(session: Session) {
    this.currentSession = session
    this.currentUser = session.user
    let tokenExpirySeconds = session['expires_in']

    if (this.autoRefreshToken && tokenExpirySeconds) {
      setTimeout(this._callRefreshToken, (tokenExpirySeconds - 60) * 1000)
    }

    if (this.persistSession) {
      this._persistSession(this.currentSession, tokenExpirySeconds)
    }
  }

  private _persistSession(currentSession: Session, secondsToExpiry: number) {
    const timeNow = Math.round(Date.now() / 1000)
    const expiresAt = timeNow + secondsToExpiry
    const data = { currentSession, expiresAt }
    isBrowser() && this.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  private async _removeSession() {
    this.currentSession = null
    this.currentUser = null
    isBrowser() && (await this.localStorage.removeItem(STORAGE_KEY))
  }

  private async _recoverSession() {
    // Note: this method is async to accommodate for AsyncStorage e.g. in React native.
    const json = isBrowser() && (await this.localStorage.getItem(STORAGE_KEY))
    if (json) {
      try {
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
          this.currentSession = currentSession
          this.currentUser = currentSession.user
          this._notifyAllSubscribers('SIGNED_IN')
          // schedule a refresh 60 seconds before token due to expire
          setTimeout(this._callRefreshToken, (expiresAt - timeNow - 60) * 1000)
        }
      } catch (err) {
        console.error(err)
        return null
      }
    }
    return null
  }

  private async _callRefreshToken(refresh_token = this.currentSession?.refresh_token) {
    try {
      if (refresh_token) {
        const { data, error } = await this.api.refreshAccessToken(refresh_token)

        if (data?.access_token) {
          this.currentSession = data as Session
          this.currentUser = this.currentSession.user
          this._notifyAllSubscribers('SIGNED_IN')
          const tokenExpirySeconds = data.expires_in

          if (this.autoRefreshToken && tokenExpirySeconds) {
            setTimeout(this._callRefreshToken, (tokenExpirySeconds - 60) * 1000)
          }

          if (this.persistSession && this.currentUser) {
            this._persistSession(this.currentSession, tokenExpirySeconds)
          }
        } else {
          throw error
        }
        return { data, error: null }
      } else {
        throw new Error('No current session.')
      }
    } catch (error) {
      return { data: null, error }
    }
  }

  private _notifyAllSubscribers(event: AuthChangeEvent) {
    this.stateChangeEmitters.forEach((x) => x.callback(event, this.currentSession))
  }
}
