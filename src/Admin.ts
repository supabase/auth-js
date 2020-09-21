import { get } from './lib/fetch'
import { AdminConfig } from './Admin.types'

export default class Admin {
  url: string
  headers: AdminConfig['headers'] = {}

  /**
   * Creates a GoTrue instance for admin interactions.
   *
   * @param url  URL of the GoTrue instance.
   * @param headers  Custom headers.
   */
  constructor(url: string, options?: AdminConfig) {
    this.url = url
    if (options?.headers) {
      this.headers = { ...this.headers, ...options.headers }
    }
  }

  /**
   * Creates a new user account for your business or project.
   */
  async settings() {
    try {
      let data: any = await get(`${this.url}/settings`, { headers: this.headers })

      if (!data.external) {
        return { data: null, error: data.msg }
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error.toString() }
    }
  }
}
