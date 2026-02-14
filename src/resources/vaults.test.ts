import { describe, it, expect, beforeEach } from 'vitest';
import { VaultsResource } from './vaults.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthorizationError } from '../errors.js';

describe('VaultsResource', () => {
  let resource: VaultsResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new VaultsResource(kyMock as any);
  });

  describe('list', () => {
    it('should list vaults', async () => {
      const mockVaults = [
        { id: '1', name: 'Test Vault', slug: 'test-vault', description: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];
      mockJsonResponse(kyMock.get, { vaults: mockVaults });

      const result = await resource.list();

      expect(kyMock.get).toHaveBeenCalledWith('vaults');
      expect(result).toEqual(mockVaults);
    });

    it('should return empty array when no vaults', async () => {
      mockJsonResponse(kyMock.get, { vaults: [] });

      const result = await resource.list();

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list()).rejects.toBeInstanceOf(NetworkError);
      await expect(resource.list()).rejects.toThrow('Network request failed');
    });
  });

  describe('get', () => {
    it('should get a vault by id', async () => {
      const mockVault = { id: 'v1', name: 'My Vault', slug: 'my-vault', description: 'desc', createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      mockJsonResponse(kyMock.get, mockVault);

      const result = await resource.get('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1');
      expect(result).toEqual(mockVault);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Vault not found' });

      await expect(resource.get('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('create', () => {
    it('should create a vault with name only', async () => {
      const mockVault = { id: 'v2', name: 'New Vault', slug: 'new-vault', description: null, createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      mockJsonResponse(kyMock.post, mockVault);

      const result = await resource.create({ name: 'New Vault' });

      expect(kyMock.post).toHaveBeenCalledWith('vaults', { json: { name: 'New Vault' } });
      expect(result).toEqual(mockVault);
    });

    it('should create a vault with name and description', async () => {
      const mockVault = { id: 'v3', name: 'Described', slug: 'described', description: 'A vault', createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      mockJsonResponse(kyMock.post, mockVault);

      const result = await resource.create({ name: 'Described', description: 'A vault' });

      expect(kyMock.post).toHaveBeenCalledWith('vaults', { json: { name: 'Described', description: 'A vault' } });
      expect(result).toEqual(mockVault);
    });
  });

  describe('update', () => {
    it('should update vault name', async () => {
      const mockVault = { id: 'v1', name: 'Updated', slug: 'updated', description: null, createdAt: '2024-01-01', updatedAt: '2024-01-02' };
      mockJsonResponse(kyMock.put, mockVault);

      const result = await resource.update('v1', { name: 'Updated' });

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1', { json: { name: 'Updated' } });
      expect(result).toEqual(mockVault);
    });

    it('should update vault description to null', async () => {
      const mockVault = { id: 'v1', name: 'Test', slug: 'test', description: null, createdAt: '2024-01-01', updatedAt: '2024-01-02' };
      mockJsonResponse(kyMock.put, mockVault);

      await resource.update('v1', { description: null });

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1', { json: { description: null } });
    });
  });

  describe('delete', () => {
    it('should delete a vault', async () => {
      await resource.delete('v1');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1');
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Forbidden' });

      await expect(resource.delete('v1')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });
});
