import { describe, it, expect, beforeEach } from 'vitest';
import { AdminResource } from './admin.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, AuthenticationError, AuthorizationError, NotFoundError, ValidationError } from '../errors.js';

describe('AdminResource', () => {
  let resource: AdminResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new AdminResource(kyMock as any);
  });

  describe('getStats', () => {
    it('should return system stats', async () => {
      const mockStats = {
        totalUsers: 150,
        totalVaults: 300,
        totalDocuments: 5000,
        totalStorageBytes: 1073741824,
        activeUsers: 80,
      };
      mockJsonResponse(kyMock.get, mockStats);

      const result = await resource.getStats();

      expect(kyMock.get).toHaveBeenCalledWith('admin/stats');
      expect(result).toEqual(mockStats);
      expect(result.totalUsers).toBe(150);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Admin access required' });

      await expect(resource.getStats()).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.getStats()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getStats()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getTimeseries', () => {
    it('should return timeseries data for signups', async () => {
      const mockData = {
        metric: 'signups',
        period: '30d',
        data: [
          { date: '2024-06-01', value: 5 },
          { date: '2024-06-02', value: 8 },
          { date: '2024-06-03', value: 3 },
        ],
      };
      mockJsonResponse(kyMock.get, mockData);

      const result = await resource.getTimeseries('signups', '30d');

      expect(kyMock.get).toHaveBeenCalledWith('admin/stats/timeseries', {
        searchParams: { metric: 'signups', period: '30d' },
      });
      expect(result.data).toHaveLength(3);
      expect(result.metric).toBe('signups');
      expect(result.period).toBe('30d');
    });

    it('should return timeseries data for documents', async () => {
      const mockData = {
        metric: 'documents',
        period: '7d',
        data: [{ date: '2024-06-01', value: 42 }],
      };
      mockJsonResponse(kyMock.get, mockData);

      const result = await resource.getTimeseries('documents', '7d');

      expect(kyMock.get).toHaveBeenCalledWith('admin/stats/timeseries', {
        searchParams: { metric: 'documents', period: '7d' },
      });
      expect(result.metric).toBe('documents');
    });

    it('should throw ValidationError on 400 for invalid metric', async () => {
      mockHTTPError(kyMock.get, 400, { message: 'Metric must be one of: signups, documents, storage' });

      await expect(resource.getTimeseries('invalid', '30d')).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Admin access required' });

      await expect(resource.getTimeseries('signups', '30d')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getTimeseries('signups', '30d')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('listUsers', () => {
    it('should return paginated user list', async () => {
      const mockResponse = {
        users: [
          {
            id: 'u1',
            email: 'alice@example.com',
            name: 'Alice',
            role: 'user',
            isActive: true,
            subscriptionTier: 'pro',
            createdAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'u2',
            email: 'bob@example.com',
            name: null,
            role: 'admin',
            isActive: true,
            subscriptionTier: 'business',
            createdAt: '2024-02-01T00:00:00Z',
          },
        ],
        total: 2,
        page: 1,
        limit: 50,
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.listUsers();

      expect(kyMock.get).toHaveBeenCalledWith('admin/users', {
        searchParams: undefined,
      });
      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should pass filter parameters', async () => {
      const mockResponse = { users: [], total: 0, page: 1, limit: 10 };
      mockJsonResponse(kyMock.get, mockResponse);

      await resource.listUsers({ page: 2, limit: 10, search: 'alice', tier: 'pro', role: 'user' });

      expect(kyMock.get).toHaveBeenCalledWith('admin/users', {
        searchParams: { page: 2, limit: 10, search: 'alice', tier: 'pro', role: 'user' },
      });
    });

    it('should pass partial filter parameters', async () => {
      const mockResponse = { users: [], total: 0, page: 1, limit: 50 };
      mockJsonResponse(kyMock.get, mockResponse);

      await resource.listUsers({ tier: 'free' });

      expect(kyMock.get).toHaveBeenCalledWith('admin/users', {
        searchParams: { tier: 'free' },
      });
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Admin access required' });

      await expect(resource.listUsers()).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listUsers()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getUser', () => {
    it('should return detailed user info', async () => {
      const mockUser = {
        id: 'u1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'user',
        isActive: true,
        subscriptionTier: 'pro',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
        vaultCount: 5,
        documentCount: 120,
        storageBytes: 10485760,
      };
      mockJsonResponse(kyMock.get, mockUser);

      const result = await resource.getUser('u1');

      expect(kyMock.get).toHaveBeenCalledWith('admin/users/u1');
      expect(result).toEqual(mockUser);
      expect(result.vaultCount).toBe(5);
      expect(result.documentCount).toBe(120);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'User not found' });

      await expect(resource.getUser('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Admin access required' });

      await expect(resource.getUser('u1')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getUser('u1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('updateUser', () => {
    it('should update user role', async () => {
      const mockUser = {
        id: 'u1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'admin',
        isActive: true,
        subscriptionTier: 'pro',
        createdAt: '2024-01-01T00:00:00Z',
      };
      mockJsonResponse(kyMock.patch, mockUser);

      const result = await resource.updateUser('u1', { role: 'admin' });

      expect(kyMock.patch).toHaveBeenCalledWith('admin/users/u1', {
        json: { role: 'admin' },
      });
      expect(result.role).toBe('admin');
    });

    it('should update user active status', async () => {
      const mockUser = {
        id: 'u1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'user',
        isActive: false,
        subscriptionTier: 'free',
        createdAt: '2024-01-01T00:00:00Z',
      };
      mockJsonResponse(kyMock.patch, mockUser);

      const result = await resource.updateUser('u1', { isActive: false });

      expect(kyMock.patch).toHaveBeenCalledWith('admin/users/u1', {
        json: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });

    it('should update subscription tier', async () => {
      const mockUser = {
        id: 'u1',
        email: 'alice@example.com',
        name: 'Alice',
        role: 'user',
        isActive: true,
        subscriptionTier: 'business',
        createdAt: '2024-01-01T00:00:00Z',
      };
      mockJsonResponse(kyMock.patch, mockUser);

      const result = await resource.updateUser('u1', { subscriptionTier: 'business' });

      expect(result.subscriptionTier).toBe('business');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.patch, 404, { message: 'User not found' });

      await expect(resource.updateUser('nonexistent', { role: 'admin' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.patch, 400, { message: 'Invalid role' });

      await expect(resource.updateUser('u1', { role: 'admin' })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.patch, 403, { message: 'Admin access required' });

      await expect(resource.updateUser('u1', { role: 'admin' })).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.patch);

      await expect(resource.updateUser('u1', { role: 'admin' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getActivity', () => {
    it('should return recent activity', async () => {
      const mockActivity = [
        {
          type: 'create',
          userId: 'u1',
          vaultId: 'v1',
          path: 'notes/hello.md',
          createdAt: '2024-06-01T12:00:00Z',
        },
        {
          type: 'update',
          userId: 'u2',
          vaultId: 'v2',
          path: 'docs/readme.md',
          createdAt: '2024-06-01T11:00:00Z',
        },
      ];
      mockJsonResponse(kyMock.get, mockActivity);

      const result = await resource.getActivity();

      expect(kyMock.get).toHaveBeenCalledWith('admin/activity', {
        searchParams: undefined,
      });
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('create');
    });

    it('should pass limit parameter', async () => {
      mockJsonResponse(kyMock.get, []);

      await resource.getActivity(10);

      expect(kyMock.get).toHaveBeenCalledWith('admin/activity', {
        searchParams: { limit: 10 },
      });
    });

    it('should return empty array when no activity', async () => {
      mockJsonResponse(kyMock.get, []);

      const result = await resource.getActivity();

      expect(result).toEqual([]);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Admin access required' });

      await expect(resource.getActivity()).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getActivity()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getSubscriptionSummary', () => {
    it('should return subscription summary', async () => {
      const mockSummary = {
        free: 100,
        pro: 40,
        business: 10,
        total: 150,
      };
      mockJsonResponse(kyMock.get, mockSummary);

      const result = await resource.getSubscriptionSummary();

      expect(kyMock.get).toHaveBeenCalledWith('admin/subscriptions');
      expect(result).toEqual(mockSummary);
      expect(result.free).toBe(100);
      expect(result.pro).toBe(40);
      expect(result.business).toBe(10);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Admin access required' });

      await expect(resource.getSubscriptionSummary()).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.getSubscriptionSummary()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getSubscriptionSummary()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getHealth', () => {
    it('should return system health status', async () => {
      const mockHealth = {
        status: 'healthy',
        database: 'connected',
        redis: 'connected',
        uptime: 86400,
      };
      mockJsonResponse(kyMock.get, mockHealth);

      const result = await resource.getHealth();

      expect(kyMock.get).toHaveBeenCalledWith('admin/health');
      expect(result).toEqual(mockHealth);
      expect(result.status).toBe('healthy');
    });

    it('should handle degraded health', async () => {
      const mockHealth = {
        status: 'degraded',
        database: 'connected',
        redis: 'disconnected',
        uptime: 3600,
      };
      mockJsonResponse(kyMock.get, mockHealth);

      const result = await resource.getHealth();

      expect(result.status).toBe('degraded');
      expect(result.redis).toBe('disconnected');
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Admin access required' });

      await expect(resource.getHealth()).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.getHealth()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getHealth()).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
