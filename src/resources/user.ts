import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** The authenticated user's profile. */
export interface User {
  /** Unique user identifier. */
  id: string;
  /** User email address. */
  email: string;
  /** Display name, if set. */
  name: string | null;
  /** User role (`user` or `admin`). */
  role: string;
  /** Current subscription tier (`free`, `pro`, or `business`). */
  subscriptionTier: string;
  /** ISO 8601 subscription expiry timestamp, or `null` for free tier. */
  subscriptionExpiresAt: string | null;
  /** ISO 8601 account creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
}

/** Per-vault storage breakdown entry. */
export interface VaultStorage {
  /** Vault identifier. */
  vaultId: string;
  /** Vault display name. */
  name: string;
  /** Total bytes used by documents in this vault. */
  bytes: number;
  /** Number of documents in this vault. */
  documentCount: number;
}

/** Storage usage statistics for the authenticated user. */
export interface StorageUsage {
  /** Total bytes used across all vaults. */
  totalBytes: number;
  /** Maximum bytes allowed by the user's plan. */
  limitBytes: number;
  /** Per-vault storage breakdown. */
  vaults: VaultStorage[];
  /** Total number of vaults. */
  vaultCount: number;
  /** Maximum number of vaults allowed by the user's plan. */
  vaultLimit: number;
  /** Current subscription tier. */
  tier: string;
}

/**
 * Resource for retrieving user profile and storage information.
 *
 * @example
 * ```typescript
 * const user = await client.user.me();
 * console.log(user.email, user.subscriptionTier);
 *
 * const storage = await client.user.getStorage();
 * console.log(`${storage.totalBytes}/${storage.limitBytes} bytes used`);
 * ```
 */
export class UserResource {
  constructor(private http: KyInstance) {}

  /**
   * Retrieves the current authenticated user's profile.
   *
   * @returns User profile object
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const user = await client.user.me();
   * console.log(user.email, user.subscriptionTier);
   * ```
   */
  async me(): Promise<User> {
    try {
      const data = await this.http.get('users/me').json<{ user: User }>();
      return data.user;
    } catch (error) {
      throw await handleError(error, 'User', '');
    }
  }

  /**
   * Retrieves storage usage breakdown for the current user.
   *
   * @returns Storage usage statistics including per-vault breakdown
   * @throws {AuthenticationError} If not authenticated
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const storage = await client.user.getStorage();
   * console.log(`Using ${storage.totalBytes}/${storage.limitBytes} bytes`);
   * storage.vaults.forEach(v => console.log(`${v.name}: ${v.bytes} bytes`));
   * ```
   */
  async getStorage(): Promise<StorageUsage> {
    try {
      return await this.http.get('users/me/storage').json<StorageUsage>();
    } catch (error) {
      throw await handleError(error, 'Storage', '');
    }
  }
}
