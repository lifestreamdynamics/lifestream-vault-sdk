import { describe, it, expect, beforeEach } from 'vitest';
import { ScimResource } from './scim.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthenticationError, ConflictError, ValidationError } from '../errors.js';

describe('ScimResource', () => {
  let resource: ScimResource;
  let kyMock: KyMock;

  const mockUser = {
    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
    id: 'user-1',
    userName: 'alice@acmecorp.com',
    name: {
      formatted: 'Alice Smith',
      givenName: 'Alice',
      familyName: 'Smith',
    },
    emails: [{ value: 'alice@acmecorp.com', primary: true }],
    active: true,
    meta: {
      resourceType: 'User',
      created: '2026-01-01T00:00:00.000Z',
      lastModified: '2026-01-01T00:00:00.000Z',
      location: '/api/v1/scim/v2/Users/user-1',
    },
  };

  const mockListResponse = {
    schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
    totalResults: 1,
    startIndex: 1,
    itemsPerPage: 100,
    Resources: [mockUser],
  };

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new ScimResource(kyMock as any);
  });

  // ── listUsers ─────────────────────────────────────────────────────────────

  describe('listUsers', () => {
    it('should return SCIM list response', async () => {
      mockJsonResponse(kyMock.get, mockListResponse);

      const result = await resource.listUsers();

      expect(kyMock.get).toHaveBeenCalledWith('Users', { searchParams: undefined });
      expect(result.Resources).toHaveLength(1);
      expect(result.totalResults).toBe(1);
    });

    it('should pass pagination params', async () => {
      mockJsonResponse(kyMock.get, mockListResponse);

      await resource.listUsers({ startIndex: 1, count: 50 });

      expect(kyMock.get).toHaveBeenCalledWith('Users', {
        searchParams: { startIndex: 1, count: 50 },
      });
    });

    it('should pass filter param', async () => {
      mockJsonResponse(kyMock.get, mockListResponse);

      await resource.listUsers({ filter: 'userName eq "alice@acmecorp.com"' });

      expect(kyMock.get).toHaveBeenCalledWith('Users', {
        searchParams: { filter: 'userName eq "alice@acmecorp.com"' },
      });
    });

    it('should throw AuthenticationError on invalid SCIM token', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Invalid SCIM token' });

      await expect(resource.listUsers()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listUsers()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── getUser ───────────────────────────────────────────────────────────────

  describe('getUser', () => {
    it('should return a single SCIM user', async () => {
      mockJsonResponse(kyMock.get, mockUser);

      const result = await resource.getUser('user-1');

      expect(kyMock.get).toHaveBeenCalledWith('Users/user-1');
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'User not found' });

      await expect(resource.getUser('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getUser('user-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── createUser ────────────────────────────────────────────────────────────

  describe('createUser', () => {
    it('should provision a new user and return SCIM user', async () => {
      mockJsonResponse(kyMock.post, mockUser);

      const input = {
        emails: [{ value: 'alice@acmecorp.com', primary: true }],
        name: { givenName: 'Alice', familyName: 'Smith' },
      };

      const result = await resource.createUser(input);

      expect(kyMock.post).toHaveBeenCalledWith('Users', { json: input });
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictError when user already exists', async () => {
      mockHTTPError(kyMock.post, 409, { message: 'User already exists' });

      await expect(resource.createUser({
        emails: [{ value: 'alice@acmecorp.com', primary: true }],
      })).rejects.toBeInstanceOf(ConflictError);
    });

    it('should throw ValidationError when email is missing', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Email is required' });

      await expect(resource.createUser({})).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.createUser({ emails: [{ value: 'a@b.com' }] })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── updateUser ────────────────────────────────────────────────────────────

  describe('updateUser', () => {
    it('should update user and return updated SCIM user', async () => {
      const updated = { ...mockUser, name: { ...mockUser.name, familyName: 'Jones' } };
      mockJsonResponse(kyMock.put, updated);

      const input = { name: { familyName: 'Jones' } };
      const result = await resource.updateUser('user-1', input);

      expect(kyMock.put).toHaveBeenCalledWith('Users/user-1', { json: input });
      expect(result.name.familyName).toBe('Jones');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockHTTPError(kyMock.put, 404, { message: 'User not found' });

      await expect(resource.updateUser('nonexistent', {})).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.put);

      await expect(resource.updateUser('user-1', {})).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── deleteUser ────────────────────────────────────────────────────────────

  describe('deleteUser', () => {
    it('should call correct endpoint', async () => {
      await resource.deleteUser('user-1');

      expect(kyMock.delete).toHaveBeenCalledWith('Users/user-1');
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'User not found' });

      await expect(resource.deleteUser('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.deleteUser('user-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── getServiceProviderConfig ──────────────────────────────────────────────

  describe('getServiceProviderConfig', () => {
    it('should return SCIM service provider config', async () => {
      const mockConfig = {
        schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
        patch: { supported: false },
        bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
        filter: { supported: true, maxResults: 100 },
        changePassword: { supported: false },
        sort: { supported: false },
        etag: { supported: false },
        authenticationSchemes: [],
      };
      mockJsonResponse(kyMock.get, mockConfig);

      const result = await resource.getServiceProviderConfig();

      expect(kyMock.get).toHaveBeenCalledWith('ServiceProviderConfig');
      expect(result.filter.supported).toBe(true);
      expect(result.filter.maxResults).toBe(100);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getServiceProviderConfig()).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
