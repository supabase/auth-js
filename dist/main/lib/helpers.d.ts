import { SupportedStorage } from './types';
export declare function expiresAt(expiresIn: number): number;
export declare function uuid(): string;
export declare const isBrowser: () => boolean;
export declare function getParameterByName(name: string, url?: string): string | null;
declare type Fetch = typeof fetch;
export declare const resolveFetch: (customFetch?: Fetch) => Fetch;
export declare const looksLikeFetchResponse: (maybeResponse: unknown) => maybeResponse is Response;
export declare const setItemAsync: (storage: SupportedStorage, key: string, data: any) => Promise<void>;
export declare const getItemAsync: (storage: SupportedStorage, key: string) => Promise<unknown>;
export declare const removeItemAsync: (storage: SupportedStorage, key: string) => Promise<void>;
export declare const decodeBase64URL: (value: string) => string;
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
export {};
//# sourceMappingURL=helpers.d.ts.map