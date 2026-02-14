import ky, { type KyInstance } from 'ky';
import { VaultsResource } from './resources/vaults.js';
import { DocumentsResource } from './resources/documents.js';
import { SearchResource } from './resources/search.js';
import { AiResource } from './resources/ai.js';
import { TeamsResource } from './resources/teams.js';
import { ApiKeysResource } from './resources/api-keys.js';
import { UserResource } from './resources/user.js';
import { SubscriptionResource } from './resources/subscription.js';
import { SharesResource } from './resources/shares.js';
import { PublishResource } from './resources/publish.js';
import { ConnectorsResource } from './resources/connectors.js';
import { AdminResource } from './resources/admin.js';
import { HooksResource } from './resources/hooks.js';
import { WebhooksResource } from './resources/webhooks.js';
import { ValidationError } from './errors.js';
import { AuditLogger } from './lib/audit-logger.js';
import { signRequest } from './lib/signature.js';
import { TokenManager, type AuthTokens, type OnTokenRefresh } from './lib/token-manager.js';

/** Header used to prevent infinite 401 retry loops. */
const RETRY_HEADER = 'X-Retry-After-Refresh';

/**
 * Configuration options for creating a {@link LifestreamVaultClient}.
 */
export interface ClientOptions {
  /** Base URL of the Lifestream Vault API server (e.g., `'https://vault.example.com'`). */
  baseUrl: string;
  /** API key for authentication (prefix `lsv_k_`). Provide either this or `accessToken`. */
  apiKey?: string;
  /** JWT access token for authentication. Provide either this or `apiKey`. */
  accessToken?: string;
  /** JWT refresh token for automatic token renewal. Only used with `accessToken`. */
  refreshToken?: string;
  /** Request timeout in milliseconds. Defaults to 30000 (30 seconds). */
  timeout?: number;
  /** Milliseconds before token expiry to trigger proactive refresh. Default: 60000 (1 min). */
  refreshBufferMs?: number;
  /** Called after a successful token refresh with the new tokens. */
  onTokenRefresh?: OnTokenRefresh;
  /** Enable HMAC-SHA256 request signing for sensitive operations. Defaults to true when using API keys, false for JWT. */
  enableRequestSigning?: boolean;
  /** Enable client-side audit logging of requests. Defaults to false. */
  enableAuditLogging?: boolean;
  /** Path to the audit log file. Defaults to `~/.lsvault/audit.log`. */
  auditLogPath?: string;
}

/**
 * Main client for the Lifestream Vault API.
 *
 * Provides access to all API resources through typed sub-clients:
 * {@link VaultsResource | vaults}, {@link DocumentsResource | documents},
 * {@link SearchResource | search}, {@link AiResource | ai},
 * {@link ApiKeysResource | apiKeys}, {@link UserResource | user},
 * {@link SubscriptionResource | subscription}, and {@link TeamsResource | teams}.
 *
 * @example
 * ```typescript
 * import { LifestreamVaultClient } from '@lifestream-vault/sdk';
 *
 * const client = new LifestreamVaultClient({
 *   baseUrl: 'https://vault.example.com',
 *   apiKey: 'lsv_k_your_api_key',
 * });
 *
 * const vaults = await client.vaults.list();
 * ```
 *
 * @example
 * ```typescript
 * // Using a JWT access token instead of an API key
 * const client = new LifestreamVaultClient({
 *   baseUrl: 'https://vault.example.com',
 *   accessToken: 'eyJhbGci...',
 *   timeout: 60_000,
 * });
 * ```
 */
export class LifestreamVaultClient {
  /** The underlying ky HTTP client instance, pre-configured with auth and base URL. */
  readonly http: KyInstance;
  /** The normalized base URL of the API server. */
  readonly baseUrl: string;
  /** Vault management operations. */
  readonly vaults: VaultsResource;
  /** Document CRUD and file operations. */
  readonly documents: DocumentsResource;
  /** Full-text search across vaults. */
  readonly search: SearchResource;
  /** AI chat and document summarization. */
  readonly ai: AiResource;
  /** API key management operations. */
  readonly apiKeys: ApiKeysResource;
  /** User profile and storage information. */
  readonly user: UserResource;
  /** Subscription management and billing. */
  readonly subscription: SubscriptionResource;
  /** Team management, members, invitations, and team vaults. */
  readonly teams: TeamsResource;
  /** Document sharing via token-based links. */
  readonly shares: SharesResource;
  /** Document publishing for public access. */
  readonly publish: PublishResource;
  /** External connector management (e.g., Google Drive sync). */
  readonly connectors: ConnectorsResource;
  /** Admin operations: stats, user management, activity, health. */
  readonly admin: AdminResource;
  /** Vault hook management (internal event handlers). */
  readonly hooks: HooksResource;
  /** Vault webhook management (outbound HTTP notifications). */
  readonly webhooks: WebhooksResource;
  /** Token manager for JWT auto-refresh (null when using API key auth). */
  readonly tokenManager: TokenManager | null;

  /**
   * Creates a new Lifestream Vault API client.
   *
   * @param options - Client configuration options
   * @param options.baseUrl - Base URL of the API server (trailing slashes are stripped)
   * @param options.apiKey - API key for authentication (mutually exclusive with `accessToken`)
   * @param options.accessToken - JWT access token (mutually exclusive with `apiKey`)
   * @param options.timeout - Request timeout in milliseconds (default: 30000)
   * @throws {ValidationError} If `baseUrl` is empty or neither `apiKey` nor `accessToken` is provided
   *
   * @example
   * ```typescript
   * const client = new LifestreamVaultClient({
   *   baseUrl: 'https://vault.example.com',
   *   apiKey: 'lsv_k_your_api_key',
   * });
   * ```
   */
  constructor(options: ClientOptions) {
    if (!options.baseUrl) {
      throw new ValidationError('baseUrl is required');
    }
    if (!options.apiKey && !options.accessToken) {
      throw new ValidationError('Either apiKey or accessToken is required');
    }

    this.baseUrl = options.baseUrl.replace(/\/$/, '');

    const prefixUrl = `${this.baseUrl}/api/v1`;
    const timeout = options.timeout || 30_000;

    // Determine whether to enable request signing
    const shouldSign = options.enableRequestSigning ?? !!options.apiKey;

    const beforeRequestHooks: Array<(request: Request) => void | Promise<void>> = [];
    const afterResponseHooks: Array<(request: Request, options: unknown, response: Response) => Response | void | Promise<Response | void>> = [];

    // Request signing hook -- adds HMAC signature headers to mutating requests
    if (shouldSign && options.apiKey) {
      const apiKeyForSigning = options.apiKey;
      beforeRequestHooks.push(async (request: Request) => {
        const url = new URL(request.url);
        const method = request.method.toUpperCase();

        // Only sign mutating operations
        if (!['PUT', 'POST', 'DELETE', 'PATCH'].includes(method)) {
          return;
        }

        // Read body for signing (clone to avoid consuming the stream)
        let body = '';
        if (request.body) {
          const cloned = request.clone();
          body = await cloned.text();
        }

        const sigHeaders = signRequest(apiKeyForSigning, method, url.pathname, body);
        for (const [key, value] of Object.entries(sigHeaders)) {
          request.headers.set(key, value);
        }
      });
    }

    // Audit logging hooks
    if (options.enableAuditLogging) {
      const auditLogger = new AuditLogger({ logPath: options.auditLogPath });
      const requestTimings = new WeakMap<Request, number>();

      beforeRequestHooks.push((request: Request) => {
        requestTimings.set(request, Date.now());
      });

      afterResponseHooks.push(
        (request: Request, _options: unknown, response: Response) => {
          const startTime = requestTimings.get(request);
          const durationMs = startTime ? Date.now() - startTime : 0;
          const url = new URL(request.url);
          try {
            auditLogger.log({
              timestamp: new Date().toISOString(),
              method: request.method,
              path: url.pathname,
              status: response.status,
              durationMs,
            });
          } catch {
            // Audit logging is best-effort; never break requests
          }
        },
      );
    }

    if (options.apiKey) {
      // API key auth: static Authorization header, no token management
      this.tokenManager = null;

      this.http = ky.create({
        prefixUrl,
        timeout,
        headers: {
          'Authorization': `Bearer ${options.apiKey}`,
        },
        hooks: {
          beforeRequest: beforeRequestHooks,
          afterResponse: afterResponseHooks,
        },
      });
    } else {
      // JWT auth: set up token manager with optional auto-refresh
      const tokenManager = new TokenManager(
        options.accessToken!,
        options.refreshToken ?? null,
        {
          refreshBufferMs: options.refreshBufferMs,
          onTokenRefresh: options.onTokenRefresh,
        },
      );
      this.tokenManager = tokenManager;

      // Base ky instance without auth hooks (used for refresh requests to avoid recursion)
      const baseHttp = ky.create({ prefixUrl, timeout });

      // JWT beforeRequest: proactive refresh + set Authorization header
      beforeRequestHooks.push(async (request: Request) => {
        if (tokenManager.needsRefresh() && tokenManager.getRefreshToken()) {
          try {
            await tokenManager.refresh(baseHttp);
          } catch {
            // Refresh failed; proceed with current token, let 401 handler deal with it
          }
        }
        request.headers.set('Authorization', `Bearer ${tokenManager.getAccessToken()}`);
      });

      // JWT afterResponse: reactive 401 retry
      afterResponseHooks.push(async (request: Request, _options: unknown, response: Response) => {
        if (
          response.status === 401
          && !request.headers.get(RETRY_HEADER)
          && tokenManager.getRefreshToken()
        ) {
          try {
            const newToken = await tokenManager.refresh(baseHttp);
            const retryRequest = new Request(request, {
              headers: new Headers(request.headers),
            });
            retryRequest.headers.set('Authorization', `Bearer ${newToken}`);
            retryRequest.headers.set(RETRY_HEADER, '1');
            return ky(retryRequest);
          } catch {
            // Refresh failed; return original 401
            return response;
          }
        }
        return response;
      });

      this.http = ky.create({
        prefixUrl,
        timeout,
        hooks: {
          beforeRequest: beforeRequestHooks,
          afterResponse: afterResponseHooks,
        },
      });
    }

    this.vaults = new VaultsResource(this.http);
    this.documents = new DocumentsResource(this.http);
    this.search = new SearchResource(this.http);
    this.ai = new AiResource(this.http);
    this.apiKeys = new ApiKeysResource(this.http);
    this.user = new UserResource(this.http);
    this.subscription = new SubscriptionResource(this.http);
    this.teams = new TeamsResource(this.http);
    this.shares = new SharesResource(this.http);
    this.publish = new PublishResource(this.http);
    this.connectors = new ConnectorsResource(this.http);
    this.admin = new AdminResource(this.http);
    this.hooks = new HooksResource(this.http);
    this.webhooks = new WebhooksResource(this.http);
  }

  /**
   * Authenticate with email and password to obtain JWT tokens.
   * Returns an authenticated client instance with token management.
   *
   * @param baseUrl - Base URL of the API server
   * @param email - User email address
   * @param password - User password
   * @param options - Additional client options (timeout, refreshBufferMs, onTokenRefresh, etc.)
   * @returns A new authenticated client with the access/refresh tokens used
   */
  static async login(
    baseUrl: string,
    email: string,
    password: string,
    options: Omit<ClientOptions, 'baseUrl' | 'apiKey' | 'accessToken' | 'refreshToken'> = {},
  ): Promise<{ client: LifestreamVaultClient; tokens: AuthTokens; refreshToken: string | null }> {
    const normalizedUrl = baseUrl.replace(/\/$/, '');
    const http = ky.create({
      prefixUrl: `${normalizedUrl}/api/v1`,
      timeout: options.timeout || 30_000,
    });

    const response = await http.post('auth/login', {
      json: { email, password },
    });

    const tokens: AuthTokens = await response.json();

    // Extract refresh token from Set-Cookie header if present
    const setCookie = response.headers.get('set-cookie');
    let refreshToken: string | null = null;
    if (setCookie) {
      const match = setCookie.match(/lsv_refresh=([^;]+)/);
      if (match) {
        refreshToken = match[1];
      }
    }

    const client = new LifestreamVaultClient({
      ...options,
      baseUrl: normalizedUrl,
      accessToken: tokens.accessToken,
      refreshToken: refreshToken ?? undefined,
    });

    return { client, tokens, refreshToken };
  }
}
