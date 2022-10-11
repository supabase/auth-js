export class AuthError extends Error {
    constructor(message) {
        super(message);
        this.__isAuthError = true;
        this.name = 'AuthError';
    }
}
export function isAuthError(error) {
    return typeof error === 'object' && error !== null && '__isAuthError' in error;
}
export class AuthApiError extends AuthError {
    constructor(message, status) {
        super(message);
        this.name = 'AuthApiError';
        this.status = status;
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
        };
    }
}
export class AuthUnknownError extends AuthError {
    constructor(message, originalError) {
        super(message);
        this.name = 'AuthUnknownError';
        this.originalError = originalError;
    }
}
export class CustomAuthError extends AuthError {
    constructor(message, name, status) {
        super(message);
        this.name = name;
        this.status = status;
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
        };
    }
}
export class AuthSessionMissingError extends CustomAuthError {
    constructor() {
        super('Auth session missing!', 'AuthSessionMissingError', 400);
    }
}
export class AuthInvalidCredentialsError extends CustomAuthError {
    constructor(message) {
        super(message, 'AuthInvalidCredentialsError', 400);
    }
}
export class AuthImplicitGrantRedirectError extends CustomAuthError {
    constructor(message, details = null) {
        super(message, 'AuthImplicitGrantRedirectError', 500);
        this.details = null;
        this.details = details;
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            status: this.status,
            details: this.details,
        };
    }
}
export class AuthRetryableFetchError extends CustomAuthError {
    constructor(message, status) {
        super(message, 'AuthRetryableFetchError', status);
    }
}
//# sourceMappingURL=errors.js.map