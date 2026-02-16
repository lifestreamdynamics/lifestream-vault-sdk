import { describe, it, expect, beforeEach } from 'vitest';
import { SubscriptionResource } from './subscription.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, AuthenticationError, ValidationError } from '../errors.js';

describe('SubscriptionResource', () => {
  let resource: SubscriptionResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new SubscriptionResource(kyMock as any);
  });

  describe('get', () => {
    it('should return subscription with usage', async () => {
      const mockSub = {
        subscription: { tier: 'pro', expiresAt: '2025-12-31T00:00:00Z', isActive: true },
        usage: {
          vaultCount: 5,
          totalStorageBytes: 10485760,
          apiCallsThisMonth: 42,
          aiTokens: 1000,
          hookExecutions: 25,
          webhookDeliveries: 10,
        },
      };
      mockJsonResponse(kyMock.get, mockSub);

      const result = await resource.get();

      expect(kyMock.get).toHaveBeenCalledWith('subscription');
      expect(result).toEqual(mockSub);
      expect(result.subscription.tier).toBe('pro');
      expect(result.usage.vaultCount).toBe(5);
    });

    it('should handle free tier subscription', async () => {
      const mockSub = {
        subscription: { tier: 'free', expiresAt: null, isActive: true },
        usage: {
          vaultCount: 1,
          totalStorageBytes: 0,
          apiCallsThisMonth: 0,
          aiTokens: 0,
          hookExecutions: 0,
          webhookDeliveries: 0,
        },
      };
      mockJsonResponse(kyMock.get, mockSub);

      const result = await resource.get();

      expect(result.subscription.expiresAt).toBeNull();
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.get()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.get()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('listPlans', () => {
    it('should return available plans', async () => {
      const mockPlans = [
        { tier: 'free', name: 'Free', limits: { maxVaults: 3 }, features: { ai: false } },
        { tier: 'pro', name: 'Pro', limits: { maxVaults: 20 }, features: { ai: true } },
        { tier: 'business', name: 'Business', limits: { maxVaults: 100 }, features: { ai: true } },
      ];
      mockJsonResponse(kyMock.get, { plans: mockPlans });

      const result = await resource.listPlans();

      expect(kyMock.get).toHaveBeenCalledWith('subscription/plans');
      expect(result).toEqual(mockPlans);
      expect(result).toHaveLength(3);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listPlans()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session', async () => {
      const mockSession = { url: 'https://checkout.example.com/session-1', sessionId: 'ses_123' };
      mockJsonResponse(kyMock.post, mockSession);

      const result = await resource.createCheckoutSession('pro', 'https://app.example.com/success');

      expect(kyMock.post).toHaveBeenCalledWith('subscription/checkout', {
        json: { tier: 'pro', returnUrl: 'https://app.example.com/success' },
      });
      expect(result).toEqual(mockSession);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Requested tier must be an upgrade from current tier' });

      await expect(
        resource.createCheckoutSession('free', 'https://app.example.com/success'),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.post, 401, { message: 'Unauthorized' });

      await expect(
        resource.createCheckoutSession('pro', 'https://app.example.com/success'),
      ).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe('cancel', () => {
    it('should cancel subscription with reason', async () => {
      mockJsonResponse(kyMock.post, { message: 'Subscription cancelled successfully' });

      await resource.cancel('Switching to self-hosted');

      expect(kyMock.post).toHaveBeenCalledWith('subscription/cancel', {
        json: { reason: 'Switching to self-hosted' },
      });
    });

    it('should cancel subscription without reason', async () => {
      mockJsonResponse(kyMock.post, { message: 'Subscription cancelled successfully' });

      await resource.cancel();

      expect(kyMock.post).toHaveBeenCalledWith('subscription/cancel', {
        json: { reason: undefined },
      });
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'No active subscription found' });

      await expect(resource.cancel()).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.cancel()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('createPortalSession', () => {
    it('should create a portal session', async () => {
      const mockPortal = { url: 'https://billing.example.com/portal-1' };
      mockJsonResponse(kyMock.post, mockPortal);

      const result = await resource.createPortalSession('https://app.example.com/settings/billing');

      expect(kyMock.post).toHaveBeenCalledWith('subscription/portal', {
        json: { returnUrl: 'https://app.example.com/settings/billing' },
      });
      expect(result).toEqual(mockPortal);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.post, 401, { message: 'Unauthorized' });

      await expect(
        resource.createPortalSession('https://app.example.com/billing'),
      ).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe('listInvoices', () => {
    it('should return invoices', async () => {
      const mockInvoices = [
        {
          id: 'inv_1',
          amount: 999,
          currency: 'usd',
          status: 'paid',
          createdAt: '2024-06-01T00:00:00Z',
          paidAt: '2024-06-01T00:05:00Z',
          invoiceUrl: 'https://invoice.example.com/1',
        },
        {
          id: 'inv_2',
          amount: 999,
          currency: 'usd',
          status: 'open',
          createdAt: '2024-07-01T00:00:00Z',
          paidAt: null,
          invoiceUrl: null,
        },
      ];
      mockJsonResponse(kyMock.get, { invoices: mockInvoices });

      const result = await resource.listInvoices();

      expect(kyMock.get).toHaveBeenCalledWith('subscription/invoices');
      expect(result).toEqual(mockInvoices);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no invoices', async () => {
      mockJsonResponse(kyMock.get, { invoices: [] });

      const result = await resource.listInvoices();

      expect(result).toEqual([]);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.listInvoices()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listInvoices()).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
