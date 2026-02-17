import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentsResource } from './documents.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError } from '../errors.js';

describe('DocumentsResource', () => {
  let resource: DocumentsResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new DocumentsResource(kyMock as any);
  });

  describe('list', () => {
    it('should list documents in a vault', async () => {
      const docs = [
        { path: 'notes/hello.md', title: 'Hello', tags: ['greeting'], sizeBytes: 100, fileModifiedAt: '2024-01-01' },
      ];
      mockJsonResponse(kyMock.get, { documents: docs });

      const result = await resource.list('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', { searchParams: {} });
      expect(result).toEqual(docs);
    });

    it('should list documents with dirPath filter', async () => {
      mockJsonResponse(kyMock.get, { documents: [] });

      await resource.list('v1', 'notes/');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', { searchParams: { dir: 'notes/' } });
    });

    it('should return empty array when no documents', async () => {
      mockJsonResponse(kyMock.get, { documents: [] });

      const result = await resource.list('v1');

      expect(result).toEqual([]);
    });
  });

  describe('get', () => {
    it('should get a document with content', async () => {
      const docData = {
        document: {
          id: 'd1', vaultId: 'v1', path: 'hello.md', title: 'Hello', contentHash: 'abc',
          sizeBytes: 50, tags: [], fileModifiedAt: '2024-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01',
        },
        content: '# Hello\n\nWorld',
      };
      mockJsonResponse(kyMock.get, docData);

      const result = await resource.get('v1', 'hello.md');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents/hello.md');
      expect(result).toEqual(docData);
    });

    it('should handle nested document paths', async () => {
      mockJsonResponse(kyMock.get, { document: {}, content: '' });

      await resource.get('v1', 'deep/nested/path/doc.md');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents/deep/nested/path/doc.md');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Document not found' });

      await expect(resource.get('v1', 'nonexistent.md')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('put', () => {
    it('should create or update a document', async () => {
      const mockDoc = {
        id: 'd1', vaultId: 'v1', path: 'new-doc.md', title: 'New', contentHash: 'xyz',
        sizeBytes: 30, tags: [], fileModifiedAt: '2024-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.put, mockDoc);

      const result = await resource.put('v1', 'new-doc.md', '# New Document');

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1/documents/new-doc.md', {
        json: { content: '# New Document' },
      });
      expect(result).toEqual(mockDoc);
    });
  });

  describe('delete', () => {
    it('should delete a document', async () => {
      await resource.delete('v1', 'old-doc.md');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/documents/old-doc.md');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Not found' });

      await expect(resource.delete('v1', 'nonexistent.md')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.delete('v1', 'doc.md')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('move', () => {
    it('should move a document to a new path', async () => {
      const moveResult = { message: 'Moved', source: 'old.md', destination: 'new.md' };
      mockJsonResponse(kyMock.post, moveResult);

      const result = await resource.move('v1', 'old.md', 'new.md');

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/old.md/move', {
        json: { destination: 'new.md', overwrite: undefined },
      });
      expect(result).toEqual(moveResult);
    });

    it('should move with overwrite flag', async () => {
      const moveResult = { message: 'Moved', source: 'a.md', destination: 'b.md' };
      mockJsonResponse(kyMock.post, moveResult);

      await resource.move('v1', 'a.md', 'b.md', true);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/a.md/move', {
        json: { destination: 'b.md', overwrite: true },
      });
    });
  });

  describe('copy', () => {
    it('should copy a document to a new path', async () => {
      const copyResult = { message: 'Copied', source: 'orig.md', destination: 'copy.md' };
      mockJsonResponse(kyMock.post, copyResult);

      const result = await resource.copy('v1', 'orig.md', 'copy.md');

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/orig.md/copy', {
        json: { destination: 'copy.md', overwrite: undefined },
      });
      expect(result).toEqual(copyResult);
    });

    it('should copy with overwrite flag', async () => {
      const copyResult = { message: 'Copied', source: 'a.md', destination: 'b.md' };
      mockJsonResponse(kyMock.post, copyResult);

      await resource.copy('v1', 'a.md', 'b.md', false);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/a.md/copy', {
        json: { destination: 'b.md', overwrite: false },
      });
    });
  });

  describe('getLinks', () => {
    it('should get forward links from a document', async () => {
      const links = [
        {
          id: 'l1',
          targetPath: 'target.md',
          linkText: 'Target',
          isResolved: true,
          targetDocument: { id: 'd2', path: 'target.md', title: 'Target' },
        },
        {
          id: 'l2',
          targetPath: 'missing.md',
          linkText: 'Missing',
          isResolved: false,
          targetDocument: null,
        },
      ];
      mockJsonResponse(kyMock.get, { links });

      const result = await resource.getLinks('v1', 'source.md');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/links/forward/source.md');
      expect(result).toEqual(links);
    });

    it('should return empty array when no links', async () => {
      mockJsonResponse(kyMock.get, { links: [] });

      const result = await resource.getLinks('v1', 'isolated.md');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Document not found' });

      await expect(resource.getLinks('v1', 'missing.md')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getBacklinks', () => {
    it('should get backlinks to a document', async () => {
      const backlinks = [
        {
          id: 'bl1',
          sourceDocumentId: 'd1',
          linkText: 'Important',
          contextSnippet: 'See [[Important]] for details',
          sourceDocument: { id: 'd1', path: 'ref.md', title: 'Reference' },
        },
      ];
      mockJsonResponse(kyMock.get, { backlinks });

      const result = await resource.getBacklinks('v1', 'important.md');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/links/backlinks/important.md');
      expect(result).toEqual(backlinks);
    });

    it('should return empty array when no backlinks', async () => {
      mockJsonResponse(kyMock.get, { backlinks: [] });

      const result = await resource.getBacklinks('v1', 'lonely.md');

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getBacklinks('v1', 'doc.md')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
