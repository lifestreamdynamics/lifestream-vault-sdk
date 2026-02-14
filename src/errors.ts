export class SDKError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends SDKError {
  constructor(
    message: string,
    public details?: unknown,
  ) {
    super(message, 400);
  }
}

export class AuthenticationError extends SDKError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class AuthorizationError extends SDKError {
  constructor(message: string = 'Permission denied') {
    super(message, 403);
  }
}

export class NotFoundError extends SDKError {
  constructor(resource: string, identifier: string) {
    super(`${resource} not found: ${identifier}`, 404);
  }
}

export class ConflictError extends SDKError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class RateLimitError extends SDKError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
  }
}

export class NetworkError extends SDKError {
  override cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.cause = cause;
  }
}
