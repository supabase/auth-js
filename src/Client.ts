import { uuid } from './lib/helpers'
import { post } from './lib/fetch'
import { ClientConfig, UserCredentials, Subscription, UserEvents } from './Client.types'

export default class Client {
  url: string
  headers: ClientConfig['headers'] = {}
  stateChangeEmitters: Map<string, Subscription> = new Map()

  /**
   * Creates a GoTrue instance for admin interactions.
   *
   * @param url  URL of the GoTrue instance.
   * @param headers  Custom headers.
   */
  constructor(url: string, options?: ClientConfig) {
    this.url = url
    if (options?.headers) {
      this.headers = { ...this.headers, ...options.headers }
    }
  }

  /**
   * Creates a new user account for your business or project.
   */
  async signUp(credentials: UserCredentials) {
    try {
      let data: any = await post(
        `${this.url}/signup`,
        { email: credentials.email, password: credentials.password },
        { headers: this.headers }
      )

      if (!data.id) {
          console.log('data', data)
        return { data: null, error: data.msg || data.message }
      }

      handleEventChanged(UserEvents.SIGN_UP, this.stateChangeEmitters)
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.toString() }
    }
  }

  /**
   * Allows existing users to log into your system.
   */
  async signIn(credentials: UserCredentials) {
    try {
      let data: any = await post(
        `${this.url}/token?grant_type=password`,
        { email: credentials.email, password: credentials.password },
        { headers: this.headers }
      )

      if (!data.access_token) {
        return { data: null, error: data.msg || data.message }
      }

      handleEventChanged(UserEvents.SIGN_UP, this.stateChangeEmitters)
      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.toString() }
    }
  }

  /**
   * Allows existing users to log into your system.
   */
  signOut() {
    handleEventChanged(UserEvents.SIGN_OUT, this.stateChangeEmitters)
    return null
  }

  /**
   * Sends a temporary password to a user's email address.
   */
  forgotPassword() {
    return null
  }

  /**
   * Register a single .
   * @returns {Subscription} A subscription object which can be used to unsubcribe itself.
   */
  onAuthStateChange(callback: Function): Subscription {
    const id: string = uuid()
    let self = this
    const subscription: Subscription = {
      id,
      callback,
      unsubscribe: () => self.stateChangeEmitters.delete(id),
    }
    this.stateChangeEmitters.set(id, subscription)
    return subscription
  }
}

const handleEventChanged = (
  eventType: UserEvents,
  stateChangeEmitters: Map<string, Subscription>
) => {
  for (let subscription of stateChangeEmitters.values()) {
    subscription.callback(eventType)
  }
}
