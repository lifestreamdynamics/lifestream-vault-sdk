import { describe, it, expect, beforeEach } from 'vitest';
import { ApiKeysResource } from './api-keys.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthenticationError, ValidationError, AuthorizationError } from '../errors.js';

describe('ApiKeysResource', () => {
  let resource: ApiKeysResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new ApiKeysResource(kyMock as any);
  });

  describe('list', () => {
    it('should list API keys', async () => {
      const mockKeys = [
        {
          id: 'k1', name: 'Test Key', prefix: 'lsv_k_ab', scopes: ['read'],
          vaultId: null, expiresAt: null, isActive: true, lastUsedAt: null,
          createdAt: '2024-01-01', updatedAt: '2024-01-01',
        },
      ];
      mockJsonResponse(kyMock.get, { apiKeys: mockKeys });

      const result = await resource.list();

      expect(kyMock.get).toHaveBeenCalledWith('api-keys');
      expect(result).toEqual(mockKeys);
    });

    it('should return empty array when no keys exist', async () => {
      mockJsonResponse(kyMock.get, { apiKeys: [] });

      const result = await resource.list();

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list()).rejects.toBeInstanceOf(NetworkError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.list()).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe('get', () => {
    it('should get an API key by id', async () => {
      const mockKey = {
        id: 'k1', name: 'My Key', prefix: 'lsv_k_ab', scopes: ['read', 'write'],
        vaultId: 'v1', expiresAt: '2025-12-31', isActive: true, lastUsedAt: '2024-06-01',
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.get, { apiKey: mockKey });

      const result = await resource.get('k1');

      expect(kyMock.get).toHaveBeenCalledWith('api-keys/k1');
      expect(result).toEqual(mockKey);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'API key not found' });

      await expect(resource.get('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.get('k1')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.get('k1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('create', () => {
    it('should create an API key with all params', async () => {
      const mockKeyWithSecret = {
        id: 'k2', name: 'New Key', prefix: 'lsv_k_cd', scopes: ['read', 'write'],
        vaultId: 'v1', expiresAt: '2027-01-01T00:00:00Z', isActive: true, lastUsedAt: null,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
        key: 'lsv_k_cd12ef34_full_secret_here',
      };
      mockJsonResponse(kyMock.post, mockKeyWithSecret);

      const result = await resource.create({
        name: 'New Key',
        scopes: ['read', 'write'],
        vaultId: 'v1',
        expiresAt: '2027-01-01T00:00:00Z',
      });

      expect(kyMock.post).toHaveBeenCalledWith('api-keys', {
        json: {
          name: 'New Key',
          scopes: ['read', 'write'],
          vaultId: 'v1',
          expiresAt: '2027-01-01T00:00:00Z',
        },
      });
      expect(result).toEqual(mockKeyWithSecret);
      expect(result.key).toBe('lsv_k_cd12ef34_full_secret_here');
    });

    it('should create an API key with minimal params', async () => {
      const mockKeyWithSecret = {
        id: 'k3', name: 'Simple Key', prefix: 'lsv_k_ef', scopes: ['read'],
        vaultId: null, expiresAt: null, isActive: true, lastUsedAt: null,
        createdAt: '2024-01-01', updatedAt: '2024-01-01',
        key: 'lsv_k_ef56gh78_secret',
      };
      mockJsonResponse(kyMock.post, mockKeyWithSecret);

      const result = await resource.create({ name: 'Simple Key', scopes: ['read'] });

      expect(kyMock.post).toHaveBeenCalledWith('api-keys', {
        json: { name: 'Simple Key', scopes: ['read'] },
      });
      expect(result).toEqual(mockKeyWithSecret);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Invalid scopes' });

      await expect(resource.create({ name: 'Bad', scopes: ['invalid'] })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.post, 401, { message: 'Unauthorized' });

      await expect(resource.create({ name: 'Key', scopes: ['read'] })).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.create({ name: 'Key', scopes: ['read'] })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('update', () => {
    it('should update API key name', async () => {
      const mockKey = {
        id: 'k1', name: 'Updated Name', prefix: 'lsv_k_ab', scopes: ['read'],
        vaultId: null, expiresAt: null, isActive: true, lastUsedAt: null,
        createdAt: '2024-01-01', updatedAt: '2024-01-02',
      };
      mockJsonResponse(kyMock.patch, { apiKey: mockKey });

      const result = await resource.update('k1', { name: 'Updated Name' });

      expect(kyMock.patch).toHaveBeenCalledWith('api-keys/k1', { json: { name: 'Updated Name' } });
      expect(result).toEqual(mockKey);
    });

    it('should update API key active status', async () => {
      const mockKey = {
        id: 'k1', name: 'My Key', prefix: 'lsv_k_ab', scopes: ['read'],
        vaultId: null, expiresAt: null, isActive: false, lastUsedAt: null,
        createdAt: '2024-01-01', updatedAt: '2024-01-02',
      };
      mockJsonResponse(kyMock.patch, { apiKey: mockKey });

      const result = await resource.update('k1', { isActive: false });

      expect(kyMock.patch).toHaveBeenCalledWith('api-keys/k1', { json: { isActive: false } });
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.patch, 404, { message: 'API key not found' });

      await expect(resource.update('nonexistent', { name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.patch, 400, { message: 'Invalid update' });

      await expect(resource.update('k1', { name: '' })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.patch);

      await expect(resource.update('k1', { name: 'X' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('delete', () => {
    it('should delete an API key', async () => {
      await resource.delete('k1');

      expect(kyMock.delete).toHaveBeenCalledWith('api-keys/k1');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'API key not found' });

      await expect(resource.delete('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Forbidden' });

      await expect(resource.delete('k1')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.delete('k1')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
