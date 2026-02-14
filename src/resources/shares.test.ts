import { describe, it, expect, beforeEach } from 'vitest';
import { SharesResource } from './shares.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthenticationError, ValidationError, AuthorizationError } from '../errors.js';

describe('SharesResource', () => {
  let resource: SharesResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new SharesResource(kyMock as any);
  });

  describe('list', () => {
    it('should list share links for a document', async () => {
      const shareLinks = [
        {
          id: 'sl1', documentId: 'd1', vaultId: 'v1', createdBy: 'u1',
          tokenPrefix: 'abc12345', permission: 'view', expiresAt: null,
          maxViews: null, viewCount: 5, isActive: true, createdAt: '2024-01-01',
        },
        {
          id: 'sl2', documentId: 'd1', vaultId: 'v1', createdBy: 'u1',
          tokenPrefix: 'def67890', permission: 'edit', expiresAt: '2025-12-31T00:00:00Z',
          maxViews: 100, viewCount: 12, isActive: true, createdAt: '2024-02-01',
        },
      ];
      mockJsonResponse(kyMock.get, { shareLinks });

      const result = await resource.list('v1', 'notes/meeting.md');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/shares/document/notes/meeting.md');
      expect(result).toEqual(shareLinks);
    });

    it('should return empty array when no share links exist', async () => {
      mockJsonResponse(kyMock.get, { shareLinks: [] });

      const result = await resource.list('v1', 'notes/empty.md');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Document not found' });

      await expect(resource.list('v1', 'nonexistent.md')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Token expired' });

      await expect(resource.list('v1', 'doc.md')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list('v1', 'doc.md')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('create', () => {
    it('should create a share link with default parameters', async () => {
      const response = {
        shareLink: {
          id: 'sl1', documentId: 'd1', vaultId: 'v1', createdBy: 'u1',
          tokenPrefix: 'abc12345', permission: 'view', expiresAt: null,
          maxViews: null, viewCount: 0, isActive: true, createdAt: '2024-01-01',
        },
        fullToken: 'abc12345_long_token_value',
      };
      mockJsonResponse(kyMock.post, response);

      const result = await resource.create('v1', 'notes/meeting.md');

      expect(kyMock.post).toHaveBeenCalledWith(
        'vaults/v1/shares/document/notes/meeting.md',
        { json: {} },
      );
      expect(result).toEqual(response);
    });

    it('should create a share link with all parameters', async () => {
      const params = {
        permission: 'edit' as const,
        password: 'secret123',
        expiresAt: '2025-12-31T00:00:00Z',
        maxViews: 50,
      };
      const response = {
        shareLink: {
          id: 'sl2', documentId: 'd1', vaultId: 'v1', createdBy: 'u1',
          tokenPrefix: 'xyz98765', permission: 'edit', expiresAt: '2025-12-31T00:00:00Z',
          maxViews: 50, viewCount: 0, isActive: true, createdAt: '2024-01-01',
        },
        fullToken: 'xyz98765_secret_token',
      };
      mockJsonResponse(kyMock.post, response);

      const result = await resource.create('v1', 'docs/secret.md', params);

      expect(kyMock.post).toHaveBeenCalledWith(
        'vaults/v1/shares/document/docs/secret.md',
        { json: params },
      );
      expect(result).toEqual(response);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Invalid password' });

      await expect(
        resource.create('v1', 'doc.md', { password: 'ab' }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.post, 404, { message: 'Document not found' });

      await expect(
        resource.create('v1', 'nonexistent.md'),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.create('v1', 'doc.md')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('revoke', () => {
    it('should revoke a share link', async () => {
      await resource.revoke('v1', 'sl1');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/shares/sl1');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Share link not found' });

      await expect(resource.revoke('v1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.delete, 401, { message: 'Unauthorized' });

      await expect(resource.revoke('v1', 'sl1')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Not your share link' });

      await expect(resource.revoke('v1', 'sl1')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.revoke('v1', 'sl1')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
