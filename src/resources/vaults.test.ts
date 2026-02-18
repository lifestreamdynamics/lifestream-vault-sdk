import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    it('should update vault name using patch', async () => {
      const mockVault = { id: 'v1', name: 'Updated', slug: 'updated', description: null, createdAt: '2024-01-01', updatedAt: '2024-01-02' };
      mockJsonResponse(kyMock.patch, mockVault);

      const result = await resource.update('v1', { name: 'Updated' });

      expect(kyMock.patch).toHaveBeenCalledWith('vaults/v1', { json: { name: 'Updated' } });
      expect(result).toEqual(mockVault);
    });

    it('should update vault description to null', async () => {
      const mockVault = { id: 'v1', name: 'Test', slug: 'test', description: null, createdAt: '2024-01-01', updatedAt: '2024-01-02' };
      mockJsonResponse(kyMock.patch, mockVault);

      await resource.update('v1', { description: null });

      expect(kyMock.patch).toHaveBeenCalledWith('vaults/v1', { json: { description: null } });
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

  describe('getGraph', () => {
    it('should get the link graph for a vault', async () => {
      const graph = {
        nodes: [
          { id: 'd1', path: 'a.md', title: 'A' },
          { id: 'd2', path: 'b.md', title: 'B' },
        ],
        edges: [
          { source: 'd1', target: 'd2', linkText: 'B' },
        ],
      };
      mockJsonResponse(kyMock.get, graph);

      const result = await resource.getGraph('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/links/graph');
      expect(result).toEqual(graph);
    });

    it('should return empty graph when no documents', async () => {
      mockJsonResponse(kyMock.get, { nodes: [], edges: [] });

      const result = await resource.getGraph('v1');

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Vault not found' });

      await expect(resource.getGraph('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getUnresolvedLinks', () => {
    it('should get unresolved links for a vault', async () => {
      const unresolvedLinks = [
        {
          targetPath: 'missing.md',
          references: [
            {
              sourceDocumentId: 'd1',
              sourcePath: 'a.md',
              sourceTitle: 'A',
              linkText: 'Missing',
            },
            {
              sourceDocumentId: 'd2',
              sourcePath: 'b.md',
              sourceTitle: null,
              linkText: 'missing',
            },
          ],
        },
      ];
      mockJsonResponse(kyMock.get, { unresolvedLinks });

      const result = await resource.getUnresolvedLinks('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/links/unresolved');
      expect(result).toEqual(unresolvedLinks);
    });

    it('should return empty array when no broken links', async () => {
      mockJsonResponse(kyMock.get, { unresolvedLinks: [] });

      const result = await resource.getUnresolvedLinks('v1');

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getUnresolvedLinks('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getTree', () => {
    it('should get the file tree for a vault', async () => {
      const tree = [{ name: 'test.md', path: 'test.md', type: 'file' as const }];
      mockJsonResponse(kyMock.get, { tree });

      const result = await resource.getTree('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/tree');
      expect(result).toEqual(tree);
    });

    it('should return empty array for empty vault', async () => {
      mockJsonResponse(kyMock.get, { tree: [] });

      const result = await resource.getTree('v1');

      expect(result).toEqual([]);
    });
  });

  describe('archive', () => {
    it('should archive a vault and return the vault', async () => {
      const mockVault = { id: 'v1', name: 'Vault', isArchived: true, archivedAt: '2024-01-01' };
      mockJsonResponse(kyMock.patch, { vault: mockVault });

      const result = await resource.archive('v1');

      expect(kyMock.patch).toHaveBeenCalledWith('vaults/v1/archive');
      expect(result).toEqual(mockVault);
    });
  });

  describe('unarchive', () => {
    it('should unarchive a vault and return the vault', async () => {
      const mockVault = { id: 'v1', name: 'Vault', isArchived: false, archivedAt: null };
      mockJsonResponse(kyMock.patch, { vault: mockVault });

      const result = await resource.unarchive('v1');

      expect(kyMock.patch).toHaveBeenCalledWith('vaults/v1/unarchive');
      expect(result).toEqual(mockVault);
    });
  });

  describe('createExport', () => {
    it('should create a vault export job', async () => {
      const mockExport = {
        id: 'exp1',
        vaultId: 'v1',
        status: 'pending' as const,
        format: 'zip' as const,
        includeMetadata: true,
        createdAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.post, mockExport);

      const result = await resource.createExport('v1', { includeMetadata: true });

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/export', { json: { includeMetadata: true } });
      expect(result).toEqual(mockExport);
      expect(result.status).toBe('pending');
    });

    it('should create a vault export with default params', async () => {
      const mockExport = { id: 'exp2', vaultId: 'v1', status: 'pending' as const, format: 'zip' as const, includeMetadata: false, createdAt: '2024-01-01' };
      mockJsonResponse(kyMock.post, mockExport);

      await resource.createExport('v1');

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/export', { json: {} });
    });
  });

  describe('listExports', () => {
    it('should list vault exports', async () => {
      const exports = [
        { id: 'exp1', vaultId: 'v1', status: 'complete' as const, format: 'zip' as const, includeMetadata: false, createdAt: '2024-01-01', completedAt: '2024-01-01' },
      ];
      mockJsonResponse(kyMock.get, { exports });

      const result = await resource.listExports('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/export');
      expect(result).toEqual(exports);
    });

    it('should return empty array when no exports', async () => {
      mockJsonResponse(kyMock.get, { exports: [] });

      const result = await resource.listExports('v1');

      expect(result).toEqual([]);
    });
  });

  describe('downloadExport', () => {
    it('should download an export as a Blob', async () => {
      const blob = new Blob(['test content'], { type: 'application/zip' });
      kyMock.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(undefined),
        text: vi.fn().mockResolvedValue(''),
        blob: vi.fn().mockResolvedValue(blob),
        ok: true,
        status: 200,
      });

      const result = await resource.downloadExport('v1', 'exp1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/export/exp1/download');
      expect(result).toBeInstanceOf(Blob);
    });
  });

  describe('transfer', () => {
    it('should transfer a vault to another user', async () => {
      const mockVault = { id: 'v1', name: 'Vault', userId: 'u2' };
      mockJsonResponse(kyMock.post, { vault: mockVault });

      const result = await resource.transfer('v1', 'newowner@example.com');

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/transfer', { json: { targetEmail: 'newowner@example.com' } });
      expect(result).toEqual(mockVault);
    });
  });

  describe('getMfaConfig', () => {
    it('should get vault MFA config', async () => {
      const mockConfig = { mfaRequired: true, sessionWindowMinutes: 60, userVerified: false, verificationExpiresAt: null };
      mockJsonResponse(kyMock.get, mockConfig);

      const result = await resource.getMfaConfig('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/mfa');
      expect(result).toEqual(mockConfig);
      expect(result.mfaRequired).toBe(true);
    });
  });

  describe('setMfaConfig', () => {
    it('should set vault MFA config via PUT', async () => {
      const mockConfig = { mfaRequired: true, sessionWindowMinutes: 30 };
      mockJsonResponse(kyMock.put, mockConfig);

      const result = await resource.setMfaConfig('v1', { mfaRequired: true, sessionWindowMinutes: 30 });

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1/mfa', { json: { mfaRequired: true, sessionWindowMinutes: 30 } });
      expect(result).toEqual(mockConfig);
    });
  });

  describe('verifyMfa', () => {
    it('should verify MFA and return verified status', async () => {
      const mockResponse = { verified: true, expiresAt: '2024-01-01T12:00:00Z' };
      mockJsonResponse(kyMock.post, mockResponse);

      const result = await resource.verifyMfa('v1', { method: 'totp', code: '123456' });

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/mfa/verify', { json: { method: 'totp', code: '123456' } });
      expect(result.verified).toBe(true);
      expect(result.expiresAt).toBe('2024-01-01T12:00:00Z');
    });

    it('should verify MFA with backup code method', async () => {
      const mockResponse = { verified: true, expiresAt: '2024-01-01T12:00:00Z' };
      mockJsonResponse(kyMock.post, mockResponse);

      const result = await resource.verifyMfa('v1', { method: 'backup_code', code: 'ABCD1234' });

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/mfa/verify', { json: { method: 'backup_code', code: 'ABCD1234' } });
      expect(result.verified).toBe(true);
    });
  });
});
