import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

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
    apiCallsToday: number;
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
export class SubscriptionResource {
  constructor(private http: KyInstance) {}

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
  async get(): Promise<Subscription> {
    try {
      return await this.http.get('subscription').json<Subscription>();
    } catch (error) {
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
  async listPlans(): Promise<Plan[]> {
    try {
      const data = await this.http.get('subscription/plans').json<{ plans: Plan[] }>();
      return data.plans;
    } catch (error) {
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
  async createCheckoutSession(tier: string, returnUrl: string): Promise<CheckoutSession> {
    try {
      return await this.http.post('subscription/checkout', {
        json: { tier, returnUrl },
      }).json<CheckoutSession>();
    } catch (error) {
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
  async cancel(reason?: string): Promise<void> {
    try {
      await this.http.post('subscription/cancel', {
        json: { reason },
      }).json();
    } catch (error) {
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
  async createPortalSession(returnUrl: string): Promise<PortalSession> {
    try {
      return await this.http.post('subscription/portal', {
        json: { returnUrl },
      }).json<PortalSession>();
    } catch (error) {
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
  async listInvoices(): Promise<Invoice[]> {
    try {
      const data = await this.http.get('subscription/invoices').json<{ invoices: Invoice[] }>();
      return data.invoices;
    } catch (error) {
      throw await handleError(error, 'Invoices', '');
    }
  }
}
