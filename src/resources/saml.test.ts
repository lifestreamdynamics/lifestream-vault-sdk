import { describe, it, expect, beforeEach } from 'vitest';
import { SamlResource } from './saml.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthenticationError, AuthorizationError, ValidationError, ConflictError } from '../errors.js';

describe('SamlResource', () => {
  let resource: SamlResource;
  let kyMock: KyMock;
  const baseUrl = 'https://vault.example.com';

  const mockConfig = {
    id: 'sso-1',
    domain: 'acmecorp.com',
    slug: 'acmecorp',
    entityId: 'https://idp.acmecorp.com/saml',
    ssoUrl: 'https://idp.acmecorp.com/sso',
    certificate: '-----BEGIN CERTIFICATE-----\nMIIBxxx\n-----END CERTIFICATE-----',
    spEntityId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new SamlResource(kyMock as any, baseUrl);
  });

  // ── listConfigs ───────────────────────────────────────────────────────────

  describe('listConfigs', () => {
    it('should return array of SSO configs', async () => {
      mockJsonResponse(kyMock.get, [mockConfig]);

      const result = await resource.listConfigs();

      expect(kyMock.get).toHaveBeenCalledWith('admin/sso-configs');
      expect(result).toEqual([mockConfig]);
    });

    it('should return empty array when no configs exist', async () => {
      mockJsonResponse(kyMock.get, []);

      const result = await resource.listConfigs();

      expect(result).toEqual([]);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Admin access required' });

      await expect(resource.listConfigs()).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.listConfigs()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listConfigs()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── getConfig ────────────────────────────────────────────────────────────

  describe('getConfig', () => {
    it('should return a single SSO config by ID', async () => {
      mockJsonResponse(kyMock.get, mockConfig);

      const result = await resource.getConfig('sso-1');

      expect(kyMock.get).toHaveBeenCalledWith('admin/sso-configs/sso-1');
      expect(result).toEqual(mockConfig);
    });

    it('should throw NotFoundError when config does not exist', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'SSO config not found' });

      await expect(resource.getConfig('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getConfig('sso-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── createConfig ─────────────────────────────────────────────────────────

  describe('createConfig', () => {
    it('should create a config and return it', async () => {
      mockJsonResponse(kyMock.post, mockConfig);

      const input = {
        domain: 'acmecorp.com',
        slug: 'acmecorp',
        entityId: 'https://idp.acmecorp.com/saml',
        ssoUrl: 'https://idp.acmecorp.com/sso',
        certificate: '-----BEGIN CERTIFICATE-----\nMIIBxxx\n-----END CERTIFICATE-----',
      };

      const result = await resource.createConfig(input);

      expect(kyMock.post).toHaveBeenCalledWith('admin/sso-configs', { json: input });
      expect(result).toEqual(mockConfig);
    });

    it('should throw ValidationError on invalid input', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Validation failed' });

      await expect(resource.createConfig({
        domain: '',
        slug: '',
        entityId: '',
        ssoUrl: '',
        certificate: '',
      })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw ConflictError when slug already exists', async () => {
      mockHTTPError(kyMock.post, 409, { message: 'Slug already in use' });

      await expect(resource.createConfig({
        domain: 'acmecorp.com',
        slug: 'acmecorp',
        entityId: 'https://idp.acmecorp.com/saml',
        ssoUrl: 'https://idp.acmecorp.com/sso',
        certificate: 'cert',
      })).rejects.toBeInstanceOf(ConflictError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.createConfig({
        domain: 'a.com', slug: 'a', entityId: 'e', ssoUrl: 's', certificate: 'c',
      })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── updateConfig ─────────────────────────────────────────────────────────

  describe('updateConfig', () => {
    it('should update a config and return the updated record', async () => {
      const updated = { ...mockConfig, ssoUrl: 'https://idp.acmecorp.com/sso-new' };
      mockJsonResponse(kyMock.put, updated);

      const input = { ssoUrl: 'https://idp.acmecorp.com/sso-new' };
      const result = await resource.updateConfig('sso-1', input);

      expect(kyMock.put).toHaveBeenCalledWith('admin/sso-configs/sso-1', { json: input });
      expect(result.ssoUrl).toBe('https://idp.acmecorp.com/sso-new');
    });

    it('should throw NotFoundError when config does not exist', async () => {
      mockHTTPError(kyMock.put, 404, { message: 'SSO config not found' });

      await expect(resource.updateConfig('nonexistent', {})).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.put);

      await expect(resource.updateConfig('sso-1', {})).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── deleteConfig ─────────────────────────────────────────────────────────

  describe('deleteConfig', () => {
    it('should call correct endpoint', async () => {
      await resource.deleteConfig('sso-1');

      expect(kyMock.delete).toHaveBeenCalledWith('admin/sso-configs/sso-1');
    });

    it('should throw NotFoundError when config does not exist', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'SSO config not found' });

      await expect(resource.deleteConfig('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.deleteConfig('sso-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── getMetadata ───────────────────────────────────────────────────────────

  describe('getMetadata', () => {
    it('should return XML metadata string', async () => {
      const xml = '<?xml version="1.0"?><EntityDescriptor/>';
      kyMock.get.mockReturnValue({
        json: async () => xml,
        text: async () => xml,
        ok: true,
        status: 200,
      });

      const result = await resource.getMetadata('acmecorp');

      expect(kyMock.get).toHaveBeenCalledWith('auth/saml/acmecorp/metadata');
      expect(result).toBe(xml);
    });

    it('should throw NotFoundError when slug does not exist', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'SSO config not found' });

      await expect(resource.getMetadata('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getMetadata('acmecorp')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── getLoginUrl ───────────────────────────────────────────────────────────

  describe('getLoginUrl', () => {
    it('should return the correct login URL', () => {
      const url = resource.getLoginUrl('acmecorp');

      expect(url).toBe('https://vault.example.com/api/v1/auth/saml/acmecorp/login');
    });

    it('should use the baseUrl provided at construction', () => {
      const resource2 = new SamlResource(kyMock as any, 'https://custom.example.org');
      const url = resource2.getLoginUrl('myslug');

      expect(url).toBe('https://custom.example.org/api/v1/auth/saml/myslug/login');
    });
  });
});
