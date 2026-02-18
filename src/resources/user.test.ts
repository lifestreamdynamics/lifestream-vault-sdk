import { describe, it, expect, beforeEach } from 'vitest';
import { UserResource } from './user.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, AuthenticationError, NotFoundError } from '../errors.js';

describe('UserResource', () => {
  let resource: UserResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new UserResource(kyMock as any);
  });

  describe('me', () => {
    it('should return the current user profile', async () => {
      const mockUser = {
        id: 'u1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        subscriptionTier: 'pro',
        subscriptionExpiresAt: '2025-12-31T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-06-01T00:00:00Z',
      };
      mockJsonResponse(kyMock.get, { user: mockUser });

      const result = await resource.me();

      expect(kyMock.get).toHaveBeenCalledWith('users/me');
      expect(result).toEqual(mockUser);
    });

    it('should handle user with null name and free tier', async () => {
      const mockUser = {
        id: 'u2',
        email: 'free@example.com',
        name: null,
        role: 'user',
        subscriptionTier: 'free',
        subscriptionExpiresAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      mockJsonResponse(kyMock.get, { user: mockUser });

      const result = await resource.me();

      expect(result.name).toBeNull();
      expect(result.subscriptionTier).toBe('free');
      expect(result.subscriptionExpiresAt).toBeNull();
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.me()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.me()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getStorage', () => {
    it('should return storage usage', async () => {
      const mockStorage = {
        totalBytes: 5242880,
        limitBytes: 104857600,
        vaults: [
          { vaultId: 'v1', name: 'Notes', bytes: 3145728, documentCount: 42 },
          { vaultId: 'v2', name: 'Work', bytes: 2097152, documentCount: 18 },
        ],
        vaultCount: 2,
        vaultLimit: 10,
        tier: 'pro',
      };
      mockJsonResponse(kyMock.get, mockStorage);

      const result = await resource.getStorage();

      expect(kyMock.get).toHaveBeenCalledWith('users/me/storage');
      expect(result).toEqual(mockStorage);
      expect(result.vaults).toHaveLength(2);
    });

    it('should handle empty storage', async () => {
      const mockStorage = {
        totalBytes: 0,
        limitBytes: 52428800,
        vaults: [],
        vaultCount: 0,
        vaultLimit: 3,
        tier: 'free',
      };
      mockJsonResponse(kyMock.get, mockStorage);

      const result = await resource.getStorage();

      expect(result.totalBytes).toBe(0);
      expect(result.vaults).toEqual([]);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.getStorage()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getStorage()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('changePassword', () => {
    it('should change password via PUT to account/password', async () => {
      mockJsonResponse(kyMock.put, { message: 'Password updated' });

      const result = await resource.changePassword({ currentPassword: 'old', newPassword: 'new' });

      expect(kyMock.put).toHaveBeenCalledWith('account/password', {
        json: { currentPassword: 'old', newPassword: 'new' },
      });
      expect(result.message).toBe('Password updated');
    });

    it('should throw AuthenticationError if current password is wrong', async () => {
      mockHTTPError(kyMock.put, 401, { message: 'Incorrect current password' });

      await expect(
        resource.changePassword({ currentPassword: 'wrong', newPassword: 'new' }),
      ).rejects.toBeInstanceOf(AuthenticationError);
    });
  });

  describe('getSessions', () => {
    it('should get active sessions and unwrap sessions array', async () => {
      const sessions = [
        { id: 's1', createdAt: '2024-01-01', lastSeenAt: '2024-01-10', ipAddress: '1.2.3.4', userAgent: 'Chrome', current: true },
        { id: 's2', createdAt: '2024-01-02', lastSeenAt: '2024-01-05', ipAddress: null, userAgent: null, current: false },
      ];
      mockJsonResponse(kyMock.get, { sessions });

      const result = await resource.getSessions();

      expect(kyMock.get).toHaveBeenCalledWith('account/sessions');
      expect(result).toEqual(sessions);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no sessions', async () => {
      mockJsonResponse(kyMock.get, { sessions: [] });

      const result = await resource.getSessions();

      expect(result).toEqual([]);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a specific session', async () => {
      mockJsonResponse(kyMock.delete, { message: 'Session revoked' });

      const result = await resource.revokeSession('s1');

      expect(kyMock.delete).toHaveBeenCalledWith('account/sessions/s1');
      expect(result.message).toBe('Session revoked');
    });

    it('should throw NotFoundError if session does not exist', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Session not found' });

      await expect(resource.revokeSession('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('requestDataExport', () => {
    it('should request a data export and unwrap export record', async () => {
      const exportRecord = { id: 'e1', status: 'pending' as const, format: 'zip', createdAt: '2024-01-01' };
      mockJsonResponse(kyMock.post, { export: exportRecord });

      const result = await resource.requestDataExport();

      expect(kyMock.post).toHaveBeenCalledWith('account/export', { json: { format: undefined } });
      expect(result).toEqual(exportRecord);
      expect(result.status).toBe('pending');
    });

    it('should pass format when provided', async () => {
      const exportRecord = { id: 'e2', status: 'pending' as const, format: 'zip', createdAt: '2024-01-01' };
      mockJsonResponse(kyMock.post, { export: exportRecord });

      await resource.requestDataExport('zip');

      expect(kyMock.post).toHaveBeenCalledWith('account/export', { json: { format: 'zip' } });
    });
  });

  describe('getConsents', () => {
    it('should get consent records and unwrap consents array', async () => {
      const consents = [
        { consentType: 'tos', version: '1.0', granted: true, recordedAt: '2024-01-01' },
        { consentType: 'privacy_policy', version: '1.0', granted: true, recordedAt: '2024-01-01' },
      ];
      mockJsonResponse(kyMock.get, { consents });

      const result = await resource.getConsents();

      expect(kyMock.get).toHaveBeenCalledWith('account/consents');
      expect(result).toEqual(consents);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no consents', async () => {
      mockJsonResponse(kyMock.get, { consents: [] });

      const result = await resource.getConsents();

      expect(result).toEqual([]);
    });
  });

  describe('listTeamInvitations', () => {
    it('should get pending invitations and unwrap invitations array', async () => {
      const invitations = [
        { id: 'inv1', teamId: 't1', teamName: 'Engineering', role: 'member' as const, invitedBy: 'owner@test.com', createdAt: '2024-01-01', expiresAt: '2024-01-08' },
      ];
      mockJsonResponse(kyMock.get, { invitations });

      const result = await resource.listTeamInvitations();

      expect(kyMock.get).toHaveBeenCalledWith('users/me/invitations');
      expect(result).toEqual(invitations);
    });

    it('should return empty array when no invitations', async () => {
      mockJsonResponse(kyMock.get, { invitations: [] });

      const result = await resource.listTeamInvitations();

      expect(result).toEqual([]);
    });
  });

  describe('acceptTeamInvitation', () => {
    it('should accept a team invitation', async () => {
      mockJsonResponse(kyMock.post, { message: 'Invitation accepted' });

      const result = await resource.acceptTeamInvitation('inv1');

      expect(kyMock.post).toHaveBeenCalledWith('users/me/invitations/inv1/accept');
      expect(result.message).toBe('Invitation accepted');
    });

    it('should throw NotFoundError if invitation expired or not found', async () => {
      mockHTTPError(kyMock.post, 404, { message: 'Invitation not found' });

      await expect(resource.acceptTeamInvitation('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
