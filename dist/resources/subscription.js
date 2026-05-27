import { handleError } from '../handle-error.js';
/**
 * Resource for managing subscriptions and billing.
 *
 * @example
 * ```typescript
 * const sub = await client.subscription.get();
 * console.log(`Plan: ${sub.subscription.tier}`);
 *
 * const plans = await client.subscription.listPlans();
 * plans.forEach(p => console.log(p.name));
 * ```
 */
export class SubscriptionResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * Retrieves the current user's subscription details and usage.
     *
     * @returns Subscription object with usage breakdown
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const sub = await client.subscription.get();
     * console.log(`Plan: ${sub.subscription.tier}, Active: ${sub.subscription.isActive}`);
     * console.log(`Vaults: ${sub.usage.vaultCount}`);
     * ```
     */
    async get() {
        try {
            return await this.http.get('subscription').json();
        }
        catch (error) {
            throw await handleError(error, 'Subscription', '');
        }
    }
    /**
     * Lists all available subscription plans.
     *
     * @returns Array of available plans
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const plans = await client.subscription.listPlans();
     * plans.forEach(p => console.log(`${p.name}: ${JSON.stringify(p.limits)}`));
     * ```
     */
    async listPlans() {
        try {
            const data = await this.http.get('subscription/plans').json();
            return data.plans;
        }
        catch (error) {
            throw await handleError(error, 'Plans', '');
        }
    }
    /**
     * Creates a checkout session for upgrading to a paid plan.
     *
     * @param tier - Subscription tier to upgrade to (`pro` or `business`)
     * @param returnUrl - URL to redirect after checkout completes
     * @returns Checkout session with redirect URL
     * @throws {AuthenticationError} If not authenticated
     * @throws {ValidationError} If the tier is invalid or not an upgrade
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const session = await client.subscription.createCheckoutSession(
     *   'pro',
     *   'https://app.example.com/subscription/success'
     * );
     * console.log('Redirect to:', session.url);
     * ```
     */
    async createCheckoutSession(tier, returnUrl) {
        try {
            return await this.http.post('subscription/checkout', {
                json: { tier, returnUrl },
            }).json();
        }
        catch (error) {
            throw await handleError(error, 'Checkout', '');
        }
    }
    /**
     * Cancels the current subscription.
     *
     * @param reason - Optional cancellation reason
     * @throws {AuthenticationError} If not authenticated
     * @throws {ValidationError} If no active subscription exists
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.subscription.cancel('Switching to self-hosted');
     * ```
     */
    async cancel(reason) {
        try {
            await this.http.post('subscription/cancel', {
                json: { reason },
            });
        }
        catch (error) {
            throw await handleError(error, 'Subscription', '');
        }
    }
    /**
     * Creates a billing portal session for managing payment methods and invoices.
     *
     * @param returnUrl - URL to redirect after the portal session ends
     * @returns Portal session with redirect URL
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const portal = await client.subscription.createPortalSession(
     *   'https://app.example.com/settings/billing'
     * );
     * console.log('Redirect to:', portal.url);
     * ```
     */
    async createPortalSession(returnUrl) {
        try {
            return await this.http.post('subscription/portal', {
                json: { returnUrl },
            }).json();
        }
        catch (error) {
            throw await handleError(error, 'Portal', '');
        }
    }
    /**
     * Lists all invoices for the current user.
     *
     * @returns Array of invoice records
     * @throws {AuthenticationError} If not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const invoices = await client.subscription.listInvoices();
     * invoices.forEach(inv => {
     *   console.log(`${inv.createdAt}: ${inv.amount} ${inv.currency} - ${inv.status}`);
     * });
     * ```
     */
    async listInvoices() {
        try {
            const data = await this.http.get('subscription/invoices').json();
            return data.invoices;
        }
        catch (error) {
            throw await handleError(error, 'Invoices', '');
        }
    }
}
//# sourceMappingURL=subscription.js.map