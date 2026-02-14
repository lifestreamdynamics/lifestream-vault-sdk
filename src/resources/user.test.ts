import { describe, it, expect, beforeEach } from 'vitest';
import { UserResource } from './user.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, AuthenticationError } from '../errors.js';

describe('UserResource', () => {
  let resource: UserResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new UserResource(kyMock as any);
  });

  describe('me', () => {
    it('should return the current user profile', async () => {
      const mockUser = {
        id: 'u1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        subscriptionTier: 'pro',
        subscriptionExpiresAt: '2025-12-31T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      };
      mockJsonResponse(kyMock.get, { user: mockUser });

      const result = await resource.me();

      expect(kyMock.get).toHaveBeenCalledWith('users/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle user with null name and free tier', async () => {
      const mockUser = {
        id: 'u2',
        email: 'free@example.com',
        name: null,
        role: 'user',
        subscriptionTier: 'free',
        subscriptionExpiresAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      mockJsonResponse(kyMock.get, { user: mockUser });

      const result = await resource.me();

      expect(result.name).toBeNull();
      expect(result.subscriptionTier).toBe('free');
      expect(result.subscriptionExpiresAt).toBeNull();
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.me()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.me()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getStorage', () => {
    it('should return storage usage', async () => {
      const mockStorage = {
        totalBytes: 5242880,
        limitBytes: 104857600,
        vaults: [
          { vaultId: 'v1', name: 'Notes', bytes: 3145728, documentCount: 42 },
          { vaultId: 'v2', name: 'Work', bytes: 2097152, documentCount: 18 },
        ],
        vaultCount: 2,
        vaultLimit: 10,
        tier: 'pro',
      };
      mockJsonResponse(kyMock.get, mockStorage);

      const result = await resource.getStorage();

      expect(kyMock.get).toHaveBeenCalledWith('users/me/storage');
      expect(result).toEqual(mockStorage);
      expect(result.vaults).toHaveLength(2);
    });

    it('should handle empty storage', async () => {
      const mockStorage = {
        totalBytes: 0,
        limitBytes: 52428800,
        vaults: [],
        vaultCount: 0,
        vaultLimit: 3,
        tier: 'free',
      };
      mockJsonResponse(kyMock.get, mockStorage);

      const result = await resource.getStorage();

      expect(result.totalBytes).toBe(0);
      expect(result.vaults).toEqual([]);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.getStorage()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getStorage()).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
