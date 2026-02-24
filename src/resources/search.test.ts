import { describe, it, expect, beforeEach } from 'vitest';
import { SearchResource } from './search.js';
import { createKyMock, mockJsonResponse, mockNetworkError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError } from '../errors.js';

describe('SearchResource', () => {
  let resource: SearchResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new SearchResource(kyMock as any);
  });

  describe('search', () => {
    it('should search with query only', async () => {
      const mockResponse = {
        results: [
          {
            documentId: 'd1', vaultId: 'v1', vaultName: 'Main', path: 'hello.md',
            title: 'Hello', snippet: '...match...', tags: [], rank: 0.9, fileModifiedAt: '2024-01-01',
          },
        ],
        total: 1,
        query: 'hello',
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.search({ q: 'hello' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'hello' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should search with vault filter', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'test' });

      await resource.search({ q: 'test', vault: 'v1' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'test', vault: 'v1' },
      });
    });

    it('should search with tags filter', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'tagged' });

      await resource.search({ q: 'tagged', tags: 'javascript,typescript' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'tagged', tags: 'javascript,typescript' },
      });
    });

    it('should search with pagination', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 50, query: 'lots' });

      await resource.search({ q: 'lots', limit: 10, offset: 20 });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'lots', limit: 10, offset: 20 },
      });
    });

    it('should search with all parameters', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'all' });

      await resource.search({ q: 'all', vault: 'v2', tags: 'tag1', limit: 5, offset: 10 });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'all', vault: 'v2', tags: 'tag1', limit: 5, offset: 10 },
      });
    });

    it('should not include undefined optional params', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'clean' });

      await resource.search({ q: 'clean', vault: undefined, tags: undefined });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'clean' },
      });
    });

    it('should search with mode parameter', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'ml', mode: 'semantic' });

      await resource.search({ q: 'ml', mode: 'semantic' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'ml', mode: 'semantic' },
      });
    });

    it('should search with hybrid mode', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'test', mode: 'hybrid' });

      await resource.search({ q: 'test', mode: 'hybrid' });

      expect(kyMock.get).toHaveBeenCalledWith('search', {
        searchParams: { q: 'test', mode: 'hybrid' },
      });
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.search({ q: 'fail' })).rejects.toBeInstanceOf(NetworkError);
      await expect(resource.search({ q: 'fail' })).rejects.toThrow('Network request failed');
    });
  });

  describe('searchAll', () => {
    it('should yield all results when fewer than pageSize are returned', async () => {
      const mockResponse = {
        results: [
          {
            documentId: 'd1', vaultId: 'v1', vaultName: 'Main', path: 'hello.md',
            title: 'Hello', snippet: '...match...', tags: [], rank: 0.9, fileModifiedAt: '2024-01-01',
          },
          {
            documentId: 'd2', vaultId: 'v1', vaultName: 'Main', path: 'world.md',
            title: 'World', snippet: '...other...', tags: [], rank: 0.8, fileModifiedAt: '2024-01-02',
          },
        ],
        total: 2,
        query: 'hello',
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const results: unknown[] = [];
      for await (const result of resource.searchAll({ q: 'hello' })) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results).toEqual(mockResponse.results);
      expect(kyMock.get).toHaveBeenCalledTimes(1);
    });

    it('should page through results until fewer than pageSize are returned', async () => {
      const page1Result = {
        results: [
          { documentId: 'd1', vaultId: 'v1', vaultName: 'Main', path: 'a.md', title: 'A', snippet: '', tags: [], rank: 1.0, fileModifiedAt: '2024-01-01' },
          { documentId: 'd2', vaultId: 'v1', vaultName: 'Main', path: 'b.md', title: 'B', snippet: '', tags: [], rank: 0.9, fileModifiedAt: '2024-01-01' },
        ],
        total: 3,
        query: 'test',
      };
      const page2Result = {
        results: [
          { documentId: 'd3', vaultId: 'v1', vaultName: 'Main', path: 'c.md', title: 'C', snippet: '', tags: [], rank: 0.8, fileModifiedAt: '2024-01-01' },
        ],
        total: 3,
        query: 'test',
      };

      kyMock.get
        .mockReturnValueOnce({ json: async () => page1Result })
        .mockReturnValueOnce({ json: async () => page2Result });

      const results: unknown[] = [];
      for await (const result of resource.searchAll({ q: 'test' }, 2)) {
        results.push(result);
      }

      expect(results).toHaveLength(3);
      expect(kyMock.get).toHaveBeenCalledTimes(2);
    });

    it('should pass vault and tags filters through to each page request', async () => {
      mockJsonResponse(kyMock.get, { results: [], total: 0, query: 'filtered' });

      const results: unknown[] = [];
      for await (const result of resource.searchAll({ q: 'filtered', vault: 'v2', tags: 'tag1' })) {
        results.push(result);
      }

      expect(kyMock.get).toHaveBeenCalledWith('search', expect.objectContaining({
        searchParams: expect.objectContaining({ q: 'filtered', vault: 'v2', tags: 'tag1' }),
      }));
    });
  });
});
