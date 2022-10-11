export declare class AuthError extends Error {
    protected __isAuthError: boolean;
    constructor(message: string);
}
export declare function isAuthError(error: unknown): error is AuthError;
export declare class AuthApiError extends AuthError {
    status: number;
    constructor(message: string, status: number);
    toJSON(): {
        name: string;
        message: string;
        status: number;
    };
}
export declare class AuthUnknownError extends AuthError {
    originalError: unknown;
    constructor(message: string, originalError: unknown);
}
export declare class CustomAuthError extends AuthError {
    name: string;
    status: number;
    constructor(message: string, name: string, status: number);
    toJSON(): {
        name: string;
        message: string;
        status: number;
    };
}
export declare class AuthSessionMissingError extends CustomAuthError {
    constructor();
}
export declare class AuthInvalidCredentialsError extends CustomAuthError {
    constructor(message: string);
}
export declare class AuthImplicitGrantRedirectError extends CustomAuthError {
    details: {
        error: string;
        code: string;
    } | null;
    constructor(message: string, details?: {
        error: string;
        code: string;
    } | null);
    toJSON(): {
        name: string;
        message: string;
        status: number;
        details: {
            error: string;
            code: string;
        } | null;
    };
}
export declare class AuthRetryableFetchError extends CustomAuthError {
    constructor(message: string, status: number);
}
//# sourceMappingURL=errors.d.ts.map