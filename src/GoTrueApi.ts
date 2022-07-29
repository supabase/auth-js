import { Fetch, FetchOptions, RequestMethodType, request } from './lib/fetch'
import {
  Session,
  Provider,
  AdminUserAttributes,
  UserAttributes,
  CookieOptions,
  User,
  OpenIDConnectCredentials,
  VerifyOTPParams,
} from './lib/types'
import { COOKIE_OPTIONS } from './lib/constants'
import { setCookies, getCookieString } from './lib/cookies'
import { expiresAt, resolveFetch } from './lib/helpers'

interface ClientFetchOptions extends FetchOptions {
  jwt?: string
  body?: object
  redirectTo?: string
  xerr?: (err: ApiError) => any
  xform?: (data: any) => any
  query?: { [key: string]: string }
}

import type { ApiError } from './lib/types'
export default class GoTrueApi {
  protected url: string
  protected headers: {
    [key: string]: string
  }
  protected cookieOptions: CookieOptions
  protected fetch: Fetch

  constructor({
    url = '',
    headers = {},
    cookieOptions,
    fetch,
  }: {
    url: string
    headers?: {
      [key: string]: string
    }
    cookieOptions?: CookieOptions
    fetch?: Fetch
  }) {
    this.url = url
    this.headers = headers
    this.cookieOptions = { ...COOKIE_OPTIONS, ...cookieOptions }
    this.fetch = resolveFetch(fetch)
  }

  private cookieName() {
    return this.cookieOptions.name ?? ''
  }

  /**
   * Generates the relevant login URL for a third-party provider.
   * @param provider One of the providers supported by GoTrue.
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   * @param scopes A space-separated list of scopes granted to the OAuth application.
   */
  getUrlForProvider(
    provider: Provider,
    options: {
      redirectTo?: string
      scopes?: string
      queryParams?: { [key: string]: string }
    }
  ) {
    const query = options?.queryParams ? options.queryParams : {}
    query['provider'] = provider

    if (options?.redirectTo) {
      query['redirect_to'] = options.redirectTo
    }
    if (options?.scopes) {
      query['scopes'] = options.scopes
    }
    const qs = new URLSearchParams(query).toString()
    return `${this.url}/authorize?${qs}`
  }

  /**
   * Creates a new user using their email address.
   * @param email The email address of the user.
   * @param password The password of the user.
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   * @param data Optional user metadata.
   * @param captchaToken Verification token received when the user completes the captcha on your site.
   *
   * @returns A logged-in session if the server has "autoconfirm" ON
   * @returns A user if the server has "autoconfirm" OFF
   */
  async signUpWithEmail(
    email: string,
    password: string,
    options: {
      redirectTo?: string
      data?: object
      captchaToken?: string
    } = {}
  ): Promise<{ data: Session | User | null; error: ApiError | null }> {
    return this._request('POST', `/signup`, {
      body: {
        email,
        password,
        data: options.data,
        gotrue_meta_security: { captcha_token: options.captchaToken },
      },
      xform: this._sessionResponse,
      redirectTo: options.redirectTo,
    })
  }

  /**
   * Logs in an existing user using their email address.
   * @param email The email address of the user.
   * @param password The password of the user.
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   * @param captchaToken Verification token received when the user completes the captcha on your site.
   */
  signInWithEmail(
    email: string,
    password: string,
    options: {
      redirectTo?: string
      captchaToken?: string
    } = {}
  ): Promise<{ data: Session | null; error: ApiError | null }> {
    return this._request('POST', '/token', {
      body: { email, password, gotrue_meta_security: { captcha_token: options.captchaToken } },
      xform: this._sessionResponse,
      redirectTo: options.redirectTo,
      query: { grant_type: 'password' },
    })
  }

  /**
   * Signs up a new user using their phone number and a password.
   * @param phone The phone number of the user.
   * @param password The password of the user.
   * @param data Optional user metadata.
   * @param captchaToken Verification token received when the user completes the captcha on your site.
   */
  signUpWithPhone(
    phone: string,
    password: string,
    options: {
      data?: object
      captchaToken?: string
    } = {}
  ): Promise<{ data: Session | User | null; error: ApiError | null }> {
    return this._request('POST', '/signup', {
      body: {
        phone,
        password,
        data: options.data,
        gotrue_meta_security: { captcha_token: options.captchaToken },
      },
      xform: this._sessionResponse,
    })
  }

  /**
   * Logs in an existing user using their phone number and password.
   * @param phone The phone number of the user.
   * @param password The password of the user.
   * @param captchaToken Verification token received when the user completes the captcha on your site.
   */
  signInWithPhone(
    phone: string,
    password: string,
    options: {
      captchaToken?: string
    } = {}
  ): Promise<{ data: Session | null; error: ApiError | null }> {
    return this._request('POST', '/token?grant_type=password', {
      body: { phone, password, gotrue_meta_security: { captcha_token: options.captchaToken } },
      xform: this._sessionResponse,
    })
  }

  /**
   * Logs in an OpenID Connect user using their id_token.
   * @param id_token The IDToken of the user.
   * @param nonce The nonce of the user. The nonce is a random value generated by the developer (= yourself) before the initial grant is started. You should check the OpenID Connect specification for details. https://openid.net/developers/specs/
   * @param provider The provider of the user.
   * @param client_id The clientID of the user.
   * @param issuer The issuer of the user.
   */
  signInWithOpenIDConnect({
    id_token,
    nonce,
    client_id,
    issuer,
    provider,
  }: OpenIDConnectCredentials): Promise<{ data: Session | null; error: ApiError | null }> {
    return this._request('POST', '/token?grant_type=id_token', {
      body: { id_token, nonce, client_id, issuer, provider },
      xform: this._sessionResponse,
    })
  }

  /**
   * Sends a magic login link to an email address.
   * @param email The email address of the user.
   * @param shouldCreateUser A boolean flag to indicate whether to automatically create a user on magiclink / otp sign-ins if the user doesn't exist. Defaults to true.
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   * @param captchaToken Verification token received when the user completes the captcha on your site.
   */
  sendMagicLinkEmail(
    email: string,
    options: {
      shouldCreateUser?: boolean
      redirectTo?: string
      captchaToken?: string
    } = {}
  ): Promise<{ data: {} | null; error: ApiError | null }> {
    const shouldCreateUser = options.shouldCreateUser ?? true
    return this._request('POST', '/otp', {
      body: {
        email,
        create_user: shouldCreateUser,
        gotrue_meta_security: { captcha_token: options.captchaToken },
      },
      redirectTo: options.redirectTo,
    })
  }

  /**
   * Sends a mobile OTP via SMS. Will register the account if it doesn't already exist
   * @param phone The user's phone number WITH international prefix
   * @param shouldCreateUser A boolean flag to indicate whether to automatically create a user on magiclink / otp sign-ins if the user doesn't exist. Defaults to true.
   * @param captchaToken Verification token received when the user completes the captcha on your site.
   */
  sendMobileOTP(
    phone: string,
    options: {
      shouldCreateUser?: boolean
      captchaToken?: string
    } = {}
  ): Promise<{ data: {} | null; error: ApiError | null }> {
    const shouldCreateUser = options.shouldCreateUser ?? true
    return this._request('POST', '/otp', {
      body: {
        phone,
        create_user: shouldCreateUser,
        gotrue_meta_security: { captcha_token: options.captchaToken },
      },
    })
  }

  /**
   * Removes a logged-in session.
   * @param jwt A valid, logged-in JWT.
   */
  signOut(jwt: string): Promise<{ error: ApiError | null }> {
    return this._request('POST', '/logout', {
      jwt: jwt,
      body: {},
      xform: (_: any) => {
        return { error: null }
      },
      noResolveJson: true,
    })
  }

  /**
   * @deprecated Use `verifyOTP` instead!
   * @param phone The user's phone number WITH international prefix
   * @param token token that user was sent to their mobile phone
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   */
  verifyMobileOTP(
    phone: string,
    token: string,
    options: {
      redirectTo?: string
    } = {}
  ): Promise<{ data: Session | User | null; error: ApiError | null }> {
    return this._request('POST', '/verify', {
      body: { phone, token, type: 'sms', redirect_to: options.redirectTo },
      xform: this._sessionResponse,
    })
  }

  /**
   * Send User supplied Email / Mobile OTP to be verified
   * @param email The user's email address
   * @param phone The user's phone number WITH international prefix
   * @param token token that user was sent to their mobile phone
   * @param type verification type that the otp is generated for
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   */
  verifyOTP(
    { email, phone, token, type = 'sms' }: VerifyOTPParams,
    options: {
      redirectTo?: string
    } = {}
  ): Promise<{ data: Session | User | null; error: ApiError | null }> {
    return this._request('POST', '/verify', {
      body: { email, phone, token, type, redirect_to: options.redirectTo },
      xform: this._sessionResponse,
    })
  }

  /**
   * Sends an invite link to an email address.
   * @param email The email address of the user.
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   * @param data Optional user metadata
   */
  inviteUserByEmail(
    email: string,
    options: {
      redirectTo?: string
      data?: object
    } = {}
  ): Promise<{ data: User | null; error: ApiError | null }> {
    return this._request('POST', '/invite', {
      body: { email, data: options.data },
      redirectTo: options.redirectTo,
    })
  }

  /**
   * Sends a reset request to an email address.
   * @param email The email address of the user.
   * @param redirectTo A URL or mobile address to send the user to after they are confirmed.
   * @param captchaToken Verification token received when the user completes the captcha on your site.
   */
  resetPasswordForEmail(
    email: string,
    options: {
      redirectTo?: string
      captchaToken?: string
    } = {}
  ): Promise<{ data: {} | null; error: ApiError | null }> {
    return this._request('POST', '/recover', {
      body: { email, gotrue_meta_security: { captcha_token: options.captchaToken } },
      redirectTo: options.redirectTo,
    })
  }

  /**
   * Generates a new JWT.
   * @param refreshToken A valid refresh token that was returned on login.
   */
  refreshAccessToken(
    refreshToken: string
  ): Promise<{ data: Session | null; error: ApiError | null }> {
    return this._request('POST', '/token?grant_type=refresh_token', {
      body: { refresh_token: refreshToken },
      xform: this._sessionResponse,
    })
  }

  /**
   * Set/delete the auth cookie based on the AuthChangeEvent.
   * Works for Next.js & Express (requires cookie-parser middleware).
   * @param req The request object.
   * @param res The response object.
   */
  setAuthCookie(req: any, res: any) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      res.status(405).end('Method Not Allowed')
    }
    const { event, session } = req.body

    if (!event) throw new Error('Auth event missing!')
    if (event === 'SIGNED_IN') {
      if (!session) throw new Error('Auth session missing!')
      setCookies(req, res, this._createSetAuthCookies(session.access_token, session.refresh_token))
    }
    if (event === 'SIGNED_OUT') {
      setCookies(req, res, this._createDeleteAuthCookies())
    }
    res.status(200).json({})
  }

  /**
   * Deletes the Auth Cookies and redirects to the
   * @param req The request object.
   * @param res The response object.
   * @param options Optionally specify a `redirectTo` URL in the options.
   */
  deleteAuthCookie(req: any, res: any, { redirectTo = '/' }: { redirectTo?: string }) {
    setCookies(req, res, this._createDeleteAuthCookies())
    return res.redirect(307, redirectTo)
  }

  /**
   * Helper method to generate the Auth Cookie string for you in case you can't use `setAuthCookie`.
   * @param req The request object.
   * @param res The response object.
   * @returns The Cookie string that needs to be set as the value for the `Set-Cookie` header.
   */
  getAuthCookieString(req: any, res: any): string[] {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      res.status(405).end('Method Not Allowed')
    }
    const { event, session } = req.body

    if (!event) throw new Error('Auth event missing!')
    if (event === 'SIGNED_IN') {
      if (!session) throw new Error('Auth session missing!')
      return getCookieString(
        req,
        res,
        this._createSetAuthCookies(session.access_token, session.refresh_token)
      )
    }
    if (event === 'SIGNED_OUT') {
      return getCookieString(req, res, this._createDeleteAuthCookies())
    }
    return res.getHeader('Set-Cookie')
  }

  /**
   * Generates links to be sent via email or other.
   * @param type The link type ("signup" or "magiclink" or "recovery" or "invite").
   * @param email The user's email.
   * @param password User password. For signup only.
   * @param data Optional user metadata. For signup only.
   * @param redirectTo The link type ("signup" or "magiclink" or "recovery" or "invite").
   */
  generateLink(
    type: 'signup' | 'magiclink' | 'recovery' | 'invite',
    email: string,
    options: {
      password?: string
      data?: object
      redirectTo?: string
    } = {}
  ): Promise<{ data: Session | User | null; error: ApiError | null }> {
    return this._request('POST', '/admin/generate_link', {
      body: {
        type,
        email,
        password: options.password,
        data: options.data,
        redirect_to: options.redirectTo,
      },
    })
  }

  // User Admin API

  /**
   * Creates a new user.
   *
   * This function should only be called on a server. Never expose your `service_role` key in the browser.
   *
   * @param attributes The data you want to create the user with.
   */
  createUser(
    attributes: AdminUserAttributes
  ): Promise<
    { user: null; data: null; error: ApiError } | { user: User; data: User; error: null }
  > {
    return this._request('POST', '/admin/users', {
      body: attributes,
      xform: this._userResponse,
      xerr: this._userResponseErr,
    })
  }

  /**
   * Get a list of users.
   *
   * This function should only be called on a server. Never expose your `service_role` key in the browser.
   */
  listUsers(): Promise<{ data: null; error: ApiError } | { data: User[]; error: null }> {
    return this._request('GET', '/admin/users', {
      xform: (data: any) => {
        return { data: data.users, error: null }
      },
    })
  }

  /**
   * Get user by id.
   *
   * @param uid The user's unique identifier
   *
   * This function should only be called on a server. Never expose your `service_role` key in the browser.
   */
  getUserById(uid: string): Promise<{ data: null; error: ApiError } | { data: User; error: null }> {
    return this._request('GET', `/admin/users/${uid}`)
  }

  /**
   * Get user by reading the cookie from the request.
   * Works for Next.js & Express (requires cookie-parser middleware).
   */
  async getUserByCookie(
    req: any,
    res?: any
  ): Promise<{
    token: string | null
    user: User | null
    data: User | null
    error: ApiError | null
  }> {
    try {
      if (!req.cookies) {
        throw new Error(
          'Not able to parse cookies! When using Express make sure the cookie-parser middleware is in use!'
        )
      }

      const access_token = req.cookies[`${this.cookieName()}-access-token`]
      const refresh_token = req.cookies[`${this.cookieName()}-refresh-token`]

      if (!access_token) {
        throw new Error('No cookie found!')
      }

      const { user, error: getUserError } = await this.getUser(access_token)
      if (getUserError) {
        if (!refresh_token) throw new Error('No refresh_token cookie found!')
        if (!res)
          throw new Error('You need to pass the res object to automatically refresh the session!')
        const { data, error } = await this.refreshAccessToken(refresh_token)
        if (error) {
          throw error
        } else if (data) {
          setCookies(req, res, this._createSetAuthCookies(data.access_token, data.refresh_token!))
          return { token: data.access_token, user: data.user, data: data.user, error: null }
        }
      }
      return { token: access_token, user: user, data: user, error: null }
    } catch (e) {
      return { token: null, user: null, data: null, error: e as ApiError }
    }
  }

  /**
   * Updates the user data.
   *
   * @param attributes The data you want to update.
   *
   * This function should only be called on a server. Never expose your `service_role` key in the browser.
   */
  updateUserById(
    uid: string,
    attributes: AdminUserAttributes
  ): Promise<{ user: User | null; data: User | null; error: ApiError | null }> {
    return this._request('PUT', `/admin/users/${uid}`, {
      body: attributes,
      xform: this._userResponse,
      xerr: this._userResponseErr,
    })
  }

  /**
   * Delete a user. Requires a `service_role` key.
   *
   * This function should only be called on a server. Never expose your `service_role` key in the browser.
   *
   * @param uid The user uid you want to remove.
   */
  deleteUser(
    uid: string
  ): Promise<{ user: User | null; data: User | null; error: ApiError | null }> {
    return this._request('DELETE', `/admin/users/${uid}`, {
      xform: this._userResponse,
      xerr: this._userResponseErr,
    })
  }

  /**
   * Gets the current user details.
   *
   * This method is called by the GoTrueClient `update` where
   * the jwt is set to this.currentSession.access_token
   * and therefore, acts like getting the currently authenticated user
   *
   * @param jwt A valid, logged-in JWT. Typically, the access_token for the currentSession
   */
  getUser(jwt: string): Promise<{ user: User | null; data: User | null; error: ApiError | null }> {
    return this._request('GET', '/user', {
      jwt: jwt,
      xform: this._userResponse,
      xerr: this._userResponseErr,
    })
  }
  /**
   * Updates the user data.
   * @param jwt A valid, logged-in JWT.
   * @param attributes The data you want to update.
   */
  updateUser(
    jwt: string,
    attributes: UserAttributes
  ): Promise<{ user: User | null; data: User | null; error: ApiError | null }> {
    return this._request('PUT', '/user', {
      jwt: jwt,
      body: attributes,
      xform: this._userResponse,
      xerr: this._userResponseErr,
    })
  }

  /**
   * Creates a list of objects that can be used with setCookies
   * or getCookieString to erase all auth cookies
   */
  private _createDeleteAuthCookies(): { name: string; value: ''; maxAge: -1 }[] {
    const cn = this.cookieName()
    return [
      { name: `${cn}-access-token`, value: '', maxAge: -1 },
      { name: `${cn}-refresh-token`, value: '', maxAge: -1 },
    ]
  }

  /**
   * Creates a list of objects that can be used with setCookies
   * or getCookieString to create all auth cookies
   * @param accessToken the access token value to store in the access token cookie
   * @param refreshToken the refresh token value to store in the refresh token cookie
   */
  private _createSetAuthCookies(
    accessToken: string,
    refreshToken: string
  ): {
    name: string
    value: string
    maxAge: number
    path?: string
    domain?: string
    sameSite?: string
  }[] {
    const cn = this.cookieName()
    const co = this.cookieOptions
    const base = {
      path: co.path,
      domain: co.domain,
      maxAge: co.lifetime ?? 0,
      sameSite: co.sameSite,
    }
    return [
      { ...base, ...{ name: `${cn}-access-token`, value: accessToken } },
      { ...base, ...{ name: `${cn}-refresh-token`, value: refreshToken } },
    ]
  }

  /**
   * Handles a successful response to an function that returns a session
   * ensuring that sessions are consistently handled.
   * @param data a session object
   */
  private _sessionResponse(data: any): { data: Session; error: null } {
    const session = { ...data }
    if (session.expires_in) session.expires_at = expiresAt(data.expires_in)
    return { data: session, error: null }
  }

  /**
   * Handles a success response for a user-returning function
   * Unlike most other responses, these copy the `data` field to
   * a `user` field
   * @param data the user response
   */
  private _userResponse(data: any): { data: User; user: User; error: null } {
    return { data: data, user: data, error: null }
  }

  /**
   * Handles an error response for a user-returning function
   * Unlike most other responses, these return a `user: null`
   * field in addition to `data: null`.
   * @param error an api error
   */
  private _userResponseErr(error: ApiError): { data: null; user: null; error: ApiError } {
    return { data: null, user: null, error: error }
  }

  /**
   * Sends the request to the underlying fetch library. Converts any API exception
   * into an error result.
   * @param method method to use
   * @param path path to send request to
   * @param cb optional callback to transform the successful response data
   * @param options optional option to pass to the underlying fetch library (e.g. headers)
   * @param body body to send
   */
  private async _request(
    method: RequestMethodType,
    path: string,
    options: ClientFetchOptions = {}
  ): Promise<any> {
    if (options.headers === undefined) {
      options.headers = { ...this.headers }
    }

    if (options.jwt) {
      options.headers['Authorization'] = `Bearer ${options.jwt}`
    }

    let qs = options.query
    if (options.redirectTo) {
      if (qs === undefined) qs = {}
      qs['redirect_to'] = options.redirectTo
    }
    const queryString = qs ? '?' + new URLSearchParams(qs).toString() : ''

    try {
      const data = await request(
        this.fetch,
        method,
        this.url + path + queryString,
        options,
        options.body
      )
      return options.xform ? options.xform(data) : { data: data, error: null }
    } catch (e) {
      return options.xerr ? options.xerr(e as ApiError) : { data: null, error: e as ApiError }
    }
  }
}
