import { describe, it, expect, beforeEach } from 'vitest';
import { MfaResource } from './mfa.js';
import {
  createKyMock,
  mockJsonResponse,
  mockNetworkError,
  mockHTTPError,
  type KyMock,
} from '../__tests__/mocks/ky.js';
import {
  NetworkError,
  NotFoundError,
  AuthenticationError,
  ValidationError,
  ConflictError,
} from '../errors.js';

describe('MfaResource', () => {
  let resource: MfaResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new MfaResource(kyMock as any);
  });

  describe('getStatus', () => {
    it('should retrieve MFA status', async () => {
      const status = {
        mfaEnabled: true,
        totpConfigured: true,
        passkeyCount: 2,
        backupCodesRemaining: 8,
        passkeys: [
          { id: 'pk1', name: 'YubiKey 5', createdAt: '2024-01-01', lastUsedAt: '2024-02-01' },
          { id: 'pk2', name: 'iPhone 15', createdAt: '2024-01-15', lastUsedAt: null },
        ],
      };
      mockJsonResponse(kyMock.get, status);

      const result = await resource.getStatus();

      expect(kyMock.get).toHaveBeenCalledWith('account/mfa/status');
      expect(result).toEqual(status);
    });

    it('should return status for user without MFA', async () => {
      const status = {
        mfaEnabled: false,
        totpConfigured: false,
        passkeyCount: 0,
        backupCodesRemaining: 0,
        passkeys: [],
      };
      mockJsonResponse(kyMock.get, status);

      const result = await resource.getStatus();

      expect(result.mfaEnabled).toBe(false);
      expect(result.totpConfigured).toBe(false);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.getStatus()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getStatus()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('setupTotp', () => {
    it('should initiate TOTP setup', async () => {
      const setup = {
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUri: 'otpauth://totp/Lifestream:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Lifestream',
        qrCodeDataUri: 'data:image/png;base64,iVBORw0KG...',
      };
      mockJsonResponse(kyMock.post, setup);

      const result = await resource.setupTotp();

      expect(kyMock.post).toHaveBeenCalledWith('account/mfa/totp/setup');
      expect(result).toEqual(setup);
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.otpauthUri).toContain('otpauth://totp/');
      expect(result.qrCodeDataUri).toContain('data:image/png;base64,');
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.post, 401, { message: 'Unauthorized' });

      await expect(resource.setupTotp()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw ConflictError on 409 if TOTP already configured', async () => {
      mockHTTPError(kyMock.post, 409, { message: 'TOTP already configured' });

      await expect(resource.setupTotp()).rejects.toBeInstanceOf(ConflictError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.setupTotp()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('verifyTotp', () => {
    it('should verify TOTP code and return backup codes', async () => {
      const response = {
        backupCodes: [
          'AAAA-BBBB-CCCC-DDDD',
          'EEEE-FFFF-GGGG-HHHH',
          'IIII-JJJJ-KKKK-LLLL',
          'MMMM-NNNN-OOOO-PPPP',
          'QQQQ-RRRR-SSSS-TTTT',
          'UUUU-VVVV-WWWW-XXXX',
          'YYYY-ZZZZ-1111-2222',
          '3333-4444-5555-6666',
          '7777-8888-9999-0000',
          'AAAA-AAAA-AAAA-AAAA',
        ],
      };
      mockJsonResponse(kyMock.post, response);

      const result = await resource.verifyTotp('123456');

      expect(kyMock.post).toHaveBeenCalledWith('account/mfa/totp/verify', {
        json: { code: '123456' },
      });
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should throw ValidationError on invalid code', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Invalid TOTP code' });

      await expect(resource.verifyTotp('000000')).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.post, 401, { message: 'Unauthorized' });

      await expect(resource.verifyTotp('123456')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.verifyTotp('123456')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('disableTotp', () => {
    it('should disable TOTP with password', async () => {
      const response = { message: 'TOTP disabled successfully' };
      mockJsonResponse(kyMock.delete, response);

      const result = await resource.disableTotp('my-password');

      expect(kyMock.delete).toHaveBeenCalledWith('account/mfa/totp', {
        json: { password: 'my-password' },
      });
      expect(result.message).toBe('TOTP disabled successfully');
    });

    it('should throw ValidationError on incorrect password', async () => {
      mockHTTPError(kyMock.delete, 400, { message: 'Incorrect password' });

      await expect(resource.disableTotp('wrong-password')).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.delete, 401, { message: 'Unauthorized' });

      await expect(resource.disableTotp('password')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.disableTotp('password')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('listPasskeys', () => {
    it('should list all passkeys', async () => {
      const response = {
        passkeys: [
          { id: 'pk1', name: 'YubiKey 5', createdAt: '2024-01-01', lastUsedAt: '2024-02-01' },
          { id: 'pk2', name: 'iPhone 15', createdAt: '2024-01-15', lastUsedAt: null },
        ],
      };
      mockJsonResponse(kyMock.get, response);

      const result = await resource.listPasskeys();

      expect(kyMock.get).toHaveBeenCalledWith('account/mfa/passkeys');
      expect(result.passkeys).toHaveLength(2);
      expect(result.passkeys[0].name).toBe('YubiKey 5');
    });

    it('should return empty array when no passkeys', async () => {
      mockJsonResponse(kyMock.get, { passkeys: [] });

      const result = await resource.listPasskeys();

      expect(result.passkeys).toEqual([]);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.get, 401, { message: 'Unauthorized' });

      await expect(resource.listPasskeys()).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listPasskeys()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('deletePasskey', () => {
    it('should delete a passkey without password', async () => {
      const response = { message: 'Passkey deleted successfully' };
      mockJsonResponse(kyMock.delete, response);

      const result = await resource.deletePasskey('pk1');

      expect(kyMock.delete).toHaveBeenCalledWith('account/mfa/passkeys/pk1', {
        json: undefined,
      });
      expect(result.message).toBe('Passkey deleted successfully');
    });

    it('should delete a passkey with password (last MFA method)', async () => {
      const response = { message: 'Passkey deleted successfully' };
      mockJsonResponse(kyMock.delete, response);

      const result = await resource.deletePasskey('pk1', 'my-password');

      expect(kyMock.delete).toHaveBeenCalledWith('account/mfa/passkeys/pk1', {
        json: { password: 'my-password' },
      });
      expect(result.message).toBe('Passkey deleted successfully');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Passkey not found' });

      await expect(resource.deletePasskey('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError if password required but not provided', async () => {
      mockHTTPError(kyMock.delete, 400, { message: 'Password required' });

      await expect(resource.deletePasskey('pk1')).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.delete, 401, { message: 'Unauthorized' });

      await expect(resource.deletePasskey('pk1')).rejects.toBeInstanceOf(AuthenticationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.deletePasskey('pk1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('renamePasskey', () => {
    it('should rename a passkey', async () => {
      const updated = {
        id: 'pk1',
        name: 'Work Laptop',
        createdAt: '2024-01-01',
        lastUsedAt: '2024-02-01',
      };
      mockJsonResponse(kyMock.patch, updated);

      const result = await resource.renamePasskey('pk1', 'Work Laptop');

      expect(kyMock.patch).toHaveBeenCalledWith('account/mfa/passkeys/pk1', {
        json: { name: 'Work Laptop' },
      });
      expect(result.name).toBe('Work Laptop');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.patch, 404, { message: 'Passkey not found' });

      await expect(resource.renamePasskey('nonexistent', 'New Name')).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('should throw ValidationError on invalid name', async () => {
      mockHTTPError(kyMock.patch, 400, { message: 'Invalid passkey name' });

      await expect(resource.renamePasskey('pk1', '')).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.patch, 401, { message: 'Unauthorized' });

      await expect(resource.renamePasskey('pk1', 'New Name')).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.patch);

      await expect(resource.renamePasskey('pk1', 'New Name')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes with password', async () => {
      const response = {
        backupCodes: [
          'NEW1-NEW2-NEW3-NEW4',
          'NEW5-NEW6-NEW7-NEW8',
          'NEW9-NEWA-NEWB-NEWC',
          'NEWD-NEWE-NEWF-NEWG',
          'NEWH-NEWI-NEWJ-NEWK',
          'NEWL-NEWM-NEWN-NEWO',
          'NEWP-NEWQ-NEWR-NEWS',
          'NEWT-NEWU-NEWV-NEWW',
          'NEWX-NEWY-NEWZ-NEW0',
          'NEW1-NEW1-NEW1-NEW1',
        ],
      };
      mockJsonResponse(kyMock.post, response);

      const result = await resource.regenerateBackupCodes('my-password');

      expect(kyMock.post).toHaveBeenCalledWith('account/mfa/backup-codes/regenerate', {
        json: { password: 'my-password' },
      });
      expect(result.backupCodes).toHaveLength(10);
    });

    it('should throw ValidationError on incorrect password', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Incorrect password' });

      await expect(resource.regenerateBackupCodes('wrong-password')).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it('should throw AuthenticationError on 401', async () => {
      mockHTTPError(kyMock.post, 401, { message: 'Unauthorized' });

      await expect(resource.regenerateBackupCodes('password')).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.regenerateBackupCodes('password')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
