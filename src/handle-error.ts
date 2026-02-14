import { HTTPError } from 'ky';
import {
  SDKError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  NetworkError,
} from './errors.js';

interface ErrorBody {
  message?: string;
  details?: unknown;
}

/**
 * Convert a caught error into the appropriate typed SDK error.
 * @param error  The caught error (typically from ky)
 * @param resource  Human-readable resource name for 404 messages
 * @param identifier  Resource identifier for 404 messages
 */
export async function handleError(
  error: unknown,
  resource: string = 'Resource',
  identifier: string = '',
): Promise<never> {
  if (error instanceof HTTPError) {
    const status = error.response.status;
    const body: ErrorBody = await error.response
      .json()
      .catch(() => ({ message: error.message })) as ErrorBody;
    const msg = body.message ?? 'Request failed';

    if (status === 400) throw new ValidationError(msg, body.details);
    if (status === 401) throw new AuthenticationError(msg);
    if (status === 403) throw new AuthorizationError(msg);
    if (status === 404) throw new NotFoundError(resource, identifier);
    if (status === 409) throw new ConflictError(msg);
    if (status === 429) throw new RateLimitError(msg);

    throw new SDKError(msg, status);
  }

  if (error instanceof Error) {
    throw new NetworkError('Network request failed', error);
  }

  throw new NetworkError('Network request failed');
}
