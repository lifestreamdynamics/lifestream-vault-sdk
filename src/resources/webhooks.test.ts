import { describe, it, expect, beforeEach } from 'vitest';
import { WebhooksResource } from './webhooks.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthenticationError, ValidationError, AuthorizationError } from '../errors.js';

describe('WebhooksResource', () => {
  let resource: WebhooksResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new WebhooksResource(kyMock as any);
  });

  describe('list', () => {
    it('should list webhooks for a vault', async () => {
      const mockWebhooks = [
        {
          id: 'wh1', vaultId: 'v1', url: 'https://example.com/hook',
          events: ['create', 'update'], isActive: true,
          createdAt: '2024-01-01', updatedAt: '2024-01-01',
        },
      ];
      mockJsonResponse(kyMock.get, { webhooks: mockWebhooks });

      const result = await resource.list('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/webhooks');
      expect(result).toEqual(mockWebhooks);
    });

    it('should return empty array when no webhooks exist', async () => {
      mockJsonResponse(kyMock.get, { webhooks: [] });

      const result = await resource.list('v1');

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list('v1')).rejects.toBeInstanceOf(NetworkError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.list('v1')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Forbidden' });

      await expect(resource.list('v1')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe('create', () => {
    it('should create a webhook and return secret', async () => {
      const mockWebhook = {
        id: 'wh1', vaultId: 'v1', url: 'https://example.com/hook',
        events: ['create', 'update', 'delete'], isActive: true,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
        secret: 'whsec_abc123def456',
      };
      mockJsonResponse(kyMock.post, mockWebhook);

      const result = await resource.create('v1', {
        url: 'https://example.com/hook',
        events: ['create', 'update', 'delete'],
      });

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/webhooks', {
        json: {
          url: 'https://example.com/hook',
          events: ['create', 'update', 'delete'],
        },
      });
      expect(result).toEqual(mockWebhook);
      expect(result.secret).toBe('whsec_abc123def456');
    });

    it('should throw ValidationError on 400 (SSRF blocked)', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Webhook URL is not allowed' });

      await expect(resource.create('v1', {
        url: 'http://localhost:3000/internal',
        events: ['create'],
      })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.post, 401, { message: 'Unauthorized' });

      await expect(resource.create('v1', {
        url: 'https://example.com/hook',
        events: ['create'],
      })).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.create('v1', {
        url: 'https://example.com/hook',
        events: ['create'],
      })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('update', () => {
    it('should update webhook URL and events', async () => {
      const mockWebhook = {
        id: 'wh1', vaultId: 'v1', url: 'https://new.example.com/hook',
        events: ['create', 'delete'], isActive: true,
        createdAt: '2024-01-01', updatedAt: '2024-01-02',
      };
      mockJsonResponse(kyMock.put, mockWebhook);

      const result = await resource.update('v1', 'wh1', {
        url: 'https://new.example.com/hook',
        events: ['create', 'delete'],
      });

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1/webhooks/wh1', {
        json: { url: 'https://new.example.com/hook', events: ['create', 'delete'] },
      });
      expect(result).toEqual(mockWebhook);
    });

    it('should update webhook active status', async () => {
      const mockWebhook = {
        id: 'wh1', vaultId: 'v1', url: 'https://example.com/hook',
        events: ['create'], isActive: false,
        createdAt: '2024-01-01', updatedAt: '2024-01-02',
      };
      mockJsonResponse(kyMock.put, mockWebhook);

      const result = await resource.update('v1', 'wh1', { isActive: false });

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.put, 404, { message: 'Webhook not found' });

      await expect(resource.update('v1', 'nonexistent', { url: 'https://x.com' }))
        .rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.put, 400, { message: 'URL not allowed' });

      await expect(resource.update('v1', 'wh1', { url: 'http://localhost' }))
        .rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.put);

      await expect(resource.update('v1', 'wh1', { url: 'https://x.com' }))
        .rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('delete', () => {
    it('should delete a webhook', async () => {
      await resource.delete('v1', 'wh1');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/webhooks/wh1');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Webhook not found' });

      await expect(resource.delete('v1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Forbidden' });

      await expect(resource.delete('v1', 'wh1')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.delete('v1', 'wh1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('listDeliveries', () => {
    it('should list deliveries for a webhook', async () => {
      const mockDeliveries = [
        {
          id: 'd1', webhookId: 'wh1', eventId: 'ev1', statusCode: 200,
          attempt: 1, requestBody: { event: 'document.create' },
          responseBody: 'OK', error: null,
          deliveredAt: '2024-01-01T12:00:00Z', createdAt: '2024-01-01T12:00:00Z',
        },
        {
          id: 'd2', webhookId: 'wh1', eventId: 'ev2', statusCode: null,
          attempt: 3, requestBody: { event: 'document.update' },
          responseBody: null, error: 'Connection refused',
          deliveredAt: null, createdAt: '2024-01-02T12:00:00Z',
        },
      ];
      mockJsonResponse(kyMock.get, { deliveries: mockDeliveries });

      const result = await resource.listDeliveries('v1', 'wh1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/webhooks/wh1/deliveries');
      expect(result).toEqual(mockDeliveries);
      expect(result).toHaveLength(2);
      expect(result[0].statusCode).toBe(200);
      expect(result[1].error).toBe('Connection refused');
    });

    it('should return empty array when no deliveries exist', async () => {
      mockJsonResponse(kyMock.get, { deliveries: [] });

      const result = await resource.listDeliveries('v1', 'wh1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Webhook not found' });

      await expect(resource.listDeliveries('v1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.listDeliveries('v1', 'wh1')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listDeliveries('v1', 'wh1')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
