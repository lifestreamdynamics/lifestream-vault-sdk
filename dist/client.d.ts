import { type KyInstance } from 'ky';
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
import { TokenManager, type AuthTokens, type OnTokenRefresh } from './lib/token-manager.js';
import { SDKEventEmitter } from './lib/event-emitter.js';
import type { MfaMethod } from './types/api.js';
/** Default API URL used when `baseUrl` is not provided. */
export declare const DEFAULT_API_URL = "https://vault.lifestreamdynamics.com";
/**
 * Configuration options for creating a {@link LifestreamVaultClient}.
 */
export interface ClientOptions {
    /** Base URL of the Lifestream Vault API server. Defaults to `'https://vault.lifestreamdynamics.com'`. */
    baseUrl?: string;
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
    /** SCIM Bearer token. When provided, enables the `scim` resource for user provisioning. */
    scimToken?: string;
    /** Custom beforeRequest hooks. Called before each outgoing request. */
    beforeRequest?: Array<(request: Request) => void | Promise<void>>;
    /** Custom afterResponse hooks. Called after each response is received. */
    afterResponse?: Array<(request: Request, response: Response) => void | Promise<void>>;
    /** Event emitter for SDK lifecycle events (beforeRequest, afterResponse, error, tokenRefresh). */
    events?: SDKEventEmitter;
    /**
     * Retry configuration for failed requests.
     *
     * **Retry is ON by default.** When this option is omitted the SDK applies a
     * sensible default config: up to 3 retries on status codes
     * `[408, 429, 500, 502, 503, 504]` with exponential back-off capped at
     * 30 000 ms.  For 429 and 503 responses ky automatically waits the duration
     * specified in the server's `Retry-After` header before retrying (up to the
     * `backoffLimit`), so throttled requests are retried transparently without
     * the caller ever seeing an error.
     *
     * Pass `{ limit: 0 }` to disable retry entirely.
     *
     * **Methods:** by default only `GET`, `PUT`, `HEAD`, `DELETE`, `OPTIONS`,
     * and `TRACE` are retried (ky's default safe-method set).  `POST` and
     * `PATCH` are intentionally excluded because they are not guaranteed
     * idempotent — document-mutating `POST` requests that partially succeeded
     * could be duplicated on retry.
     */
    retry?: {
        /** Maximum number of retries. Default: 3. Set to 0 to disable. */
        limit?: number;
        /** HTTP status codes that trigger a retry. Default: [408, 429, 500, 502, 503, 504]. */
        statusCodes?: number[];
        /**
         * HTTP methods eligible for retry.
         * Default: `['get', 'put', 'head', 'delete', 'options', 'trace']` (ky default safe-method set).
         * POST and PATCH are excluded because they are not guaranteed idempotent.
         */
        methods?: string[];
        /** Maximum backoff time in milliseconds. Default: 30000. */
        backoffLimit?: number;
        /** Custom delay function. Receives attempt count (starting at 1), returns ms to wait. */
        delay?: (attemptCount: number) => number;
    };
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
export declare class LifestreamVaultClient {
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
    /** Multi-factor authentication management (TOTP, passkeys, backup codes). */
    readonly mfa: MfaResource;
    /** Calendar, activity, and due date operations. */
    readonly calendar: CalendarResource;
    /** Custom domain management for published vaults. */
    readonly customDomains: CustomDomainsResource;
    /** Analytics for published documents and share links. */
    readonly analytics: AnalyticsResource;
    /** Whole-vault publishing (multi-document public sites). */
    readonly publishVault: PublishVaultResource;
    /** Booking slot and guest booking management. */
    readonly booking: BookingResource;
    /** Team booking group management (Business tier). */
    readonly teamBookingGroups: TeamBookingGroupsResource;
    /** SAML SSO configuration management and metadata retrieval. */
    readonly saml: SamlResource;
    /** SCIM 2.0 user provisioning (null when no scimToken is configured). */
    readonly scim: ScimResource | null;
    /** Plugin/extension marketplace management. */
    readonly plugins: PluginsResource;
    /** Real-time collaborative editing WebSocket URL builder. */
    readonly collaboration: CollaborationResource;
    /** Token manager for JWT auto-refresh (null when using API key auth). */
    readonly tokenManager: TokenManager | null;
    /** Event emitter for SDK lifecycle events. Undefined if not provided in options. */
    readonly events?: SDKEventEmitter;
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
    constructor(options: ClientOptions);
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
    static login(baseUrl: string | undefined, email: string, password: string, options?: Omit<ClientOptions, 'baseUrl' | 'apiKey' | 'accessToken' | 'refreshToken'>, mfaOptions?: {
        mfaCode?: string;
        onMfaRequired?: (challenge: {
            methods: MfaMethod[];
            mfaToken: string;
        }) => Promise<{
            method: 'totp' | 'backup_code';
            code: string;
        }>;
    }): Promise<{
        client: LifestreamVaultClient;
        tokens: AuthTokens;
        refreshToken: string | null;
    }>;
}
//# sourceMappingURL=client.d.ts.map