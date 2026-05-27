export class SDKError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
export class ValidationError extends SDKError {
    details;
    constructor(message, details) {
        super(message, 400);
        this.details = details;
    }
}
export class AuthenticationError extends SDKError {
    constructor(message = 'Authentication required') {
        super(message, 401);
    }
}
export class AuthorizationError extends SDKError {
    constructor(message = 'Permission denied') {
        super(message, 403);
    }
}
export class NotFoundError extends SDKError {
    constructor(resource, identifier) {
        super(`${resource} not found: ${identifier}`, 404);
    }
}
export class ConflictError extends SDKError {
    constructor(message) {
        super(message, 409);
    }
}
export class RateLimitError extends SDKError {
    constructor(message = 'Rate limit exceeded') {
        super(message, 429);
    }
}
export class NetworkError extends SDKError {
    /** The original error that caused this network failure, if any. */
    originalError;
    constructor(message, originalError) {
        super(message);
        this.originalError = originalError;
    }
}
//# sourceMappingURL=errors.js.map