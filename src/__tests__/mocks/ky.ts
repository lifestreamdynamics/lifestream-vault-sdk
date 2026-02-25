import { vi } from 'vitest';
import { HTTPError } from 'ky';

/**
 * Creates a chainable ky mock where HTTP methods return objects
 * with `.json()` that resolves to the mocked data.
 */
export function createKyMock() {
  const createResponse = (data: unknown = undefined) => ({
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn().mockResolvedValue(new Blob([])),
    ok: true,
    status: 200,
  });

  const mock = {
    get: vi.fn().mockReturnValue(createResponse()),
    post: vi.fn().mockReturnValue(createResponse()),
    put: vi.fn().mockReturnValue(createResponse()),
    delete: vi.fn().mockReturnValue(createResponse()),
    patch: vi.fn().mockReturnValue(createResponse()),
    extend: vi.fn(),
  };

  // extend returns a new mock that behaves the same
  mock.extend.mockReturnValue(mock);

  return mock;
}

/**
 * Helper to make a ky mock method return specific JSON data.
 */
export function mockJsonResponse(method: ReturnType<typeof vi.fn>, data: unknown) {
  method.mockReturnValue({
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    blob: vi.fn().mockResolvedValue(new Blob([JSON.stringify(data)])),
    ok: true,
    status: 200,
  });
}

/**
 * Helper to make a ky mock method return a plain text response.
 */
export function mockTextResponse(method: ReturnType<typeof vi.fn>, text: string) {
  method.mockReturnValue({
    json: vi.fn().mockRejectedValue(new Error('Not JSON')),
    text: vi.fn().mockResolvedValue(text),
    blob: vi.fn().mockResolvedValue(new Blob([text])),
    ok: true,
    status: 200,
  });
}

/**
 * Helper to make a ky mock method return a blob response.
 */
export function mockBlobResponse(method: ReturnType<typeof vi.fn>, blob: Blob) {
  method.mockReturnValue({
    json: vi.fn().mockRejectedValue(new Error('Not JSON')),
    text: vi.fn().mockResolvedValue(''),
    blob: vi.fn().mockResolvedValue(blob),
    ok: true,
    status: 200,
  });
}

/**
 * Helper to create a ky HTTPError with a fake Response.
 * This triggers the handleError path for HTTP status errors.
 */
export function createHTTPError(status: number, body: Record<string, unknown> = {}): HTTPError {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  const request = new Request('http://localhost/test');
  return new HTTPError(response, request, {} as any);
}

/**
 * Helper to make a ky mock method throw an HTTPError (simulating an API error response).
 * The error goes through handleError which maps status codes to typed SDK errors.
 */
export function mockHTTPError(method: ReturnType<typeof vi.fn>, status: number, body: Record<string, unknown> = {}) {
  const error = createHTTPError(status, body);
  method.mockReturnValue({
    json: vi.fn().mockRejectedValue(error),
    text: vi.fn().mockRejectedValue(error),
    blob: vi.fn().mockRejectedValue(error),
    ok: false,
    // For methods that don't call .json() (e.g., delete), also reject the thenable
    then: (_resolve: unknown, reject: (e: HTTPError) => void) => Promise.reject(error).then(undefined, reject),
  });
}

/**
 * Helper to make a ky mock method reject entirely (simulating network error).
 * Goes through handleError which wraps as NetworkError('Network request failed').
 */
export function mockNetworkError(method: ReturnType<typeof vi.fn>, error?: Error) {
  const err = error ?? new Error('Network error');
  method.mockReturnValue({
    json: vi.fn().mockRejectedValue(err),
    text: vi.fn().mockRejectedValue(err),
    blob: vi.fn().mockRejectedValue(err),
    ok: false,
    then: (_resolve: unknown, reject: (e: Error) => void) => Promise.reject(err).then(undefined, reject),
  });
}

export type KyMock = ReturnType<typeof createKyMock>;
