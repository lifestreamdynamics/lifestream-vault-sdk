import { handleError } from '../handle-error.js';
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
export class WebhooksResource {
    http;
    constructor(http) {
        this.http = http;
    }
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
    async list(vaultId) {
        try {
            const data = await this.http.get(`vaults/${vaultId}/webhooks`).json();
            return data.webhooks;
        }
        catch (error) {
            throw await handleError(error, 'Webhooks', vaultId);
        }
    }
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
    async create(vaultId, params) {
        try {
            return await this.http
                .post(`vaults/${vaultId}/webhooks`, { json: params })
                .json();
        }
        catch (error) {
            throw await handleError(error, 'Webhook', params.url);
        }
    }
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
    async update(vaultId, webhookId, params) {
        try {
            return await this.http
                .put(`vaults/${vaultId}/webhooks/${webhookId}`, { json: params })
                .json();
        }
        catch (error) {
            throw await handleError(error, 'Webhook', webhookId);
        }
    }
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
    async delete(vaultId, webhookId) {
        try {
            await this.http.delete(`vaults/${vaultId}/webhooks/${webhookId}`);
        }
        catch (error) {
            throw await handleError(error, 'Webhook', webhookId);
        }
    }
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
    async listDeliveries(vaultId, webhookId) {
        try {
            const data = await this.http
                .get(`vaults/${vaultId}/webhooks/${webhookId}/deliveries`)
                .json();
            return data.deliveries;
        }
        catch (error) {
            throw await handleError(error, 'Webhook', webhookId);
        }
    }
}
//# sourceMappingURL=webhooks.js.map