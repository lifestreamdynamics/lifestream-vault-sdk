import type { KyInstance } from 'ky';
/** Subscription details with current usage. */
export interface Subscription {
    /** Subscription tier, plan details, and status. */
    subscription: {
        tier: string;
        expiresAt: string | null;
        isActive: boolean;
    };
    /** Current resource usage counts. */
    usage: {
        vaultCount: number;
        totalStorageBytes: number;
        apiCallsThisMonth: number;
        aiTokens: number;
        hookExecutions: number;
        webhookDeliveries: number;
    };
}
/** A subscription plan definition. */
export interface Plan {
    /** Plan tier identifier. */
    tier: string;
    /** Human-readable plan name. */
    name: string;
    /** Plan resource limits. */
    limits: Record<string, number>;
    /** Plan feature flags. */
    features: Record<string, boolean>;
}
/** A checkout session for upgrading subscription. */
export interface CheckoutSession {
    /** URL to redirect the user to for payment. */
    url: string;
    /** Unique session identifier. */
    sessionId: string;
}
/** A billing portal session. */
export interface PortalSession {
    /** URL to redirect the user to for billing management. */
    url: string;
}
/** An invoice record. */
export interface Invoice {
    /** Unique invoice identifier. */
    id: string;
    /** Invoice amount in smallest currency unit. */
    amount: number;
    /** ISO 4217 currency code. */
    currency: string;
    /** Invoice status (e.g., `paid`, `open`, `void`). */
    status: string;
    /** ISO 8601 creation timestamp. */
    createdAt: string;
    /** ISO 8601 payment timestamp, or `null` if unpaid. */
    paidAt: string | null;
    /** URL to view the invoice, or `null`. */
    invoiceUrl: string | null;
}
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
export declare class SubscriptionResource {
    private http;
    constructor(http: KyInstance);
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
    get(): Promise<Subscription>;
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
    listPlans(): Promise<Plan[]>;
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
    createCheckoutSession(tier: string, returnUrl: string): Promise<CheckoutSession>;
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
    cancel(reason?: string): Promise<void>;
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
    createPortalSession(returnUrl: string): Promise<PortalSession>;
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
    listInvoices(): Promise<Invoice[]>;
}
//# sourceMappingURL=subscription.d.ts.map