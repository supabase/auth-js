"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GoTrueAdminApi_1 = __importDefault(require("./GoTrueAdminApi"));
const constants_1 = require("./lib/constants");
const errors_1 = require("./lib/errors");
const fetch_1 = require("./lib/fetch");
const helpers_1 = require("./lib/helpers");
const local_storage_1 = __importDefault(require("./lib/local-storage"));
const polyfills_1 = require("./lib/polyfills");
(0, polyfills_1.polyfillGlobalThis)(); // Make "globalThis" available
const DEFAULT_OPTIONS = {
    url: constants_1.GOTRUE_URL,
    storageKey: constants_1.STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    headers: constants_1.DEFAULT_HEADERS,
};
class GoTrueClient {
    /**
     * Create a new client for use in the browser.
     */
    constructor(options) {
        this.stateChangeEmitters = new Map();
        this.networkRetries = 0;
        this.refreshingDeferred = null;
        /**
         * Keeps track of the async client initialization.
         * When null or not yet resolved the auth state is `unknown`
         * Once resolved the the auth state is known and it's save to call any further client methods.
         * Keep extra care to never reject or throw uncaught errors
         */
        this.initializePromise = null;
        this.detectSessionInUrl = true;
        const settings = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        this.inMemorySession = null;
        this.storageKey = settings.storageKey;
        this.autoRefreshToken = settings.autoRefreshToken;
        this.persistSession = settings.persistSession;
        this.storage = settings.storage || local_storage_1.default;
        this.admin = new GoTrueAdminApi_1.default({
            url: settings.url,
            headers: settings.headers,
            fetch: settings.fetch,
        });
        this.url = settings.url;
        this.headers = settings.headers;
        this.fetch = (0, helpers_1.resolveFetch)(settings.fetch);
        this.detectSessionInUrl = settings.detectSessionInUrl;
        this.initialize();
    }
    /**
     * Initializes the client session either from the url or from storage.
     * This method is automatically called when instantiating the client, but should also be called
     * manually when checking for an error from an auth redirect (oauth, magiclink, password recovery, etc).
     */
    initialize() {
        if (!this.initializePromise) {
            this.initializePromise = this._initialize();
        }
        return this.initializePromise;
    }
    /**
     * IMPORTANT:
     * 1. Never throw in this method, as it is called from the constructor
     * 2. Never return a session from this method as it would be cached over
     *    the whole lifetime of the client
     */
    _initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.initializePromise) {
                return this.initializePromise;
            }
            try {
                if (this.detectSessionInUrl && this._isImplicitGrantFlow()) {
                    const { data, error } = yield this._getSessionFromUrl();
                    if (error) {
                        // failed login attempt via url,
                        // remove old session as in verifyOtp, signUp and signInWith*
                        yield this._removeSession();
                        return { error };
                    }
                    const { session, redirectType } = data;
                    yield this._saveSession(session);
                    this._notifyAllSubscribers('SIGNED_IN', session);
                    if (redirectType === 'recovery') {
                        this._notifyAllSubscribers('PASSWORD_RECOVERY', session);
                    }
                    return { error: null };
                }
                // no login attempt via callback url try to recover session from storage
                yield this._recoverAndRefresh();
                return { error: null };
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { error };
                }
                return {
                    error: new errors_1.AuthUnknownError('Unexpected error during initialization', error),
                };
            }
            finally {
                this._handleVisibilityChange();
            }
        });
    }
    /**
     * Creates a new user.
     * @returns A logged-in session if the server has "autoconfirm" ON
     * @returns A user if the server has "autoconfirm" OFF
     */
    signUp(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._removeSession();
                let res;
                if ('email' in credentials) {
                    const { email, password, options } = credentials;
                    res = yield (0, fetch_1._request)(this.fetch, 'POST', `${this.url}/signup`, {
                        headers: this.headers,
                        redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
                        body: {
                            email,
                            password,
                            data: options === null || options === void 0 ? void 0 : options.data,
                            gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                        },
                        xform: fetch_1._sessionResponse,
                    });
                }
                else if ('phone' in credentials) {
                    const { phone, password, options } = credentials;
                    res = yield (0, fetch_1._request)(this.fetch, 'POST', `${this.url}/signup`, {
                        headers: this.headers,
                        body: {
                            phone,
                            password,
                            data: options === null || options === void 0 ? void 0 : options.data,
                            gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                        },
                        xform: fetch_1._sessionResponse,
                    });
                }
                else {
                    throw new errors_1.AuthInvalidCredentialsError('You must provide either an email or phone number and a password');
                }
                const { data, error } = res;
                if (error || !data) {
                    return { data: { user: null, session: null }, error: error };
                }
                const session = data.session;
                const user = data.user;
                if (data.session) {
                    yield this._saveSession(data.session);
                    this._notifyAllSubscribers('SIGNED_IN', session);
                }
                return { data: { user, session }, error: null };
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { user: null, session: null }, error };
                }
                throw error;
            }
        });
    }
    /**
     * Log in an existing user with an email and password or phone and password.
     */
    signInWithPassword(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._removeSession();
                let res;
                if ('email' in credentials) {
                    const { email, password, options } = credentials;
                    res = yield (0, fetch_1._request)(this.fetch, 'POST', `${this.url}/token?grant_type=password`, {
                        headers: this.headers,
                        body: {
                            email,
                            password,
                            gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                        },
                        xform: fetch_1._sessionResponse,
                    });
                }
                else if ('phone' in credentials) {
                    const { phone, password, options } = credentials;
                    res = yield (0, fetch_1._request)(this.fetch, 'POST', `${this.url}/token?grant_type=password`, {
                        headers: this.headers,
                        body: {
                            phone,
                            password,
                            gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                        },
                        xform: fetch_1._sessionResponse,
                    });
                }
                else {
                    throw new errors_1.AuthInvalidCredentialsError('You must provide either an email or phone number and a password');
                }
                const { data, error } = res;
                if (error || !data)
                    return { data: { user: null, session: null }, error };
                if (data.session) {
                    yield this._saveSession(data.session);
                    this._notifyAllSubscribers('SIGNED_IN', data.session);
                }
                return { data, error };
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { user: null, session: null }, error };
                }
                throw error;
            }
        });
    }
    /**
     * Log in an existing user via a third-party provider.
     */
    signInWithOAuth(credentials) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            yield this._removeSession();
            return this._handleProviderSignIn(credentials.provider, {
                redirectTo: (_a = credentials.options) === null || _a === void 0 ? void 0 : _a.redirectTo,
                scopes: (_b = credentials.options) === null || _b === void 0 ? void 0 : _b.scopes,
                queryParams: (_c = credentials.options) === null || _c === void 0 ? void 0 : _c.queryParams,
            });
        });
    }
    /**
     * Log in a user using magiclink or a one-time password (OTP).
     * If the `{{ .ConfirmationURL }}` variable is specified in the email template, a magiclink will be sent.
     * If the `{{ .Token }}` variable is specified in the email template, an OTP will be sent.
     * If you're using phone sign-ins, only an OTP will be sent. You won't be able to send a magiclink for phone sign-ins.
     */
    signInWithOtp(credentials) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._removeSession();
                if ('email' in credentials) {
                    const { email, options } = credentials;
                    const { error } = yield (0, fetch_1._request)(this.fetch, 'POST', `${this.url}/otp`, {
                        headers: this.headers,
                        body: {
                            email,
                            data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : {},
                            create_user: (_b = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _b !== void 0 ? _b : true,
                            gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                        },
                        redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
                    });
                    return { data: { user: null, session: null }, error };
                }
                if ('phone' in credentials) {
                    const { phone, options } = credentials;
                    const { error } = yield (0, fetch_1._request)(this.fetch, 'POST', `${this.url}/otp`, {
                        headers: this.headers,
                        body: {
                            phone,
                            data: (_c = options === null || options === void 0 ? void 0 : options.data) !== null && _c !== void 0 ? _c : {},
                            create_user: (_d = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _d !== void 0 ? _d : true,
                            gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                        },
                    });
                    return { data: { user: null, session: null }, error };
                }
                throw new errors_1.AuthInvalidCredentialsError('You must provide either an email or phone number.');
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { user: null, session: null }, error };
                }
                throw error;
            }
        });
    }
    /**
     * Log in a user given a User supplied OTP received via mobile.
     */
    verifyOtp(params) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this._removeSession();
                const { data, error } = yield (0, fetch_1._request)(this.fetch, 'POST', `${this.url}/verify`, {
                    headers: this.headers,
                    body: Object.assign(Object.assign({}, params), { gotrue_meta_security: { captchaToken: (_a = params.options) === null || _a === void 0 ? void 0 : _a.captchaToken } }),
                    redirectTo: (_b = params.options) === null || _b === void 0 ? void 0 : _b.redirectTo,
                    xform: fetch_1._sessionResponse,
                });
                if (error) {
                    throw error;
                }
                if (!data) {
                    throw 'An error occurred on token verification.';
                }
                const session = data.session;
                const user = data.user;
                if (session === null || session === void 0 ? void 0 : session.access_token) {
                    yield this._saveSession(session);
                    this._notifyAllSubscribers('SIGNED_IN', session);
                }
                return { data: { user, session }, error: null };
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { user: null, session: null }, error };
                }
                throw error;
            }
        });
    }
    /**
     * Returns the session, refreshing it if necessary.
     * The session returned can be null if the session is not detected which can happen in the event a user is not signed-in or has logged out.
     */
    getSession() {
        return __awaiter(this, void 0, void 0, function* () {
            // make sure we've read the session from the url if there is one
            // save to just await, as long we make sure _initialize() never throws
            yield this.initializePromise;
            let currentSession = null;
            if (this.persistSession) {
                const maybeSession = yield (0, helpers_1.getItemAsync)(this.storage, this.storageKey);
                if (maybeSession !== null) {
                    if (this._isValidSession(maybeSession)) {
                        currentSession = maybeSession;
                    }
                    else {
                        yield this._removeSession();
                    }
                }
            }
            else {
                currentSession = this.inMemorySession;
            }
            if (!currentSession) {
                return { data: { session: null }, error: null };
            }
            const hasExpired = currentSession.expires_at
                ? currentSession.expires_at <= Date.now() / 1000
                : false;
            if (!hasExpired) {
                return { data: { session: currentSession }, error: null };
            }
            const { session, error } = yield this._callRefreshToken(currentSession.refresh_token);
            if (error) {
                return { data: { session: null }, error };
            }
            return { data: { session }, error: null };
        });
    }
    /**
     * Gets the current user details if there is an existing session.
     * @param jwt Takes in an optional access token jwt. If no jwt is provided, getUser() will attempt to get the jwt from the current session.
     */
    getUser(jwt) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!jwt) {
                    const { data, error } = yield this.getSession();
                    if (error) {
                        throw error;
                    }
                    // Default to Authorization header if there is no existing session
                    jwt = (_b = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : undefined;
                }
                return yield (0, fetch_1._request)(this.fetch, 'GET', `${this.url}/user`, {
                    headers: this.headers,
                    jwt: jwt,
                    xform: fetch_1._userResponse,
                });
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { user: null }, error };
                }
                throw error;
            }
        });
    }
    /**
     * Updates user data, if there is a logged in user.
     */
    updateUser(attributes) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { data: sessionData, error: sessionError } = yield this.getSession();
                if (sessionError) {
                    throw sessionError;
                }
                if (!sessionData.session) {
                    throw new errors_1.AuthSessionMissingError();
                }
                const session = sessionData.session;
                const { data, error: userError } = yield (0, fetch_1._request)(this.fetch, 'PUT', `${this.url}/user`, {
                    headers: this.headers,
                    body: attributes,
                    jwt: session.access_token,
                    xform: fetch_1._userResponse,
                });
                if (userError)
                    throw userError;
                session.user = data.user;
                yield this._saveSession(session);
                this._notifyAllSubscribers('USER_UPDATED', session);
                return { data: { user: session.user }, error: null };
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { user: null }, error };
                }
                throw error;
            }
        });
    }
    /**
     * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
     * If the refresh token in the current session is invalid and the current session has expired, an error will be thrown.
     * If the current session does not contain at expires_at field, setSession will use the exp claim defined in the access token.
     * @param currentSession The current session that minimally contains an access token, refresh token and a user.
     */
    setSession(currentSession) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const timeNow = Date.now() / 1000;
                let expiresAt = timeNow;
                let hasExpired = true;
                let session = null;
                if (currentSession.access_token && currentSession.access_token.split('.')[1]) {
                    const payload = JSON.parse((0, helpers_1.decodeBase64URL)(currentSession.access_token.split('.')[1]));
                    if (payload.exp) {
                        expiresAt = payload.exp;
                        hasExpired = expiresAt <= timeNow;
                    }
                }
                if (hasExpired) {
                    if (!currentSession.refresh_token) {
                        throw new errors_1.AuthSessionMissingError();
                    }
                    const { data, error } = yield this._refreshAccessToken(currentSession.refresh_token);
                    if (error) {
                        return { data: { session: null, user: null }, error: error };
                    }
                    if (!data.session) {
                        return { data: { session: null, user: null }, error: null };
                    }
                    session = data.session;
                }
                else {
                    const { data, error } = yield this.getUser(currentSession.access_token);
                    if (error) {
                        throw error;
                    }
                    session = {
                        access_token: currentSession.access_token,
                        refresh_token: currentSession.refresh_token,
                        user: data.user,
                        token_type: 'bearer',
                        expires_in: expiresAt - timeNow,
                        expires_at: expiresAt,
                    };
                }
                yield this._saveSession(session);
                this._notifyAllSubscribers('TOKEN_REFRESHED', session);
                return { data: { session, user: session.user }, error: null };
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { session: null, user: null }, error };
                }
                throw error;
            }
        });
    }
    /**
     * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
     * If the refresh token in the current session is invalid and the current session has expired, an error will be thrown.
     * If the current session does not contain at expires_at field, setSession will use the exp claim defined in the access token.
     * @param refresh_token The current session that minimally contains an access token, refresh token and a user.
     */
    setSessionFromToken(refresh_token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const timeNow = Date.now() / 1000;
                let session = null;
                const { data, error } = yield this._refreshAccessToken(refresh_token);
                if (error) {
                    return { data: { session: null, user: null }, error: error };
                }
                if (!data.session) {
                    return { data: { session: null, user: null }, error: null };
                }
                session = data.session;
                yield this._saveSession(session);
                this._notifyAllSubscribers('TOKEN_REFRESHED', session);
                return { data: { session, user: session.user }, error: null };
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { session: null, user: null }, error };
                }
                throw error;
            }
        });
    }
    /**
     * Gets the session data from a URL string
     */
    _getSessionFromUrl() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!(0, helpers_1.isBrowser)())
                    throw new errors_1.AuthImplicitGrantRedirectError('No browser detected.');
                if (!this._isImplicitGrantFlow()) {
                    throw new errors_1.AuthImplicitGrantRedirectError('Not a valid implicit grant flow url.');
                }
                const error_description = (0, helpers_1.getParameterByName)('error_description');
                if (error_description) {
                    const error_code = (0, helpers_1.getParameterByName)('error_code');
                    if (!error_code)
                        throw new errors_1.AuthImplicitGrantRedirectError('No error_code detected.');
                    const error = (0, helpers_1.getParameterByName)('error');
                    if (!error)
                        throw new errors_1.AuthImplicitGrantRedirectError('No error detected.');
                    throw new errors_1.AuthImplicitGrantRedirectError(error_description, { error, code: error_code });
                }
                const provider_token = (0, helpers_1.getParameterByName)('provider_token');
                const provider_refresh_token = (0, helpers_1.getParameterByName)('provider_refresh_token');
                const access_token = (0, helpers_1.getParameterByName)('access_token');
                if (!access_token)
                    throw new errors_1.AuthImplicitGrantRedirectError('No access_token detected.');
                const expires_in = (0, helpers_1.getParameterByName)('expires_in');
                if (!expires_in)
                    throw new errors_1.AuthImplicitGrantRedirectError('No expires_in detected.');
                const refresh_token = (0, helpers_1.getParameterByName)('refresh_token');
                if (!refresh_token)
                    throw new errors_1.AuthImplicitGrantRedirectError('No refresh_token detected.');
                const token_type = (0, helpers_1.getParameterByName)('token_type');
                if (!token_type)
                    throw new errors_1.AuthImplicitGrantRedirectError('No token_type detected.');
                const timeNow = Math.round(Date.now() / 1000);
                const expires_at = timeNow + parseInt(expires_in);
                const { data, error } = yield this.getUser(access_token);
                if (error)
                    throw error;
                const user = data.user;
                const session = {
                    provider_token,
                    provider_refresh_token,
                    access_token,
                    expires_in: parseInt(expires_in),
                    expires_at,
                    refresh_token,
                    token_type,
                    user,
                };
                const redirectType = (0, helpers_1.getParameterByName)('type');
                // Remove tokens from URL
                window.location.hash = '';
                return { data: { session, redirectType }, error: null };
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { session: null, redirectType: null }, error };
                }
                throw error;
            }
        });
    }
    /**
     * Checks if the current URL contains parameters given by an implicit oauth grant flow (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2)
     */
    _isImplicitGrantFlow() {
        return ((0, helpers_1.isBrowser)() &&
            (Boolean((0, helpers_1.getParameterByName)('access_token')) ||
                Boolean((0, helpers_1.getParameterByName)('error_description'))));
    }
    /**
     * Inside a browser context, `signOut()` will remove the logged in user from the browser session
     * and log them out - removing all items from localstorage and then trigger a `"SIGNED_OUT"` event.
     *
     * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
     * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
     */
    signOut() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { data, error: sessionError } = yield this.getSession();
            if (sessionError) {
                return { error: sessionError };
            }
            const accessToken = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token;
            if (accessToken) {
                const { error } = yield this.admin.signOut(accessToken);
                if (error)
                    return { error };
            }
            yield this._removeSession();
            this._notifyAllSubscribers('SIGNED_OUT', null);
            return { error: null };
        });
    }
    /**
     * Receive a notification every time an auth event happens.
     * @param callback A callback function to be invoked when an auth event happens.
     */
    onAuthStateChange(callback) {
        const id = (0, helpers_1.uuid)();
        const subscription = {
            id,
            callback,
            unsubscribe: () => {
                this.stateChangeEmitters.delete(id);
            },
        };
        this.stateChangeEmitters.set(id, subscription);
        return { data: { subscription } };
    }
    /**
     * Sends a password reset request to an email address.
     * @param email The email address of the user.
     * @param options.redirectTo The URL to send the user to after they click the password reset link.
     * @param options.captchaToken Verification token received when the user completes the captcha on the site.
     */
    resetPasswordForEmail(email, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield (0, fetch_1._request)(this.fetch, 'POST', `${this.url}/recover`, {
                    body: { email, gotrue_meta_security: { captcha_token: options.captchaToken } },
                    headers: this.headers,
                    redirectTo: options.redirectTo,
                });
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: null, error };
                }
                throw error;
            }
        });
    }
    /**
     * Generates a new JWT.
     * @param refreshToken A valid refresh token that was returned on login.
     */
    _refreshAccessToken(refreshToken) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield (0, fetch_1._request)(this.fetch, 'POST', `${this.url}/token?grant_type=refresh_token`, {
                    body: { refresh_token: refreshToken },
                    headers: this.headers,
                    xform: fetch_1._sessionResponse,
                });
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    return { data: { session: null, user: null }, error };
                }
                throw error;
            }
        });
    }
    _isValidSession(maybeSession) {
        const isValidSession = typeof maybeSession === 'object' &&
            maybeSession !== null &&
            'access_token' in maybeSession &&
            'refresh_token' in maybeSession &&
            'expires_at' in maybeSession;
        return isValidSession;
    }
    _handleProviderSignIn(provider, options = {}) {
        const url = this._getUrlForProvider(provider, {
            redirectTo: options.redirectTo,
            scopes: options.scopes,
            queryParams: options.queryParams,
        });
        // try to open on the browser
        if ((0, helpers_1.isBrowser)()) {
            window.location.href = url;
        }
        return { data: { provider, url }, error: null };
    }
    /**
     * Recovers the session from LocalStorage and refreshes
     * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
     */
    _recoverAndRefresh() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const currentSession = yield (0, helpers_1.getItemAsync)(this.storage, this.storageKey);
                if (!this._isValidSession(currentSession)) {
                    if (currentSession !== null) {
                        yield this._removeSession();
                    }
                    return;
                }
                const timeNow = Math.round(Date.now() / 1000);
                if (((_a = currentSession.expires_at) !== null && _a !== void 0 ? _a : Infinity) < timeNow + constants_1.EXPIRY_MARGIN) {
                    if (this.autoRefreshToken && currentSession.refresh_token) {
                        this.networkRetries++;
                        const { error } = yield this._callRefreshToken(currentSession.refresh_token);
                        if (error) {
                            console.log(error.message);
                            if (error instanceof errors_1.AuthRetryableFetchError &&
                                this.networkRetries < constants_1.NETWORK_FAILURE.MAX_RETRIES) {
                                if (this.refreshTokenTimer)
                                    clearTimeout(this.refreshTokenTimer);
                                this.refreshTokenTimer = setTimeout(() => this._recoverAndRefresh(), Math.pow(constants_1.NETWORK_FAILURE.RETRY_INTERVAL, this.networkRetries) * 100 // exponential backoff
                                );
                                return;
                            }
                            yield this._removeSession();
                        }
                        this.networkRetries = 0;
                    }
                    else {
                        yield this._removeSession();
                    }
                }
                else {
                    if (this.persistSession) {
                        yield this._saveSession(currentSession);
                    }
                    this._notifyAllSubscribers('SIGNED_IN', currentSession);
                }
            }
            catch (err) {
                console.error(err);
                return;
            }
        });
    }
    _callRefreshToken(refreshToken) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            // refreshing is already in progress
            if (this.refreshingDeferred) {
                return this.refreshingDeferred.promise;
            }
            try {
                this.refreshingDeferred = new helpers_1.Deferred();
                if (!refreshToken) {
                    throw new errors_1.AuthSessionMissingError();
                }
                const { data, error } = yield this._refreshAccessToken(refreshToken);
                if (error)
                    throw error;
                if (!data.session)
                    throw new errors_1.AuthSessionMissingError();
                yield this._saveSession(data.session);
                this._notifyAllSubscribers('TOKEN_REFRESHED', data.session);
                const result = { session: data.session, error: null };
                this.refreshingDeferred.resolve(result);
                return result;
            }
            catch (error) {
                if ((0, errors_1.isAuthError)(error)) {
                    const result = { session: null, error };
                    (_a = this.refreshingDeferred) === null || _a === void 0 ? void 0 : _a.resolve(result);
                    return result;
                }
                (_b = this.refreshingDeferred) === null || _b === void 0 ? void 0 : _b.reject(error);
                throw error;
            }
            finally {
                this.refreshingDeferred = null;
            }
        });
    }
    _notifyAllSubscribers(event, session) {
        this.stateChangeEmitters.forEach((x) => x.callback(event, session));
    }
    /**
     * set currentSession and currentUser
     * process to _startAutoRefreshToken if possible
     */
    _saveSession(session) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.persistSession) {
                this.inMemorySession = session;
            }
            const expiresAt = session.expires_at;
            if (expiresAt) {
                const timeNow = Math.round(Date.now() / 1000);
                const expiresIn = expiresAt - timeNow;
                const refreshDurationBeforeExpires = expiresIn > constants_1.EXPIRY_MARGIN ? constants_1.EXPIRY_MARGIN : 0.5;
                this._startAutoRefreshToken((expiresIn - refreshDurationBeforeExpires) * 1000);
            }
            if (this.persistSession && session.expires_at) {
                yield this._persistSession(session);
            }
        });
    }
    _persistSession(currentSession) {
        return (0, helpers_1.setItemAsync)(this.storage, this.storageKey, currentSession);
    }
    _removeSession() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.persistSession) {
                yield (0, helpers_1.removeItemAsync)(this.storage, this.storageKey);
            }
            else {
                this.inMemorySession = null;
            }
            if (this.refreshTokenTimer) {
                clearTimeout(this.refreshTokenTimer);
            }
        });
    }
    /**
     * Clear and re-create refresh token timer
     * @param value time intervals in milliseconds.
     * @param session The current session.
     */
    _startAutoRefreshToken(value) {
        if (this.refreshTokenTimer)
            clearTimeout(this.refreshTokenTimer);
        if (value <= 0 || !this.autoRefreshToken)
            return;
        this.refreshTokenTimer = setTimeout(() => __awaiter(this, void 0, void 0, function* () {
            this.networkRetries++;
            const { data: { session }, error: sessionError, } = yield this.getSession();
            if (!sessionError && session) {
                const { error } = yield this._callRefreshToken(session.refresh_token);
                if (!error)
                    this.networkRetries = 0;
                if (error instanceof errors_1.AuthRetryableFetchError &&
                    this.networkRetries < constants_1.NETWORK_FAILURE.MAX_RETRIES)
                    this._startAutoRefreshToken(Math.pow(constants_1.NETWORK_FAILURE.RETRY_INTERVAL, this.networkRetries) * 100); // exponential backoff
            }
        }), value);
        if (typeof this.refreshTokenTimer.unref === 'function')
            this.refreshTokenTimer.unref();
    }
    _handleVisibilityChange() {
        if (!(0, helpers_1.isBrowser)() || !(window === null || window === void 0 ? void 0 : window.addEventListener)) {
            return false;
        }
        try {
            window === null || window === void 0 ? void 0 : window.addEventListener('visibilitychange', () => __awaiter(this, void 0, void 0, function* () {
                if (document.visibilityState === 'visible') {
                    yield this.initializePromise;
                    yield this._recoverAndRefresh();
                }
            }));
        }
        catch (error) {
            console.error('_handleVisibilityChange', error);
        }
    }
    /**
     * Generates the relevant login URL for a third-party provider.
     * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
     * @param options.scopes A space-separated list of scopes granted to the OAuth application.
     * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
     */
    _getUrlForProvider(provider, options) {
        const urlParams = [`provider=${encodeURIComponent(provider)}`];
        if (options === null || options === void 0 ? void 0 : options.redirectTo) {
            urlParams.push(`redirect_to=${encodeURIComponent(options.redirectTo)}`);
        }
        if (options === null || options === void 0 ? void 0 : options.scopes) {
            urlParams.push(`scopes=${encodeURIComponent(options.scopes)}`);
        }
        if (options === null || options === void 0 ? void 0 : options.queryParams) {
            const query = new URLSearchParams(options.queryParams);
            urlParams.push(query.toString());
        }
        return `${this.url}/authorize?${urlParams.join('&')}`;
    }
}
exports.default = GoTrueClient;
//# sourceMappingURL=GoTrueClient.js.map