import GoTrueAdminApi from './GoTrueAdminApi';
import { AuthError } from './lib/errors';
import { Fetch } from './lib/fetch';
import { Deferred } from './lib/helpers';
import type { AuthChangeEvent, AuthResponse, CallRefreshTokenResult, GoTrueClientOptions, InitializeResult, OAuthResponse, Session, SignInWithOAuthCredentials, SignInWithPasswordCredentials, SignInWithPasswordlessCredentials, SignUpWithPasswordCredentials, Subscription, SupportedStorage, UserAttributes, UserResponse, VerifyOtpParams } from './lib/types';
export default class GoTrueClient {
    /**
     * Namespace for the GoTrue admin methods.
     * These methods should only be used in a trusted server-side environment.
     */
    admin: GoTrueAdminApi;
    /**
     * The storage key used to identify the values saved in localStorage
     */
    protected storageKey: string;
    /**
     * The session object for the currently logged in user. If null, it means there isn't a logged-in user.
     * Only used if persistSession is false.
     */
    protected inMemorySession: Session | null;
    protected autoRefreshToken: boolean;
    protected persistSession: boolean;
    protected storage: SupportedStorage;
    protected stateChangeEmitters: Map<string, Subscription>;
    protected refreshTokenTimer?: ReturnType<typeof setTimeout>;
    protected networkRetries: number;
    protected refreshingDeferred: Deferred<CallRefreshTokenResult> | null;
    /**
     * Keeps track of the async client initialization.
     * When null or not yet resolved the auth state is `unknown`
     * Once resolved the the auth state is known and it's save to call any further client methods.
     * Keep extra care to never reject or throw uncaught errors
     */
    protected initializePromise: Promise<InitializeResult> | null;
    protected detectSessionInUrl: boolean;
    protected url: string;
    protected headers: {
        [key: string]: string;
    };
    protected fetch: Fetch;
    /**
     * Create a new client for use in the browser.
     */
    constructor(options: GoTrueClientOptions);
    /**
     * Initializes the client session either from the url or from storage.
     * This method is automatically called when instantiating the client, but should also be called
     * manually when checking for an error from an auth redirect (oauth, magiclink, password recovery, etc).
     */
    initialize(): Promise<InitializeResult>;
    /**
     * IMPORTANT:
     * 1. Never throw in this method, as it is called from the constructor
     * 2. Never return a session from this method as it would be cached over
     *    the whole lifetime of the client
     */
    private _initialize;
    /**
     * Creates a new user.
     * @returns A logged-in session if the server has "autoconfirm" ON
     * @returns A user if the server has "autoconfirm" OFF
     */
    signUp(credentials: SignUpWithPasswordCredentials): Promise<AuthResponse>;
    /**
     * Log in an existing user with an email and password or phone and password.
     */
    signInWithPassword(credentials: SignInWithPasswordCredentials): Promise<AuthResponse>;
    /**
     * Log in an existing user via a third-party provider.
     */
    signInWithOAuth(credentials: SignInWithOAuthCredentials): Promise<OAuthResponse>;
    /**
     * Log in a user using magiclink or a one-time password (OTP).
     * If the `{{ .ConfirmationURL }}` variable is specified in the email template, a magiclink will be sent.
     * If the `{{ .Token }}` variable is specified in the email template, an OTP will be sent.
     * If you're using phone sign-ins, only an OTP will be sent. You won't be able to send a magiclink for phone sign-ins.
     */
    signInWithOtp(credentials: SignInWithPasswordlessCredentials): Promise<AuthResponse>;
    /**
     * Log in a user given a User supplied OTP received via mobile.
     */
    verifyOtp(params: VerifyOtpParams): Promise<AuthResponse>;
    /**
     * Returns the session, refreshing it if necessary.
     * The session returned can be null if the session is not detected which can happen in the event a user is not signed-in or has logged out.
     */
    getSession(): Promise<{
        data: {
            session: Session;
        };
        error: null;
    } | {
        data: {
            session: null;
        };
        error: AuthError;
    } | {
        data: {
            session: null;
        };
        error: null;
    }>;
    /**
     * Gets the current user details if there is an existing session.
     * @param jwt Takes in an optional access token jwt. If no jwt is provided, getUser() will attempt to get the jwt from the current session.
     */
    getUser(jwt?: string): Promise<UserResponse>;
    /**
     * Updates user data, if there is a logged in user.
     */
    updateUser(attributes: UserAttributes): Promise<UserResponse>;
    /**
     * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
     * If the refresh token in the current session is invalid and the current session has expired, an error will be thrown.
     * If the current session does not contain at expires_at field, setSession will use the exp claim defined in the access token.
     * @param currentSession The current session that minimally contains an access token, refresh token and a user.
     */
    setSession(currentSession: Pick<Session, 'access_token' | 'refresh_token'>): Promise<AuthResponse>;
    /**
     * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
     * If the refresh token in the current session is invalid and the current session has expired, an error will be thrown.
     * If the current session does not contain at expires_at field, setSession will use the exp claim defined in the access token.
     * @param refresh_token The current session that minimally contains an access token, refresh token and a user.
     */
    setSessionFromToken(refresh_token: string): Promise<AuthResponse>;
    /**
     * Gets the session data from a URL string
     */
    private _getSessionFromUrl;
    /**
     * Checks if the current URL contains parameters given by an implicit oauth grant flow (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2)
     */
    private _isImplicitGrantFlow;
    /**
     * Inside a browser context, `signOut()` will remove the logged in user from the browser session
     * and log them out - removing all items from localstorage and then trigger a `"SIGNED_OUT"` event.
     *
     * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
     * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
     */
    signOut(): Promise<{
        error: AuthError | null;
    }>;
    /**
     * Receive a notification every time an auth event happens.
     * @param callback A callback function to be invoked when an auth event happens.
     */
    onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void): {
        data: {
            subscription: Subscription;
        };
    };
    /**
     * Sends a password reset request to an email address.
     * @param email The email address of the user.
     * @param options.redirectTo The URL to send the user to after they click the password reset link.
     * @param options.captchaToken Verification token received when the user completes the captcha on the site.
     */
    resetPasswordForEmail(email: string, options?: {
        redirectTo?: string;
        captchaToken?: string;
    }): Promise<{
        data: {};
        error: null;
    } | {
        data: null;
        error: AuthError;
    }>;
    /**
     * Generates a new JWT.
     * @param refreshToken A valid refresh token that was returned on login.
     */
    private _refreshAccessToken;
    private _isValidSession;
    private _handleProviderSignIn;
    /**
     * Recovers the session from LocalStorage and refreshes
     * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
     */
    private _recoverAndRefresh;
    private _callRefreshToken;
    private _notifyAllSubscribers;
    /**
     * set currentSession and currentUser
     * process to _startAutoRefreshToken if possible
     */
    private _saveSession;
    private _persistSession;
    private _removeSession;
    /**
     * Clear and re-create refresh token timer
     * @param value time intervals in milliseconds.
     * @param session The current session.
     */
    private _startAutoRefreshToken;
    private _handleVisibilityChange;
    /**
     * Generates the relevant login URL for a third-party provider.
     * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
     * @param options.scopes A space-separated list of scopes granted to the OAuth application.
     * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
     */
    private _getUrlForProvider;
}
//# sourceMappingURL=GoTrueClient.d.ts.map