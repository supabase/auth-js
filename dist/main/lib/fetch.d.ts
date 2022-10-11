import { AuthResponse, GenerateLinkResponse, UserResponse } from './types';
export declare type Fetch = typeof fetch;
export interface FetchOptions {
    headers?: {
        [key: string]: string;
    };
    noResolveJson?: boolean;
}
export interface FetchParameters {
    signal?: AbortSignal;
}
export declare type RequestMethodType = 'GET' | 'POST' | 'PUT' | 'DELETE';
interface GotrueRequestOptions extends FetchOptions {
    jwt?: string;
    redirectTo?: string;
    body?: object;
    query?: {
        [key: string]: string;
    };
    /**
     * Function that transforms api response from gotrue into a desirable / standardised format
     */
    xform?: (data: any) => any;
}
export declare function _request(fetcher: Fetch, method: RequestMethodType, url: string, options?: GotrueRequestOptions): Promise<any>;
export declare function _sessionResponse(data: any): AuthResponse;
export declare function _userResponse(data: any): UserResponse;
export declare function _generateLinkResponse(data: any): GenerateLinkResponse;
export {};
//# sourceMappingURL=fetch.d.ts.map