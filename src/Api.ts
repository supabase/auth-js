import { get, post } from './lib/fetch'

export default class Api {
  url: string
  headers: {
    [key: string]: string
  }

  constructor({ url = '', headers = {} }: any) {
    this.url = url
    this.headers = headers
  }

  signUpWithEmail(email: string, password: string) {
    return post(`${this.url}/signup`, { email, password }, { headers: this.headers })
  }

  signInWithEmail(email: string, password: string) {
    return post(
      `${this.url}/token?grant_type=password`,
      { email, password },
      { headers: this.headers }
    )
  }

  resetPasswordForEmail(email: string) {
    return post(`${this.url}/forgotPassword`, { email }, { headers: this.headers })
  }

  signOut(jwt: string) {
    let headers = { ...this.headers }
    headers['Authorization'] = `Bearer ${jwt}`
    return get(`${this.url}/logout`, { headers })
  }

  getUser(jwt: string) {
    let headers = { ...this.headers }
    headers['Authorization'] = `Bearer ${jwt}`
    return get(`${this.url}/user`, { headers })
  }

  refreshToken(refreshToken: string) {
    return post(
      `${this.url}/token?grant_type=refresh_token`,
      { refresh_token: refreshToken },
      { headers: this.headers }
    )
  }

  settings() {
    return get(`${this.url}/settings`, { headers: this.headers })
  }
}
