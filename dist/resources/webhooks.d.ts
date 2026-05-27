import type { KyInstance } from 'ky';
/** A webhook object returned by the API. */
export interface Webhook {
    /** Unique webhook identifier. */
    id: string;
    /** Vault this webhook belongs to. */
    vaultId: string;
    /** URL that receives webhook deliveries. */
    url: string;
    /** Event types this webhook subscribes to (e.g., `['document.created', 'document.updated', 'document.deleted', 'document.moved']`). */
    events: string[];
    /** Whether the webhook is currently active. */
    isActive: boolean;
    /** ISO 8601 creation timestamp. */
    createdAt: string;
    /** ISO 8601 last-updated timestamp. */
    updatedAt: string;
}
/** A webhook with the signing secret included. Only returned on creation. */
export interface WebhookWithSecret extends Webhook {
    /** HMAC signing secret for verifying webhook payloads. Only available at creation time. */
    secret: string;
}
/** A webhook delivery log entry. */
export interface WebhookDelivery {
    /** Unique delivery identifier. */
    id: string;
    /** Webhook this delivery belongs to. */
    webhookId: string;
    /** Vault event that triggered the delivery. */
    eventId: string;
    /** HTTP status code returned by the endpoint, or `null` if delivery failed. */
    statusCode: number | null;
    /** Delivery attempt number. */
    attempt: number;
    /** Request body that was sent. */
    requestBody: unknown;
    /** Response body from the endpoint, or `null`. */
    responseBody: string | null;
    /** Error message if delivery failed, or `null`. */
    error: string | null;
    /** ISO 8601 timestamp of successful delivery, or `null`. */
    deliveredAt: string | null;
    /** ISO 8601 creation timestamp. */
    createdAt: string;
}
/** Parameters for creating a new webhook. */
export interface CreateWebhookParams {
    /** URL to receive webhook deliveries. Must be a publicly accessible HTTPS endpoint. */
    url: string;
    /** Event types to subscribe to (e.g., `['document.created', 'document.updated', 'document.deleted', 'document.moved']`). */
    events: string[];
}
/** Parameters for updating an existing webhook. */
export interface UpdateWebhookParams {
    /** New URL for the webhook endpoint. */
    url?: string;
    /** New set of event types to subscribe to. */
    events?: string[];
    /** Whether the webhook should be active. */
    isActive?: boolean;
}
/**
 * Resource for managing vault webhooks.
 *
 * Webhooks send HTTP POST notifications to external URLs when document events
 * occur in a vault. Payloads are signed with HMAC-SHA256 for verification.
 *
 * Requires a **pro** or higher subscription tier.
 *
 * @example
 * ```typescript
 * const webhooks = await client.webhooks.list('vault-123');
 * const webhook = await client.webhooks.create('vault-123', {
 *   url: 'https://example.com/webhook',
 *   events: ['document.created', 'document.updated'],
 * });
 * console.log('Save this secret:', webhook.secret);
 * ```
 */
export declare class WebhooksResource {
    private http;
    constructor(http: KyInstance);
    /**
     * Lists all webhooks for a vault.
     *
     * @param vaultId - The vault to list webhooks for
     * @returns Array of webhook objects (without secrets)
     * @throws {AuthenticationError} If not authenticated
     * @throws {AuthorizationError} If the user lacks access to the vault
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const webhooks = await client.webhooks.list('vault-123');
     * for (const wh of webhooks) {
     *   console.log(wh.url, wh.events, wh.isActive);
     * }
     * ```
     */
    list(vaultId: string): Promise<Webhook[]>;
    /**
     * Creates a new webhook in a vault.
     *
     * The signing secret is only returned on creation. Store it securely --
     * it cannot be retrieved later. Use it to verify HMAC-SHA256 signatures
     * on incoming webhook payloads.
     *
     * @param vaultId - The vault to create the webhook in
     * @param params - Webhook creation parameters
     * @returns The created webhook object including the signing secret
     * @throws {ValidationError} If parameters are invalid or the URL is blocked (SSRF protection)
     * @throws {AuthenticationError} If not authenticated
     * @throws {AuthorizationError} If the user lacks access to the vault
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const webhook = await client.webhooks.create('vault-123', {
     *   url: 'https://example.com/webhook',
     *   events: ['document.created', 'document.updated', 'document.deleted'],
     * });
     * console.log('Save this secret:', webhook.secret);
     * ```
     */
    create(vaultId: string, params: CreateWebhookParams): Promise<WebhookWithSecret>;
    /**
     * Updates an existing webhook.
     *
     * Only the provided fields are modified; omitted fields remain unchanged.
     *
     * @param vaultId - The vault the webhook belongs to
     * @param webhookId - The webhook to update
     * @param params - Fields to update
     * @returns The updated webhook object
     * @throws {ValidationError} If parameters are invalid or the URL is blocked
     * @throws {NotFoundError} If the webhook does not exist in the vault
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const updated = await client.webhooks.update('vault-123', 'wh-456', {
     *   events: ['create', 'delete'],
     *   isActive: false,
     * });
     * ```
     */
    update(vaultId: string, webhookId: string, params: UpdateWebhookParams): Promise<Webhook>;
    /**
     * Deletes a webhook permanently.
     *
     * @param vaultId - The vault the webhook belongs to
     * @param webhookId - The webhook to delete
     * @throws {NotFoundError} If the webhook does not exist in the vault
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.webhooks.delete('vault-123', 'wh-456');
     * ```
     */
    delete(vaultId: string, webhookId: string): Promise<void>;
    /**
     * Lists recent deliveries for a webhook.
     *
     * Returns up to 50 most recent delivery log entries, ordered by most recent first.
     *
     * @param vaultId - The vault the webhook belongs to
     * @param webhookId - The webhook to get deliveries for
     * @returns Array of webhook delivery log entries
     * @throws {NotFoundError} If the webhook does not exist in the vault
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const deliveries = await client.webhooks.listDeliveries('vault-123', 'wh-456');
     * for (const d of deliveries) {
     *   console.log(d.statusCode, d.attempt, d.deliveredAt);
     * }
     * ```
     */
    listDeliveries(vaultId: string, webhookId: string): Promise<WebhookDelivery[]>;
}
//# sourceMappingURL=webhooks.d.ts.map