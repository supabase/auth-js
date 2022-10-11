import { Fetch } from './lib/fetch';
import { AdminUserAttributes, GenerateLinkParams, GenerateLinkResponse, User, UserResponse } from './lib/types';
import { AuthError } from './lib/errors';
export default class GoTrueAdminApi {
    protected url: string;
    protected headers: {
        [key: string]: string;
    };
    protected fetch: Fetch;
    constructor({ url, headers, fetch, }: {
        url: string;
        headers?: {
            [key: string]: string;
        };
        fetch?: Fetch;
    });
    /**
     * Removes a logged-in session.
     * @param jwt A valid, logged-in JWT.
     */
    signOut(jwt: string): Promise<{
        error: AuthError | null;
    }>;
    /**
     * Sends an invite link to an email address.
     * @param email The email address of the user.
     * @param options.redirectTo A URL or mobile deeplink to send the user to after they are confirmed.
     * @param options.data Optional user metadata
     */
    inviteUserByEmail(email: string, options?: {
        redirectTo?: string;
        data?: object;
    }): Promise<UserResponse>;
    /**
     * Generates email links and OTPs to be sent via a custom email provider.
     * @param email The user's email.
     * @param options.password User password. For signup only.
     * @param options.data Optional user metadata. For signup only.
     * @param options.redirectTo The redirect url which should be appended to the generated link
     */
    generateLink(params: GenerateLinkParams): Promise<GenerateLinkResponse>;
    /**
     * Creates a new user.
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    createUser(attributes: AdminUserAttributes): Promise<UserResponse>;
    /**
     * Get a list of users.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    listUsers(): Promise<{
        data: {
            users: User[];
        };
        error: null;
    } | {
        data: {
            users: [];
        };
        error: AuthError;
    }>;
    /**
     * Get user by id.
     *
     * @param uid The user's unique identifier
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    getUserById(uid: string): Promise<UserResponse>;
    /**
     * Updates the user data.
     *
     * @param attributes The data you want to update.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    updateUserById(uid: string, attributes: AdminUserAttributes): Promise<UserResponse>;
    /**
     * Delete a user. Requires a `service_role` key.
     *
     * @param id The user id you want to remove.
     *
     * This function should only be called on a server. Never expose your `service_role` key in the browser.
     */
    deleteUser(id: string): Promise<UserResponse>;
}
//# sourceMappingURL=GoTrueAdminApi.d.ts.map