import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentsResource } from './documents.js';
import { createKyMock, mockJsonResponse, mockHTTPError, mockNetworkError, type KyMock } from '../__tests__/mocks/ky.js';
import { NotFoundError, NetworkError } from '../errors.js';

describe('DocumentsResource - version methods', () => {
  let resource: DocumentsResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new DocumentsResource(kyMock as any);
  });

  describe('listVersions', () => {
    it('should list versions for a document', async () => {
      const versions = [
        { id: 'v1', documentId: 'd1', versionNum: 2, contentHash: 'abc', sizeBytes: 100, changeSource: 'api', changedBy: 'u1', isPinned: false, expiresAt: null, createdAt: '2024-01-02' },
        { id: 'v2', documentId: 'd1', versionNum: 1, contentHash: 'def', sizeBytes: 80, changeSource: 'web', changedBy: 'u1', isPinned: true, expiresAt: null, createdAt: '2024-01-01' },
      ];
      mockJsonResponse(kyMock.get, { versions });

      const result = await resource.listVersions('vault-1', 'notes/todo.md');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/vault-1/documents/notes/todo.md/versions');
      expect(result).toEqual(versions);
    });

    it('should return empty array when no versions', async () => {
      mockJsonResponse(kyMock.get, { versions: [] });

      const result = await resource.listVersions('vault-1', 'notes/todo.md');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Document not found' });

      await expect(resource.listVersions('vault-1', 'missing.md')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getVersion', () => {
    it('should get a specific version with content', async () => {
      const version = {
        id: 'v1', documentId: 'd1', versionNum: 3, contentHash: 'abc', sizeBytes: 50,
        changeSource: 'api', changedBy: 'u1', isPinned: false, expiresAt: null,
        createdAt: '2024-01-01', content: '# Hello v3',
      };
      mockJsonResponse(kyMock.get, { version });

      const result = await resource.getVersion('vault-1', 'notes/todo.md', 3);

      expect(kyMock.get).toHaveBeenCalledWith('vaults/vault-1/documents/notes/todo.md/versions/3');
      expect(result).toEqual(version);
      expect(result.content).toBe('# Hello v3');
    });

    it('should handle pruned version with null content', async () => {
      const version = {
        id: 'v1', documentId: 'd1', versionNum: 1, contentHash: 'abc', sizeBytes: 50,
        changeSource: 'api', changedBy: 'u1', isPinned: false, expiresAt: null,
        createdAt: '2024-01-01', content: null,
      };
      mockJsonResponse(kyMock.get, { version });

      const result = await resource.getVersion('vault-1', 'notes/todo.md', 1);

      expect(result.content).toBeNull();
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Version not found' });

      await expect(resource.getVersion('vault-1', 'notes/todo.md', 99)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getVersion('vault-1', 'notes/todo.md', 1)).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('diffVersions', () => {
    it('should compute diff between two versions', async () => {
      const diff = {
        fromVersion: 1,
        toVersion: 2,
        changes: [
          { value: 'Hello\n' },
          { removed: true, value: 'World\n' },
          { added: true, value: 'New World\n' },
        ],
      };
      mockJsonResponse(kyMock.post, diff);

      const result = await resource.diffVersions('vault-1', 'notes/todo.md', 1, 2);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/vault-1/documents/notes/todo.md/versions/diff', {
        json: { from: 1, to: 2 },
      });
      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(2);
      expect(result.changes).toHaveLength(3);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.post, 404, { message: 'Document not found' });

      await expect(resource.diffVersions('vault-1', 'missing.md', 1, 2)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('restoreVersion', () => {
    it('should restore a version and return updated document', async () => {
      const doc = {
        id: 'd1', vaultId: 'vault-1', path: 'notes/todo.md', title: 'Todo',
        contentHash: 'restored', sizeBytes: 100, tags: [], encrypted: false,
        encryptionAlgorithm: null, fileModifiedAt: '2024-01-03',
        createdAt: '2024-01-01', updatedAt: '2024-01-03',
      };
      mockJsonResponse(kyMock.post, { document: doc });

      const result = await resource.restoreVersion('vault-1', 'notes/todo.md', 2);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/vault-1/documents/notes/todo.md/versions/2/restore');
      expect(result).toEqual(doc);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.post, 404, { message: 'Version not found' });

      await expect(resource.restoreVersion('vault-1', 'notes/todo.md', 99)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('pinVersion', () => {
    it('should pin a version', async () => {
      const version = {
        id: 'v1', documentId: 'd1', versionNum: 3, contentHash: 'abc', sizeBytes: 50,
        changeSource: 'api', changedBy: 'u1', isPinned: true, expiresAt: null, createdAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.post, { version });

      const result = await resource.pinVersion('vault-1', 'notes/todo.md', 3);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/vault-1/documents/notes/todo.md/versions/3/pin');
      expect(result.isPinned).toBe(true);
    });
  });

  describe('unpinVersion', () => {
    it('should unpin a version', async () => {
      const version = {
        id: 'v1', documentId: 'd1', versionNum: 3, contentHash: 'abc', sizeBytes: 50,
        changeSource: 'api', changedBy: 'u1', isPinned: false, expiresAt: '2025-04-01T00:00:00Z', createdAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.post, { version });

      const result = await resource.unpinVersion('vault-1', 'notes/todo.md', 3);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/vault-1/documents/notes/todo.md/versions/3/unpin');
      expect(result.isPinned).toBe(false);
      expect(result.expiresAt).not.toBeNull();
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.unpinVersion('vault-1', 'notes/todo.md', 3)).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
