import { describe, it, expect, beforeEach } from 'vitest';
import { CustomDomainsResource } from './custom-domains.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, ConflictError, ValidationError } from '../errors.js';

const mockDomain = {
  id: 'dom1',
  userId: 'u1',
  domain: 'docs.example.com',
  verified: false,
  verificationToken: 'tok_abc123',
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('CustomDomainsResource', () => {
  let resource: CustomDomainsResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new CustomDomainsResource(kyMock as any);
  });

  describe('list', () => {
    it('should list custom domains', async () => {
      mockJsonResponse(kyMock.get, { domains: [mockDomain] });

      const result = await resource.list();

      expect(kyMock.get).toHaveBeenCalledWith('custom-domains');
      expect(result).toEqual([mockDomain]);
    });

    it('should return empty array when no domains', async () => {
      mockJsonResponse(kyMock.get, { domains: [] });

      const result = await resource.list();

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('create', () => {
    it('should create a custom domain', async () => {
      mockJsonResponse(kyMock.post, { domain: mockDomain });

      const result = await resource.create({ domain: 'docs.example.com' });

      expect(kyMock.post).toHaveBeenCalledWith('custom-domains', { json: { domain: 'docs.example.com' } });
      expect(result).toEqual(mockDomain);
      expect(result.verified).toBe(false);
    });

    it('should throw ConflictError if domain already exists', async () => {
      mockHTTPError(kyMock.post, 409, { message: 'Domain already in use' });

      await expect(resource.create({ domain: 'docs.example.com' })).rejects.toBeInstanceOf(ConflictError);
    });

    it('should throw ValidationError for invalid domain format', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Invalid domain format' });

      await expect(resource.create({ domain: 'not a domain' })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('get', () => {
    it('should get a custom domain by id', async () => {
      mockJsonResponse(kyMock.get, { domain: mockDomain });

      const result = await resource.get('dom1');

      expect(kyMock.get).toHaveBeenCalledWith('custom-domains/dom1');
      expect(result).toEqual(mockDomain);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Domain not found' });

      await expect(resource.get('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update a custom domain', async () => {
      const updated = { ...mockDomain, domain: 'api.example.com' };
      mockJsonResponse(kyMock.patch, { domain: updated });

      const result = await resource.update('dom1', { domain: 'api.example.com' });

      expect(kyMock.patch).toHaveBeenCalledWith('custom-domains/dom1', { json: { domain: 'api.example.com' } });
      expect(result.domain).toBe('api.example.com');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.patch, 404, { message: 'Domain not found' });

      await expect(resource.update('nonexistent', { domain: 'x.com' })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete a custom domain', async () => {
      await resource.delete('dom1');

      expect(kyMock.delete).toHaveBeenCalledWith('custom-domains/dom1');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Domain not found' });

      await expect(resource.delete('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('verify', () => {
    it('should verify a custom domain and return the verified domain', async () => {
      const verifiedDomain = { ...mockDomain, verified: true };
      mockJsonResponse(kyMock.post, { domain: verifiedDomain });

      const result = await resource.verify('dom1');

      expect(kyMock.post).toHaveBeenCalledWith('custom-domains/dom1/verify');
      expect(result.verified).toBe(true);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.verify('dom1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('checkDns', () => {
    it('should check DNS resolution for a domain', async () => {
      const dnsResult = {
        domain: 'docs.example.com',
        resolved: true,
        expectedValue: 'lsvault-verify=tok_abc123',
        actualValue: 'lsvault-verify=tok_abc123',
      };
      mockJsonResponse(kyMock.get, dnsResult);

      const result = await resource.checkDns('dom1');

      expect(kyMock.get).toHaveBeenCalledWith('custom-domains/dom1/check');
      expect(result.resolved).toBe(true);
      expect(result.domain).toBe('docs.example.com');
    });

    it('should return unresolved when DNS is not set up', async () => {
      const dnsResult = {
        domain: 'docs.example.com',
        resolved: false,
        expectedValue: 'lsvault-verify=tok_abc123',
      };
      mockJsonResponse(kyMock.get, dnsResult);

      const result = await resource.checkDns('dom1');

      expect(result.resolved).toBe(false);
      expect(result.actualValue).toBeUndefined();
    });
  });
});
