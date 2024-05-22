import { SupportedStorage } from './types';
export declare function expiresAt(expiresIn: number): number;
export declare function uuid(): string;
export declare const isBrowser: () => boolean;
/**
 * Checks whether localStorage is supported on this browser.
 */
export declare const supportsLocalStorage: () => boolean;
/**
 * Extracts parameters encoded in the URL both in the query and fragment.
 */
export declare function parseParametersFromURL(href: string): {
    [parameter: string]: string;
};
declare type Fetch = typeof fetch;
export declare const resolveFetch: (customFetch?: Fetch) => Fetch;
export declare const looksLikeFetchResponse: (maybeResponse: unknown) => maybeResponse is Response;
export declare const setItemAsync: (storage: SupportedStorage, key: string, data: any) => Promise<void>;
export declare const getItemAsync: (storage: SupportedStorage, key: string) => Promise<unknown>;
export declare const removeItemAsync: (storage: SupportedStorage, key: string) => Promise<void>;
export declare function decodeBase64URL(value: string): string;
/**
 * A deferred represents some asynchronous work that is not yet finished, which
 * may or may not culminate in a value.
 * Taken from: https://github.com/mike-north/types/blob/master/src/async.ts
 */
export declare class Deferred<T = any> {
    static promiseConstructor: PromiseConstructor;
    readonly promise: PromiseLike<T>;
    readonly resolve: (value?: T | PromiseLike<T>) => void;
    readonly reject: (reason?: any) => any;
    constructor();
}
export declare function decodeJWTPayload(token: string): any;
/**
 * Creates a promise that resolves to null after some time.
 */
export declare function sleep(time: number): Promise<null>;
/**
 * Converts the provided async function into a retryable function. Each result
 * or thrown error is sent to the isRetryable function which should return true
 * if the function should run again.
 */
export declare function retryable<T>(fn: (attempt: number) => Promise<T>, isRetryable: (attempt: number, error: any | null, result?: T) => boolean): Promise<T>;
export declare function generatePKCEVerifier(): string;
export declare function generatePKCEChallenge(verifier: string): Promise<string>;
export declare function getCodeChallengeAndMethod(storage: SupportedStorage, storageKey: string, isPasswordRecovery?: boolean): Promise<string[]>;
export declare function parseResponseAPIVersion(response: Response): Date | null;
export {};
//# sourceMappingURL=helpers.d.ts.map