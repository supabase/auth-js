import { isBrowser } from './lib/helpers'
import { STORAGE_KEY } from './lib/constants'
import { GOTRUE_URL, DEFAULT_HEADERS } from './lib/constants'
import Api from './Api'

interface Session {
  access_token: string
  expires_in: number
  refresh_token: string
  token_type: string
  user: User
}
interface User {
  id: string
  app_metadata: any
  user_metadata: any
  aud: string
  email?: string
  created_at: string
  confirmed_at?: string
  last_sign_in_at?: string
  role?: string
  updated_at?: string
}
export default class Client {
  api: Api
  currentUser: User | null
  currentSession?: Session | null
  autoRefreshToken: boolean
  persistSession: boolean

  constructor({
    url = GOTRUE_URL,
    autoRefreshToken = true,
    persistSession = true,
    headers = DEFAULT_HEADERS,
  }: any) {
    this.currentUser = null
    this.currentSession = null
    this.autoRefreshToken = autoRefreshToken
    this.persistSession = persistSession
    this.api = new Api({ url, headers })
    this._recoverSession()
  }

  async signUp({ email, password }: { email: string; password: string }) {
    try {
      this._removeSavedSession() // clean out the old session before attempting

      let data: any = await this.api.signUpWithEmail(email, password)

      if (data?.user?.confirmed_at) {
        let session: Session = data
        this.currentSession = session
        this.currentUser = session['user']
        let tokenExpirySeconds = session['expires_in']
        if (this.autoRefreshToken && tokenExpirySeconds) {
          setTimeout(this._callRefreshToken, (tokenExpirySeconds - 60) * 1000)
        }
        if (this.persistSession) {
          this._saveSession(this.currentSession, this.currentUser, tokenExpirySeconds)
        }
      }
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.toString() }
    }
  }

  async signIn({ email, password }: { email: string; password: string }) {
    try {
      this._removeSavedSession() // clean out the old session before attempting

      let data: any = await this.api.signInWithEmail(email, password)
      console.log('data', data)
      if (data?.user?.confirmed_at) {
        let session: Session = data
        this.currentSession = session
        this.currentUser = session['user']
        let tokenExpirySeconds = data['expires_in']
        if (this.autoRefreshToken && tokenExpirySeconds)
          setTimeout(this._callRefreshToken, (tokenExpirySeconds - 60) * 1000)
        if (this.persistSession) {
          this._saveSession(this.currentSession, this.currentUser, tokenExpirySeconds)
        }
      }
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.toString() }
    }
  }

  async user(jwt?: string) {
    try {
      let accessToken = jwt || this.currentSession?.access_token || ''
      let data: any = await this.api.getUser(accessToken)

      if (!data.id) {
        return { data: null, error: 'User not found' }
      }

      this.currentUser = data
      return { data: this.currentUser, error: null }
    } catch (error) {
      return { data: null, error: error.toString() }
    }
  }

  async signOut() {
    if (this.currentSession) {
      await this.api.signOut(this.currentSession.access_token)
    }
    this._removeSavedSession()
  }

  _saveSession(currentSession: Session, currentUser: User, secondsToExpiry: number) {
    const timeNow = Math.round(Date.now() / 1000)
    const expiresAt = timeNow + secondsToExpiry
    const data = { currentSession, currentUser, expiresAt }
    isBrowser() && localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  _removeSavedSession() {
    this.currentSession = null
    this.currentUser = null
    isBrowser() && localStorage.removeItem(STORAGE_KEY)
  }

  _recoverSession() {
    const json = isBrowser() && localStorage.getItem(STORAGE_KEY)
    if (json) {
      try {
        const data = JSON.parse(json)
        const { currentSession, currentUser, expiresAt } = data

        const timeNow = Math.round(Date.now() / 1000)
        if (expiresAt < timeNow) {
          console.log('Saved session has expired.')
          this._removeSavedSession()
        } else {
          this.currentSession = currentSession
          this.currentUser = currentUser
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

  async _callRefreshToken() {
    try {
      if (this.currentSession?.refresh_token) {
        let data: any = await this.api.refreshToken(this.currentSession?.refresh_token)

        if (data?.access_token) {
          this.currentSession.access_token = data.body['access_token']
          this.currentSession.refresh_token = data.body['refresh_token']
          let tokenExpirySeconds = data.body['expires_in']
          if (this.autoRefreshToken && tokenExpirySeconds)
            setTimeout(this._callRefreshToken, (tokenExpirySeconds - 60) * 1000)
          if (this.persistSession && this.currentUser) {
            this._saveSession(this.currentSession, this.currentUser, tokenExpirySeconds)
          }
        }
        return { data, error: null }
      }
    } catch (error) {
      return { data: null, error: error.toString() }
    }
  }
}
