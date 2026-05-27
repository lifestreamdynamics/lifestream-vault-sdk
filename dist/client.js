import ky from 'ky';
import { RETRYABLE_STATUS_CODES } from '@lifestreamdynamics/vault-shared';
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
import { MfaResource } from './resources/mfa.js';
import { CalendarResource } from './resources/calendar.js';
import { CustomDomainsResource } from './resources/custom-domains.js';
import { AnalyticsResource } from './resources/analytics.js';
import { PublishVaultResource } from './resources/publish-vault.js';
import { BookingResource } from './resources/booking.js';
import { TeamBookingGroupsResource } from './resources/team-booking-groups.js';
import { SamlResource } from './resources/saml.js';
import { ScimResource } from './resources/scim.js';
import { PluginsResource } from './resources/plugins.js';
import { CollaborationResource } from './resources/collaboration.js';
import { ValidationError } from './errors.js';
// Audit logging lives at `@lifestreamdynamics/vault-sdk/audit` — Node-only
// because it touches `node:fs`/`node:path`/`node:os`. The main client must
// never reference it (Metro/RN bundlers cannot tree-shake `await import()`,
// so even a lazy import would drag node:* into the bundle).
import { signRequest } from './lib/signature.js';
import { TokenManager } from './lib/token-manager.js';
import { isMfaChallenge } from './types/api.js';
/** Header used to prevent infinite 401 retry loops. */
const RETRY_HEADER = 'X-Retry-After-Refresh';
/** Default API URL used when `baseUrl` is not provided. */
export const DEFAULT_API_URL = 'https://vault.lifestreamdynamics.com';
/**
 * Extracts the `lsv_refresh` token value from a `Set-Cookie` header string.
 * Returns null if the header is absent or the cookie is not present.
 */
function extractRefreshToken(setCookie) {
    if (!setCookie)
        return null;
    const match = setCookie.match(/lsv_refresh=([^;]+)/);
    return match ? match[1] : null;
}
/**
 * Main client for the Lifestream Vault API.
 *
 * Provides access to all API resources through typed sub-clients:
 * {@link VaultsResource | vaults}, {@link DocumentsResource | documents},
 * {@link SearchResource | search}, {@link AiResource | ai},
 * {@link ApiKeysResource | apiKeys}, {@link UserResource | user},
 * {@link SubscriptionResource | subscription}, {@link TeamsResource | teams},
 * {@link SharesResource | shares}, {@link PublishResource | publish},
 * {@link ConnectorsResource | connectors}, {@link AdminResource | admin},
 * {@link HooksResource | hooks}, {@link WebhooksResource | webhooks},
 * {@link MfaResource | mfa}, {@link CalendarResource | calendar},
 * {@link CustomDomainsResource | customDomains}, {@link AnalyticsResource | analytics},
 * {@link PublishVaultResource | publishVault}, {@link BookingResource | booking},
 * {@link TeamBookingGroupsResource | teamBookingGroups},
 * {@link SamlResource | saml}, {@link ScimResource | scim},
 * {@link PluginsResource | plugins}, and {@link CollaborationResource | collaboration}.
 *
 * When `baseUrl` is omitted, it defaults to `'https://vault.lifestreamdynamics.com'`.
 *
 * @example
 * ```typescript
 * import { LifestreamVaultClient } from '@lifestreamdynamics/vault-sdk';
 *
 * // Uses the default production URL
 * const client = new LifestreamVaultClient({
 *   apiKey: 'lsv_k_your_api_key',
 * });
 *
 * const vaults = await client.vaults.list();
 * ```
 *
 * @example
 * ```typescript
 * // Using a custom base URL and JWT access token
 * const client = new LifestreamVaultClient({
 *   baseUrl: 'https://vault.example.com',
 *   accessToken: 'eyJhbGci...',
 *   timeout: 60_000,
 * });
 * ```
 */
export class LifestreamVaultClient {
    /** The underlying ky HTTP client instance, pre-configured with auth and base URL. */
    http;
    /** The normalized base URL of the API server. */
    baseUrl;
    /** Vault management operations. */
    vaults;
    /** Document CRUD and file operations. */
    documents;
    /** Full-text search across vaults. */
    search;
    /** AI chat and document summarization. */
    ai;
    /** API key management operations. */
    apiKeys;
    /** User profile and storage information. */
    user;
    /** Subscription management and billing. */
    subscription;
    /** Team management, members, invitations, and team vaults. */
    teams;
    /** Document sharing via token-based links. */
    shares;
    /** Document publishing for public access. */
    publish;
    /** External connector management (e.g., Google Drive sync). */
    connectors;
    /** Admin operations: stats, user management, activity, health. */
    admin;
    /** Vault hook management (internal event handlers). */
    hooks;
    /** Vault webhook management (outbound HTTP notifications). */
    webhooks;
    /** Multi-factor authentication management (TOTP, passkeys, backup codes). */
    mfa;
    /** Calendar, activity, and due date operations. */
    calendar;
    /** Custom domain management for published vaults. */
    customDomains;
    /** Analytics for published documents and share links. */
    analytics;
    /** Whole-vault publishing (multi-document public sites). */
    publishVault;
    /** Booking slot and guest booking management. */
    booking;
    /** Team booking group management (Business tier). */
    teamBookingGroups;
    /** SAML SSO configuration management and metadata retrieval. */
    saml;
    /** SCIM 2.0 user provisioning (null when no scimToken is configured). */
    scim;
    /** Plugin/extension marketplace management. */
    plugins;
    /** Real-time collaborative editing WebSocket URL builder. */
    collaboration;
    /** Token manager for JWT auto-refresh (null when using API key auth). */
    tokenManager;
    /** Event emitter for SDK lifecycle events. Undefined if not provided in options. */
    events;
    /**
     * Creates a new Lifestream Vault API client.
     *
     * @param options - Client configuration options
     * @param options.baseUrl - Base URL of the API server (trailing slashes are stripped). Defaults to `'https://vault.lifestreamdynamics.com'`.
     * @param options.apiKey - API key for authentication (mutually exclusive with `accessToken`)
     * @param options.accessToken - JWT access token (mutually exclusive with `apiKey`)
     * @param options.timeout - Request timeout in milliseconds (default: 30000)
     * @throws {ValidationError} If neither `apiKey` nor `accessToken` is provided
     *
     * @example
     * ```typescript
     * const client = new LifestreamVaultClient({
     *   baseUrl: 'https://vault.example.com',
     *   apiKey: 'lsv_k_your_api_key',
     * });
     * ```
     */
    constructor(options) {
        if (!options.apiKey && !options.accessToken) {
            throw new ValidationError('Either apiKey or accessToken is required');
        }
        this.baseUrl = (options.baseUrl || DEFAULT_API_URL).replace(/\/$/, '');
        this.events = options.events;
        const prefixUrl = `${this.baseUrl}/api/v1`;
        const timeout = options.timeout || 30_000;
        // Determine whether to enable request signing
        const shouldSign = options.enableRequestSigning ?? !!options.apiKey;
        // Build retry config — always-on with sensible defaults.
        // Callers can override any field; pass `{ limit: 0 }` to disable.
        // afterStatusCodes tells ky which status codes should use the Retry-After
        // header to schedule the next attempt — 429 (rate-limit) and 503
        // (service unavailable) are the canonical ones.
        const retryConfig = {
            limit: options.retry?.limit ?? 3,
            statusCodes: options.retry?.statusCodes ?? [...RETRYABLE_STATUS_CODES],
            methods: options.retry?.methods,
            backoffLimit: options.retry?.backoffLimit ?? 30_000,
            delay: options.retry?.delay,
            // Honor Retry-After on 429 and 503 (ky's default afterStatusCodes already
            // includes these, but we list them explicitly so intent is clear).
            afterStatusCodes: [429, 503],
        };
        const beforeRequestHooks = [];
        const afterResponseHooks = [];
        // Request signing hook -- adds HMAC signature headers to mutating requests
        if (shouldSign && options.apiKey) {
            const apiKeyForSigning = options.apiKey;
            beforeRequestHooks.push(async (request) => {
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
                // signRequest is now async (uses Web Crypto API for browser compatibility)
                const sigHeaders = await signRequest(apiKeyForSigning, method, url.pathname, body);
                for (const [key, value] of Object.entries(sigHeaders)) {
                    request.headers.set(key, value);
                }
            });
        }
        // Audit logging is opt-in via `installAuditLogging(client, ...)` from
        // `@lifestreamdynamics/vault-sdk/audit` (Node-only consumers).
        // Event emitter hooks (timing-aware; run after audit logging to capture accurate durations)
        const emitter = options.events;
        const eventTimings = emitter ? new WeakMap() : null;
        if (emitter && eventTimings) {
            beforeRequestHooks.push((request) => {
                eventTimings.set(request, Date.now());
                const url = new URL(request.url);
                emitter.emit('beforeRequest', { url: url.href, method: request.method });
            });
            afterResponseHooks.push((request, _options, response) => {
                const startTime = eventTimings.get(request);
                const durationMs = startTime !== undefined ? Date.now() - startTime : 0;
                const url = new URL(request.url);
                emitter.emit('afterResponse', {
                    url: url.href,
                    method: request.method,
                    status: response.status,
                    durationMs,
                });
            });
        }
        // Append user-supplied hooks (run last so they see the final request state)
        if (options.beforeRequest) {
            for (const hook of options.beforeRequest) {
                // Wrap user hook to match ky's hook signature
                beforeRequestHooks.push((request) => hook(request));
            }
        }
        if (options.afterResponse) {
            for (const hook of options.afterResponse) {
                // Wrap user hook to match ky's 4-arg signature
                afterResponseHooks.push((request, _options, response) => hook(request, response));
            }
        }
        // Build beforeError hooks for error event emission
        const beforeErrorHooks = [];
        if (emitter) {
            beforeErrorHooks.push((error) => {
                const req = error.request;
                const url = req ? new URL(req.url).href : 'unknown';
                const method = req ? req.method : 'unknown';
                emitter.emit('error', { url, method, error });
                return error;
            });
        }
        // Build beforeRetry hooks for retry observability.
        // Fires once per retry attempt, AFTER ky has decided to retry and BEFORE
        // the next request is sent (including any Retry-After wait).
        const beforeRetryHooks = [];
        if (emitter) {
            beforeRetryHooks.push(({ request, error, retryCount }) => {
                const url = new URL(request.url);
                // error.response is present when the retry was triggered by a non-2xx
                // HTTP response (e.g. 429); it is absent for network-level errors.
                const status = error.response?.status;
                emitter.emit('retry', {
                    url: url.href,
                    method: request.method,
                    retryCount,
                    status,
                    error,
                });
            });
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
                    ...(beforeErrorHooks.length > 0 ? { beforeError: beforeErrorHooks } : {}),
                    ...(beforeRetryHooks.length > 0 ? { beforeRetry: beforeRetryHooks } : {}),
                },
                retry: retryConfig,
            });
        }
        else {
            // JWT auth: set up token manager with optional auto-refresh
            const tokenManager = new TokenManager(options.accessToken, options.refreshToken ?? null, {
                refreshBufferMs: options.refreshBufferMs,
                onTokenRefresh: options.onTokenRefresh,
            });
            this.tokenManager = tokenManager;
            // Base ky instance without auth hooks (used for refresh requests to avoid recursion)
            const baseHttp = ky.create({ prefixUrl, timeout });
            // Late-binding reference: the 401-retry hook must call the fully-configured
            // http instance (which carries signing, audit-logging, and timeout settings)
            // rather than the raw global ky() function. It is assigned after ky.create()
            // below. The hook closure captures this variable, so by the time any 401 is
            // received the assignment will already have taken place.
            let configuredHttp;
            // JWT beforeRequest: proactive refresh + set Authorization header
            beforeRequestHooks.push(async (request) => {
                if (tokenManager.needsRefresh() && tokenManager.getRefreshToken()) {
                    try {
                        await tokenManager.refresh(baseHttp);
                    }
                    catch {
                        // Refresh failed; proceed with current token, let 401 handler deal with it
                    }
                }
                request.headers.set('Authorization', `Bearer ${tokenManager.getAccessToken()}`);
            });
            // JWT afterResponse: reactive 401 retry
            afterResponseHooks.push(async (request, _options, response) => {
                if (response.status === 401
                    && !request.headers.get(RETRY_HEADER)
                    && tokenManager.getRefreshToken()) {
                    try {
                        const newToken = await tokenManager.refresh(baseHttp);
                        const retryRequest = new Request(request, {
                            headers: new Headers(request.headers),
                        });
                        retryRequest.headers.set('Authorization', `Bearer ${newToken}`);
                        retryRequest.headers.set(RETRY_HEADER, '1');
                        // Emit successful token refresh event
                        emitter?.emit('tokenRefresh', { success: true });
                        // Use the configured ky instance so signing, audit-logging, and
                        // timeout settings are all applied to the retry request.
                        return configuredHttp(retryRequest);
                    }
                    catch {
                        // Emit failed token refresh event
                        emitter?.emit('tokenRefresh', { success: false });
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
                    ...(beforeErrorHooks.length > 0 ? { beforeError: beforeErrorHooks } : {}),
                    ...(beforeRetryHooks.length > 0 ? { beforeRetry: beforeRetryHooks } : {}),
                },
                retry: retryConfig,
            });
            // Assign the late-binding reference now that this.http is fully constructed.
            configuredHttp = this.http;
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
        this.mfa = new MfaResource(this.http);
        this.calendar = new CalendarResource(this.http);
        this.customDomains = new CustomDomainsResource(this.http);
        this.analytics = new AnalyticsResource(this.http);
        this.publishVault = new PublishVaultResource(this.http);
        this.booking = new BookingResource(this.http);
        this.teamBookingGroups = new TeamBookingGroupsResource(this.http);
        this.saml = new SamlResource(this.http, this.baseUrl);
        if (options.scimToken) {
            const scimHttp = ky.create({
                prefixUrl: `${this.baseUrl}/api/v1/scim/v2`,
                timeout,
                headers: { 'Authorization': `Bearer ${options.scimToken}` },
                hooks: {
                    ...(beforeErrorHooks.length > 0 ? { beforeError: beforeErrorHooks } : {}),
                    ...(beforeRetryHooks.length > 0 ? { beforeRetry: beforeRetryHooks } : {}),
                },
                retry: retryConfig,
            });
            this.scim = new ScimResource(scimHttp);
        }
        else {
            this.scim = null;
        }
        this.plugins = new PluginsResource(this.http);
        this.collaboration = new CollaborationResource(this.baseUrl);
    }
    /**
     * Authenticate with email and password to obtain JWT tokens.
     * Returns an authenticated client instance with token management.
     *
     * If the account has MFA enabled, either provide `mfaCode` directly or use
     * the `onMfaRequired` callback to prompt for the code interactively.
     *
     * @param baseUrl - Base URL of the API server. Defaults to `'https://vault.lifestreamdynamics.com'`.
     * @param email - User email address
     * @param password - User password
     * @param options - Additional client options (timeout, refreshBufferMs, onTokenRefresh, etc.)
     * @param mfaOptions - MFA handling options
     * @param mfaOptions.mfaCode - Optional MFA code to provide upfront (TOTP or backup code)
     * @param mfaOptions.onMfaRequired - Optional callback to handle MFA challenges interactively
     * @returns A new authenticated client with the access/refresh tokens used
     * @throws {ValidationError} If MFA is required but no MFA options are provided
     *
     * @example
     * ```typescript
     * // Login with MFA code provided upfront
     * const { client } = await LifestreamVaultClient.login(
     *   undefined,
     *   'user@example.com',
     *   'password123',
     *   {},
     *   { mfaCode: '123456' }
     * );
     * ```
     *
     * @example
     * ```typescript
     * // Login with interactive MFA prompt
     * const { client } = await LifestreamVaultClient.login(
     *   undefined,
     *   'user@example.com',
     *   'password123',
     *   {},
     *   {
     *     onMfaRequired: async (challenge) => {
     *       console.log('MFA required. Available methods:', challenge.methods);
     *       const code = await promptUserForCode(); // Your input function
     *       return { method: 'totp', code };
     *     }
     *   }
     * );
     * ```
     */
    static async login(baseUrl, email, password, options = {}, mfaOptions) {
        const normalizedUrl = (baseUrl || DEFAULT_API_URL).replace(/\/$/, '');
        const http = ky.create({
            prefixUrl: `${normalizedUrl}/api/v1`,
            timeout: options.timeout || 30_000,
        });
        const loginResponse = await http.post('auth/login', {
            json: { email, password },
        });
        const loginData = await loginResponse.json();
        // Check if MFA is required
        if (isMfaChallenge(loginData)) {
            // MFA challenge received
            const challenge = {
                methods: loginData.mfaMethods,
                mfaToken: loginData.mfaToken,
            };
            let mfaCode;
            let mfaMethod;
            if (mfaOptions?.mfaCode) {
                // Use provided MFA code (assume TOTP by default)
                mfaCode = mfaOptions.mfaCode;
                mfaMethod = 'totp';
            }
            else if (mfaOptions?.onMfaRequired) {
                // Call interactive callback
                const result = await mfaOptions.onMfaRequired(challenge);
                mfaCode = result.code;
                mfaMethod = result.method;
            }
            else {
                // No MFA options provided
                throw new ValidationError(`MFA is required but no MFA code or callback provided. Available methods: ${challenge.methods.join(', ')}`);
            }
            // Submit MFA verification
            const mfaEndpoint = mfaMethod === 'totp' ? 'auth/mfa/totp' : 'auth/mfa/backup-code';
            const mfaResponse = await http.post(mfaEndpoint, {
                json: { mfaToken: challenge.mfaToken, code: mfaCode },
            });
            const mfaData = await mfaResponse.json();
            const tokens = {
                accessToken: mfaData.accessToken,
                user: {
                    id: mfaData.user.id,
                    email: mfaData.user.email,
                    displayName: mfaData.user.displayName,
                    role: mfaData.user.role,
                },
            };
            // Extract refresh token from Set-Cookie header if present
            const refreshToken = extractRefreshToken(mfaResponse.headers.get('set-cookie'));
            const client = new LifestreamVaultClient({
                ...options,
                baseUrl: normalizedUrl,
                accessToken: tokens.accessToken,
                refreshToken: refreshToken ?? undefined,
            });
            return { client, tokens, refreshToken };
        }
        // No MFA required, proceed with normal login
        const authData = loginData;
        const tokens = {
            accessToken: authData.accessToken,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                displayName: authData.user.displayName,
                role: authData.user.role,
            },
        };
        // Extract refresh token from Set-Cookie header if present
        const refreshToken = extractRefreshToken(loginResponse.headers.get('set-cookie'));
        const client = new LifestreamVaultClient({
            ...options,
            baseUrl: normalizedUrl,
            accessToken: tokens.accessToken,
            refreshToken: refreshToken ?? undefined,
        });
        return { client, tokens, refreshToken };
    }
}
//# sourceMappingURL=client.js.map