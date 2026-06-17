import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentsResource } from './documents.js';
import type { SyncListKnownState } from './documents.js';
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

    it('should pass the since filter as a query param', async () => {
      mockJsonResponse(kyMock.get, { documents: [] });

      await resource.list('v1', undefined, { since: '2026-06-17T00:00:00.000Z' });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', {
        searchParams: { since: '2026-06-17T00:00:00.000Z' },
      });
    });

    it('should combine since with dir, tags, limit, and offset', async () => {
      mockJsonResponse(kyMock.get, { documents: [] });

      await resource.list('v1', 'notes/', {
        since: '2026-06-17T00:00:00.000Z',
        tags: ['work'],
        limit: 50,
        offset: 10,
      });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', {
        searchParams: {
          dir: 'notes/',
          tags: 'work',
          limit: 50,
          offset: 10,
          since: '2026-06-17T00:00:00.000Z',
        },
      });
    });

    describe('conditional list (ifNoneMatch)', () => {
      const remoteDocs = [
        {
          id: 'd1', path: 'notes/a.md', title: 'A', tags: [], sizeBytes: 100,
          fileModifiedAt: '2024-01-01', contentHash: 'hash-a',
        },
        {
          id: 'd2', path: 'notes/b.md', title: 'B', tags: [], sizeBytes: 200,
          fileModifiedAt: '2024-01-02', contentHash: 'hash-b',
        },
      ];

      it('unconditional form (no options) still returns array — back-compat', async () => {
        mockJsonResponse(kyMock.get, { documents: remoteDocs });

        const result = await resource.list('v1');

        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual(remoteDocs);
        // Confirm the discriminated union fields are absent on the plain array path.
        expect((result as unknown as { notModified?: boolean }).notModified).toBeUndefined();
      });

      it('returns { notModified: false, etag, documents } on 200 with conditional request', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ etag: 'W/"2-1704067200000-|nofm"' }),
          json: () => Promise.resolve({ documents: remoteDocs }),
        } as unknown as ReturnType<typeof kyMock.get>);

        const result = await resource.list('v1', undefined, { ifNoneMatch: 'W/"old-etag"' });

        expect(result).toEqual({
          notModified: false,
          etag: 'W/"2-1704067200000-|nofm"',
          documents: remoteDocs,
        });
        expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', {
          searchParams: {},
          headers: { 'If-None-Match': 'W/"old-etag"' },
          throwHttpErrors: false,
        });
      });

      it('returns { notModified: true, etag } on 304', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: false,
          status: 304,
          headers: new Headers({ etag: 'W/"2-1704067200000-|nofm"' }),
          json: () => { throw new Error('json should not be called on 304'); },
        } as unknown as ReturnType<typeof kyMock.get>);

        const result = await resource.list('v1', undefined, { ifNoneMatch: 'W/"2-1704067200000-|nofm"' });

        expect(result).toEqual({ notModified: true, etag: 'W/"2-1704067200000-|nofm"' });
      });

      it('falls back to caller-supplied ifNoneMatch as etag when 304 has no etag header', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: false,
          status: 304,
          headers: new Headers(),
          json: () => { throw new Error('json should not be called'); },
        } as unknown as ReturnType<typeof kyMock.get>);

        const result = await resource.list('v1', undefined, { ifNoneMatch: 'W/"stored-etag"' });

        expect(result).toEqual({ notModified: true, etag: 'W/"stored-etag"' });
      });

      it('treats empty string ifNoneMatch as conditional (bootstrap call)', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ etag: 'W/"1-abc"' }),
          json: () => Promise.resolve({ documents: remoteDocs }),
        } as unknown as ReturnType<typeof kyMock.get>);

        const result = await resource.list('v1', undefined, { ifNoneMatch: '' });

        // Empty-string ifNoneMatch still takes the conditional path.
        expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', expect.objectContaining({
          headers: { 'If-None-Match': '' },
          throwHttpErrors: false,
        }));
        expect(result).toEqual({ notModified: false, etag: 'W/"1-abc"', documents: remoteDocs });
      });

      it('handles old server (200 with no etag header) gracefully', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: true,
          status: 200,
          headers: new Headers(), // no etag header — old server
          json: () => Promise.resolve({ documents: remoteDocs }),
        } as unknown as ReturnType<typeof kyMock.get>);

        const result = await resource.list('v1', undefined, { ifNoneMatch: 'W/"anything"' });

        // Must NOT throw. etag field is empty string; notModified is false.
        expect(result).toEqual({ notModified: false, etag: '', documents: remoteDocs });
      });

      it('throws NotFoundError on 404 even with throwHttpErrors disabled', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: false,
          status: 404,
          headers: new Headers(),
          json: () => Promise.resolve({ message: 'Vault not found' }),
        } as unknown as ReturnType<typeof kyMock.get>);

        await expect(
          resource.list('v1', undefined, { ifNoneMatch: 'W/"x"' }),
        ).rejects.toBeInstanceOf(NotFoundError);
      });

      it('passes limit, offset, and tags as searchParams in conditional form', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ etag: 'W/"1"' }),
          json: () => Promise.resolve({ documents: [] }),
        } as unknown as ReturnType<typeof kyMock.get>);

        await resource.list('v1', 'notes/', { limit: 10, offset: 20, tags: ['foo', 'bar'], ifNoneMatch: '' });

        expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', expect.objectContaining({
          searchParams: { dir: 'notes/', limit: 10, offset: 20, tags: 'foo,bar' },
        }));
      });
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

    describe('conditional GET (ifNoneMatch)', () => {
      const docData = {
        document: {
          id: 'd1', vaultId: 'v1', path: 'hello.md', title: 'Hello', contentHash: 'abc',
          sizeBytes: 50, tags: [], fileModifiedAt: '2024-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01',
        },
        content: '# Hello\n\nWorld',
      };

      it('returns notModified=true on 304', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: false,
          status: 304,
          headers: new Headers({ etag: '"abc"' }),
          json: () => { throw new Error('json should not be called on 304'); },
          text: () => Promise.resolve(''),
        } as unknown as ReturnType<typeof kyMock.get>);

        const result = await resource.get('v1', 'hello.md', { ifNoneMatch: '"abc"' });

        expect(result).toEqual({ notModified: true, etag: '"abc"' });
        expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents/hello.md', {
          headers: { 'If-None-Match': '"abc"' },
          throwHttpErrors: false,
        });
      });

      it('returns notModified=false with body and etag on 200', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ etag: '"def"' }),
          json: () => Promise.resolve(docData),
          text: () => Promise.resolve(JSON.stringify(docData)),
        } as unknown as ReturnType<typeof kyMock.get>);

        const result = await resource.get('v1', 'hello.md', { ifNoneMatch: '"abc"' });

        expect(result).toEqual({
          notModified: false,
          etag: '"def"',
          ...docData,
        });
      });

      it('falls back to caller-supplied etag if server omits the header on 304', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: false,
          status: 304,
          headers: new Headers(),
          json: () => { throw new Error('json should not be called'); },
          text: () => Promise.resolve(''),
        } as unknown as ReturnType<typeof kyMock.get>);

        const result = await resource.get('v1', 'hello.md', { ifNoneMatch: '"abc"' });

        expect(result).toEqual({ notModified: true, etag: '"abc"' });
      });

      it('preserves the original (no-options) overload signature', async () => {
        // The unconditional form must still return DocumentWithContent directly,
        // not the discriminated union — protect existing callers.
        mockJsonResponse(kyMock.get, docData);
        const result = await resource.get('v1', 'hello.md');
        // result.notModified should NOT exist on the unconditional return type
        expect(result).toEqual(docData);
        expect((result as unknown as { notModified?: boolean }).notModified).toBeUndefined();
      });

      it('throws NotFoundError on 404 even with throwHttpErrors disabled', async () => {
        kyMock.get.mockReturnValueOnce({
          ok: false,
          status: 404,
          headers: new Headers(),
          json: () => Promise.resolve({ message: 'Document not found' }),
          text: () => Promise.resolve('{"message":"Document not found"}'),
        } as unknown as ReturnType<typeof kyMock.get>);

        await expect(
          resource.get('v1', 'gone.md', { ifNoneMatch: '"abc"' }),
        ).rejects.toBeInstanceOf(NotFoundError);
      });
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

  describe('bulkMove', () => {
    it('should bulk move documents to a target directory', async () => {
      const mockResult = {
        succeeded: ['notes/a.md', 'notes/b.md'],
        failed: [],
      };
      mockJsonResponse(kyMock.post, mockResult);

      const result = await resource.bulkMove('v1', { items: ['notes/a.md', 'notes/b.md'], destination: 'archive/' });

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/bulk-move', {
        json: { items: ['notes/a.md', 'notes/b.md'], destination: 'archive/' },
      });
      expect(result.succeeded).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should report failed paths in bulk move result', async () => {
      const mockResult = {
        succeeded: ['notes/a.md'],
        failed: [{ path: 'notes/missing.md', error: 'Document not found' }],
      };
      mockJsonResponse(kyMock.post, mockResult);

      const result = await resource.bulkMove('v1', { items: ['notes/a.md', 'notes/missing.md'], destination: 'archive/' });

      expect(result.succeeded).toEqual(['notes/a.md']);
      expect(result.failed[0].path).toBe('notes/missing.md');
    });
  });

  describe('bulkCopy', () => {
    it('should bulk copy documents to a target directory', async () => {
      const mockResult = {
        succeeded: ['notes/a.md', 'notes/b.md'],
        failed: [],
      };
      mockJsonResponse(kyMock.post, mockResult);

      const result = await resource.bulkCopy('v1', { items: ['notes/a.md', 'notes/b.md'], destination: 'backup/' });

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/bulk-copy', {
        json: { items: ['notes/a.md', 'notes/b.md'], destination: 'backup/' },
      });
      expect(result.succeeded).toHaveLength(2);
    });
  });

  describe('bulkDelete', () => {
    it('should bulk delete documents', async () => {
      const mockResult = {
        succeeded: ['old/a.md', 'old/b.md'],
        failed: [],
      };
      mockJsonResponse(kyMock.post, mockResult);

      const result = await resource.bulkDelete('v1', { items: ['old/a.md', 'old/b.md'] });

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/bulk-delete', {
        json: { items: ['old/a.md', 'old/b.md'] },
      });
      expect(result.succeeded).toEqual(['old/a.md', 'old/b.md']);
    });
  });

  describe('bulkTag', () => {
    it('should bulk add tags to documents', async () => {
      const mockResult = {
        succeeded: ['notes/a.md', 'notes/b.md'],
        failed: [],
      };
      mockJsonResponse(kyMock.post, mockResult);

      const result = await resource.bulkTag('v1', {
        items: ['notes/a.md', 'notes/b.md'],
        addTags: ['archived'],
        removeTags: ['draft'],
      });

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/bulk-tag', {
        json: { items: ['notes/a.md', 'notes/b.md'], addTags: ['archived'], removeTags: ['draft'] },
      });
      expect(result.succeeded).toHaveLength(2);
    });
  });

  describe('createDirectory', () => {
    it('should create a new directory in the vault', async () => {
      const mockResult = { path: 'notes/projects/', created: true };
      mockJsonResponse(kyMock.post, mockResult);

      const result = await resource.createDirectory('v1', 'notes/projects/');

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/directories', {
        json: { path: 'notes/projects/' },
      });
      expect(result.path).toBe('notes/projects/');
      expect(result.created).toBe(true);
    });

    it('should return created false if directory already exists', async () => {
      const mockResult = { path: 'notes/', created: false };
      mockJsonResponse(kyMock.post, mockResult);

      const result = await resource.createDirectory('v1', 'notes/');

      expect(result.created).toBe(false);
    });
  });

  describe('listAll', () => {
    it('should yield all documents when results are fewer than pageSize', async () => {
      const docs = [
        { path: 'notes/a.md', title: 'A', tags: [], sizeBytes: 100, fileModifiedAt: '2024-01-01' },
        { path: 'notes/b.md', title: 'B', tags: [], sizeBytes: 200, fileModifiedAt: '2024-01-02' },
      ];
      mockJsonResponse(kyMock.get, { documents: docs });

      const results: unknown[] = [];
      for await (const doc of resource.listAll('v1')) {
        results.push(doc);
      }

      expect(results).toEqual(docs);
      expect(kyMock.get).toHaveBeenCalledTimes(1);
      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', {
        searchParams: { limit: 100, offset: 0 },
      });
    });

    it('should page through results until fewer than pageSize are returned', async () => {
      const page1 = [
        { path: 'a.md', title: 'A', tags: [], sizeBytes: 100, fileModifiedAt: '2024-01-01' },
        { path: 'b.md', title: 'B', tags: [], sizeBytes: 100, fileModifiedAt: '2024-01-01' },
      ];
      const page2 = [
        { path: 'c.md', title: 'C', tags: [], sizeBytes: 100, fileModifiedAt: '2024-01-01' },
      ];

      kyMock.get
        .mockReturnValueOnce({ json: async () => ({ documents: page1 }) })
        .mockReturnValueOnce({ json: async () => ({ documents: page2 }) });

      const results: unknown[] = [];
      for await (const doc of resource.listAll('v1', undefined, 2)) {
        results.push(doc);
      }

      expect(results).toHaveLength(3);
      expect(kyMock.get).toHaveBeenCalledTimes(2);
      expect(kyMock.get).toHaveBeenNthCalledWith(1, 'vaults/v1/documents', {
        searchParams: { limit: 2, offset: 0 },
      });
      expect(kyMock.get).toHaveBeenNthCalledWith(2, 'vaults/v1/documents', {
        searchParams: { limit: 2, offset: 2 },
      });
    });

    it('should pass dirPath as dir search param', async () => {
      mockJsonResponse(kyMock.get, { documents: [] });

      const results: unknown[] = [];
      for await (const doc of resource.listAll('v1', 'notes/')) {
        results.push(doc);
      }

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', {
        searchParams: { limit: 100, offset: 0, dir: 'notes/' },
      });
      expect(results).toHaveLength(0);
    });

    it('should stop after maxPages pages to prevent infinite loops', async () => {
      // Server always returns a full page (simulates server that ignores pagination)
      const page = [
        { path: 'a.md', title: 'A', tags: [], sizeBytes: 100, fileModifiedAt: '2024-01-01' },
        { path: 'b.md', title: 'B', tags: [], sizeBytes: 100, fileModifiedAt: '2024-01-01' },
      ];
      kyMock.get.mockReturnValue({ json: async () => ({ documents: page }) });

      const results: unknown[] = [];
      // maxPages=3 limits total fetched pages (loop runs while pageCount < 3)
      for await (const doc of resource.listAll('v1', undefined, 2, 3)) {
        results.push(doc);
      }

      // Pages fetched at pageCount=0, 1, 2 → 3 pages * 2 docs each = 6 results
      expect(results).toHaveLength(6);
      expect(kyMock.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('putMany', () => {
    it('should write multiple documents and return succeeded paths', async () => {
      const mockDoc = {
        id: 'd1', vaultId: 'v1', path: 'a.md', title: 'A', contentHash: 'abc',
        sizeBytes: 10, tags: [], encrypted: false, encryptionAlgorithm: null,
        fileModifiedAt: '2024-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.put, mockDoc);

      const result = await resource.putMany('v1', [
        { path: 'a.md', content: '# A' },
        { path: 'b.md', content: '# B' },
      ]);

      expect(result.succeeded).toEqual(['a.md', 'b.md']);
      expect(result.failed).toHaveLength(0);
    });

    it('should report failed documents when put throws', async () => {
      const mockDoc = {
        id: 'd1', vaultId: 'v1', path: 'a.md', title: 'A', contentHash: 'abc',
        sizeBytes: 10, tags: [], encrypted: false, encryptionAlgorithm: null,
        fileModifiedAt: '2024-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01',
      };
      // The second put call will fail — handleError converts generic errors to NetworkError
      kyMock.put
        .mockReturnValueOnce({ json: async () => mockDoc })
        .mockReturnValueOnce({ json: async () => { throw new Error('Network error'); } });

      const result = await resource.putMany('v1', [
        { path: 'a.md', content: '# A' },
        { path: 'b.md', content: '# B' },
      ]);

      expect(result.succeeded).toEqual(['a.md']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].path).toBe('b.md');
      // handleError wraps generic errors as NetworkError('Network request failed')
      expect(result.failed[0].error).toContain('Network request failed');
    });

    it('should return empty succeeded and failed arrays for empty input', async () => {
      const result = await resource.putMany('v1', []);

      expect(result.succeeded).toEqual([]);
      expect(result.failed).toEqual([]);
    });
  });

  describe('deleteMany', () => {
    it('should delegate to bulkDelete with the given paths', async () => {
      const mockResult = {
        succeeded: ['old/a.md', 'old/b.md'],
        failed: [],
      };
      mockJsonResponse(kyMock.post, mockResult);

      const result = await resource.deleteMany('v1', ['old/a.md', 'old/b.md']);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/bulk-delete', {
        json: { items: ['old/a.md', 'old/b.md'] },
      });
      expect(result.succeeded).toEqual(['old/a.md', 'old/b.md']);
      expect(result.failed).toHaveLength(0);
    });

    it('should return failed paths from bulkDelete response', async () => {
      const mockResult = {
        succeeded: ['old/a.md'],
        failed: [{ path: 'old/missing.md', error: 'Not found' }],
      };
      mockJsonResponse(kyMock.post, mockResult);

      const result = await resource.deleteMany('v1', ['old/a.md', 'old/missing.md']);

      expect(result.failed[0].path).toBe('old/missing.md');
    });
  });

  describe('syncList', () => {
    /** Helper: build a standard raw response mock for the conditional GET path. */
    function mockListResponse(
      status: number,
      etag: string | null,
      documents: unknown[],
    ) {
      const headers = new Headers();
      if (etag !== null) headers.set('etag', etag);
      kyMock.get.mockReturnValueOnce({
        ok: status >= 200 && status < 300,
        status,
        headers,
        json: () => (status === 304
          ? Promise.reject(new Error('json should not be called on 304'))
          : Promise.resolve({ documents })),
      } as unknown as ReturnType<typeof kyMock.get>);
    }

    const doc = (path: string, hash: string, mtime = '2024-01-01') => ({
      id: path, path, title: null, tags: [], sizeBytes: 100, fileModifiedAt: mtime, contentHash: hash,
    });

    it('classifies all docs as added when knownState is empty', async () => {
      const docs = [doc('a.md', 'h-a'), doc('b.md', 'h-b'), doc('c.md', 'h-c')];
      mockListResponse(200, 'W/"3-t"', docs);

      const result = await resource.syncList('v1', { hashes: {} });

      expect(result.vaultUnchanged).toBe(false);
      expect(result.changes).toHaveLength(3);
      expect(result.changes.every((c) => c.kind === 'added')).toBe(true);
      expect(result.changes.map((c) => c.path).sort()).toEqual(['a.md', 'b.md', 'c.md']);
      expect(result.removed).toEqual([]);
      expect(result.unchanged).toEqual([]);
      expect(result.listEtag).toBe('W/"3-t"');
    });

    it('classifies all docs as unchanged when all hashes match', async () => {
      const docs = [doc('a.md', 'h-a'), doc('b.md', 'h-b')];
      mockListResponse(200, 'W/"2-t"', docs);

      const knownState: SyncListKnownState = {
        hashes: { 'a.md': 'h-a', 'b.md': 'h-b' },
        listEtag: 'W/"old"',
      };

      const result = await resource.syncList('v1', knownState);

      expect(result.vaultUnchanged).toBe(false);
      expect(result.changes).toHaveLength(0);
      expect(result.unchanged.sort()).toEqual(['a.md', 'b.md']);
      expect(result.removed).toEqual([]);
    });

    it('reports exactly one changed entry when one hash differs', async () => {
      const docs = [doc('a.md', 'h-a-NEW'), doc('b.md', 'h-b')];
      mockListResponse(200, 'W/"2-t"', docs);

      const knownState: SyncListKnownState = {
        hashes: { 'a.md': 'h-a-OLD', 'b.md': 'h-b' },
      };

      const result = await resource.syncList('v1', knownState);

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0]).toEqual({
        path: 'a.md',
        contentHash: 'h-a-NEW',
        fileModifiedAt: '2024-01-01',
        kind: 'changed',
      });
      expect(result.unchanged).toEqual(['b.md']);
      expect(result.removed).toEqual([]);
    });

    it('reports removed paths that are in knownState but absent from server', async () => {
      const docs = [doc('a.md', 'h-a')];
      mockListResponse(200, 'W/"1-t"', docs);

      const knownState: SyncListKnownState = {
        hashes: { 'a.md': 'h-a', 'b.md': 'h-b', 'c.md': 'h-c' },
      };

      const result = await resource.syncList('v1', knownState);

      expect(result.removed.sort()).toEqual(['b.md', 'c.md']);
      expect(result.unchanged).toEqual(['a.md']);
      expect(result.changes).toHaveLength(0);
    });

    it('returns vaultUnchanged=true when server 304s (listEtag matched)', async () => {
      mockListResponse(304, 'W/"2-t"', []);

      const knownState: SyncListKnownState = {
        hashes: { 'a.md': 'h-a', 'b.md': 'h-b' },
        listEtag: 'W/"2-t"',
      };

      const result = await resource.syncList('v1', knownState);

      expect(result.vaultUnchanged).toBe(true);
      expect(result.changes).toEqual([]);
      expect(result.removed).toEqual([]);
      expect(result.unchanged.sort()).toEqual(['a.md', 'b.md']);
      expect(result.listEtag).toBe('W/"2-t"');
    });

    it('passes empty string ifNoneMatch on first call (no listEtag in knownState)', async () => {
      const docs = [doc('a.md', 'h-a')];
      mockListResponse(200, 'W/"1-t"', docs);

      await resource.syncList('v1', { hashes: {} });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', expect.objectContaining({
        headers: { 'If-None-Match': '' },
        throwHttpErrors: false,
      }));
    });

    it('old-server scenario: 200 with no etag header — vaultUnchanged=false, classification works', async () => {
      const docs = [doc('a.md', 'h-a'), doc('b.md', 'h-b-NEW')];
      mockListResponse(200, null /* no etag header */, docs);

      const knownState: SyncListKnownState = {
        hashes: { 'a.md': 'h-a', 'b.md': 'h-b-OLD' },
        listEtag: 'W/"anything"',
      };

      const result = await resource.syncList('v1', knownState);

      expect(result.vaultUnchanged).toBe(false);
      expect(result.listEtag).toBe(''); // etag is empty because old server returned no header
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].path).toBe('b.md');
      expect(result.changes[0].kind).toBe('changed');
      expect(result.unchanged).toEqual(['a.md']);
    });

    it('forwards dirPath and tags options to the list call', async () => {
      mockListResponse(200, 'W/"0-t"', []);

      await resource.syncList('v1', { hashes: {} }, { dirPath: 'notes/', tags: ['foo'] });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/documents', expect.objectContaining({
        searchParams: expect.objectContaining({ dir: 'notes/', tags: 'foo' }),
      }));
    });
  });

  describe('bulkGet', () => {
    it('POSTs the paths and returns results + failed', async () => {
      const payload = {
        results: [
          { path: 'notes/a.md', contentHash: 'hash-a', content: '# A' },
          { path: 'notes/b.md', contentHash: 'hash-b', content: '# B' },
        ],
        failed: [{ path: 'notes/missing.md', error: 'Document not found' }],
      };
      mockJsonResponse(kyMock.post, payload);

      const result = await resource.bulkGet('v1', ['notes/a.md', 'notes/b.md', 'notes/missing.md']);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/documents/bulk-get', {
        json: { paths: ['notes/a.md', 'notes/b.md', 'notes/missing.md'] },
      });
      expect(result).toEqual(payload);
    });

    it('surfaces a 400 as a ValidationError', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'At least one path is required' });

      await expect(resource.bulkGet('v1', [])).rejects.toThrow();
    });

    it('maps network failures to a NetworkError', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.bulkGet('v1', ['notes/a.md'])).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
