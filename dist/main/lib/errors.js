"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRetryableFetchError = exports.AuthImplicitGrantRedirectError = exports.AuthInvalidCredentialsError = exports.AuthSessionMissingError = exports.CustomAuthError = exports.AuthUnknownError = exports.AuthApiError = exports.isAuthError = exports.AuthError = void 0;
class AuthError extends Error {
    constructor(message) {
        super(message);
        this.__isAuthError = true;
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
function isAuthError(error) {
    return typeof error === 'object' && error !== null && '__isAuthError' in error;
}
exports.isAuthError = isAuthError;
class AuthApiError extends AuthError {
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
exports.AuthApiError = AuthApiError;
class AuthUnknownError extends AuthError {
    constructor(message, originalError) {
        super(message);
        this.name = 'AuthUnknownError';
        this.originalError = originalError;
    }
}
exports.AuthUnknownError = AuthUnknownError;
class CustomAuthError extends AuthError {
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
exports.CustomAuthError = CustomAuthError;
class AuthSessionMissingError extends CustomAuthError {
    constructor() {
        super('Auth session missing!', 'AuthSessionMissingError', 400);
    }
}
exports.AuthSessionMissingError = AuthSessionMissingError;
class AuthInvalidCredentialsError extends CustomAuthError {
    constructor(message) {
        super(message, 'AuthInvalidCredentialsError', 400);
    }
}
exports.AuthInvalidCredentialsError = AuthInvalidCredentialsError;
class AuthImplicitGrantRedirectError extends CustomAuthError {
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
exports.AuthImplicitGrantRedirectError = AuthImplicitGrantRedirectError;
class AuthRetryableFetchError extends CustomAuthError {
    constructor(message, status) {
        super(message, 'AuthRetryableFetchError', status);
    }
}
exports.AuthRetryableFetchError = AuthRetryableFetchError;
//# sourceMappingURL=errors.js.map