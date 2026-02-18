import { describe, it, expect, beforeEach } from 'vitest';
import { PublishResource } from './publish.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthenticationError, AuthorizationError, ConflictError, ValidationError } from '../errors.js';

describe('PublishResource', () => {
  let resource: PublishResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new PublishResource(kyMock as any);
  });

  describe('listMine', () => {
    it('should list published documents for the current user', async () => {
      const publishedDocs = [
        {
          id: 'p1', documentId: 'd1', vaultId: 'v1', publishedBy: 'u1',
          slug: 'my-post', seoTitle: 'My Post', seoDescription: null,
          ogImage: null, isPublished: true, publishedAt: '2024-01-01',
          updatedAt: '2024-01-01', documentPath: 'blog/post.md', documentTitle: 'My Post',
        },
        {
          id: 'p2', documentId: 'd2', vaultId: 'v1', publishedBy: 'u1',
          slug: 'another-post', seoTitle: null, seoDescription: 'A description',
          ogImage: 'https://example.com/img.png', isPublished: false,
          publishedAt: '2024-02-01', updatedAt: '2024-03-01',
          documentPath: 'blog/another.md', documentTitle: 'Another Post',
        },
      ];
      mockJsonResponse(kyMock.get, { publishedDocs });

      const result = await resource.listMine('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/publish/my');
      expect(result).toEqual(publishedDocs);
    });

    it('should return empty array when no published docs', async () => {
      mockJsonResponse(kyMock.get, { publishedDocs: [] });

      const result = await resource.listMine('v1');

      expect(result).toEqual([]);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Token expired' });

      await expect(resource.listMine('v1')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listMine('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('create', () => {
    it('should publish a document with required params', async () => {
      const publishedDoc = {
        id: 'p1', documentId: 'd1', vaultId: 'v1', publishedBy: 'u1',
        slug: 'my-post', seoTitle: null, seoDescription: null,
        ogImage: null, isPublished: true, publishedAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.post, { publishedDoc });

      const result = await resource.create('v1', 'blog/post.md', { slug: 'my-post' });

      expect(kyMock.post).toHaveBeenCalledWith(
        'vaults/v1/publish/document/blog/post.md',
        { json: { slug: 'my-post' } },
      );
      expect(result).toEqual(publishedDoc);
    });

    it('should publish a document with full SEO metadata', async () => {
      const params = {
        slug: 'seo-post',
        seoTitle: 'SEO Title',
        seoDescription: 'A description for search engines.',
        ogImage: 'https://example.com/og.png',
      };
      const publishedDoc = {
        id: 'p2', documentId: 'd2', vaultId: 'v1', publishedBy: 'u1',
        slug: 'seo-post', seoTitle: 'SEO Title',
        seoDescription: 'A description for search engines.',
        ogImage: 'https://example.com/og.png', isPublished: true,
        publishedAt: '2024-01-01', updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.post, { publishedDoc });

      const result = await resource.create('v1', 'blog/seo.md', params);

      expect(kyMock.post).toHaveBeenCalledWith(
        'vaults/v1/publish/document/blog/seo.md',
        { json: params },
      );
      expect(result).toEqual(publishedDoc);
    });

    it('should throw ConflictError on 409 (slug taken)', async () => {
      mockHTTPError(kyMock.post, 409, { message: 'Slug already in use' });

      await expect(
        resource.create('v1', 'doc.md', { slug: 'taken-slug' }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.post, 404, { message: 'Document not found' });

      await expect(
        resource.create('v1', 'nonexistent.md', { slug: 'slug' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError on 403 (no publishing feature)', async () => {
      mockHTTPError(kyMock.post, 403, { message: 'Publishing not available on free plan' });

      await expect(
        resource.create('v1', 'doc.md', { slug: 'slug' }),
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Invalid slug format' });

      await expect(
        resource.create('v1', 'doc.md', { slug: 'INVALID' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(
        resource.create('v1', 'doc.md', { slug: 'slug' }),
      ).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('update', () => {
    it('should update a published document', async () => {
      const params = {
        slug: 'updated-slug',
        seoTitle: 'Updated Title',
        seoDescription: 'Updated description.',
      };
      const publishedDoc = {
        id: 'p1', documentId: 'd1', vaultId: 'v1', publishedBy: 'u1',
        slug: 'updated-slug', seoTitle: 'Updated Title',
        seoDescription: 'Updated description.', ogImage: null,
        isPublished: true, publishedAt: '2024-01-01', updatedAt: '2024-06-01',
      };
      mockJsonResponse(kyMock.put, { publishedDoc });

      const result = await resource.update('v1', 'blog/post.md', params);

      expect(kyMock.put).toHaveBeenCalledWith(
        'vaults/v1/publish/document/blog/post.md',
        { json: params },
      );
      expect(result).toEqual(publishedDoc);
    });

    it('should clear optional fields with null', async () => {
      const params = {
        slug: 'same-slug',
        seoTitle: null as string | null,
        seoDescription: null as string | null,
        ogImage: null as string | null,
      };
      const publishedDoc = {
        id: 'p1', documentId: 'd1', vaultId: 'v1', publishedBy: 'u1',
        slug: 'same-slug', seoTitle: null, seoDescription: null, ogImage: null,
        isPublished: true, publishedAt: '2024-01-01', updatedAt: '2024-06-01',
      };
      mockJsonResponse(kyMock.put, { publishedDoc });

      const result = await resource.update('v1', 'blog/post.md', params);

      expect(result).toEqual(publishedDoc);
    });

    it('should throw ConflictError on 409', async () => {
      mockHTTPError(kyMock.put, 409, { message: 'Slug already in use' });

      await expect(
        resource.update('v1', 'doc.md', { slug: 'taken' }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.put, 404, { message: 'Not found' });

      await expect(
        resource.update('v1', 'doc.md', { slug: 'slug' }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.put);

      await expect(
        resource.update('v1', 'doc.md', { slug: 'slug' }),
      ).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('delete', () => {
    it('should unpublish a document', async () => {
      await resource.delete('v1', 'blog/post.md');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/publish/document/blog/post.md');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Published document not found' });

      await expect(resource.delete('v1', 'nonexistent.md')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Insufficient permissions' });

      await expect(resource.delete('v1', 'doc.md')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.delete, 401, { message: 'Unauthorized' });

      await expect(resource.delete('v1', 'doc.md')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.delete('v1', 'doc.md')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getSubdomain', () => {
    it('should get the subdomain for a vault', async () => {
      mockJsonResponse(kyMock.get, { subdomain: 'my-site' });

      const result = await resource.getSubdomain('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/publish/subdomain');
      expect(result.subdomain).toBe('my-site');
    });

    it('should return null subdomain when not set', async () => {
      mockJsonResponse(kyMock.get, { subdomain: null });

      const result = await resource.getSubdomain('v1');

      expect(result.subdomain).toBeNull();
    });
  });

  describe('setSubdomain', () => {
    it('should set the subdomain for a vault', async () => {
      mockJsonResponse(kyMock.put, { subdomain: 'my-custom-site' });

      const result = await resource.setSubdomain('v1', 'my-custom-site');

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1/publish/subdomain', { json: { subdomain: 'my-custom-site' } });
      expect(result.subdomain).toBe('my-custom-site');
    });

    it('should throw ConflictError if subdomain is already taken', async () => {
      mockHTTPError(kyMock.put, 409, { message: 'Subdomain already taken' });

      await expect(resource.setSubdomain('v1', 'taken')).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe('deleteSubdomain', () => {
    it('should delete the subdomain and return success message', async () => {
      mockJsonResponse(kyMock.delete, { message: 'Subdomain removed' });

      const result = await resource.deleteSubdomain('v1');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/publish/subdomain');
      expect(result.message).toBe('Subdomain removed');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.deleteSubdomain('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
