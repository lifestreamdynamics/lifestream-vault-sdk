export declare class SDKError extends Error {
    statusCode?: number | undefined;
    constructor(message: string, statusCode?: number | undefined);
}
export declare class ValidationError extends SDKError {
    details?: unknown | undefined;
    constructor(message: string, details?: unknown | undefined);
}
export declare class AuthenticationError extends SDKError {
    constructor(message?: string);
}
export declare class AuthorizationError extends SDKError {
    constructor(message?: string);
}
export declare class NotFoundError extends SDKError {
    constructor(resource: string, identifier: string);
}
export declare class ConflictError extends SDKError {
    constructor(message: string);
}
export declare class RateLimitError extends SDKError {
    constructor(message?: string);
}
export declare class NetworkError extends SDKError {
    /** The original error that caused this network failure, if any. */
    readonly originalError?: Error;
    constructor(message: string, originalError?: Error);
}
//# sourceMappingURL=errors.d.ts.map