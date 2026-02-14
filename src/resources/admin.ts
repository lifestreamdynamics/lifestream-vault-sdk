import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

/** System-wide statistics returned by the admin stats endpoint. */
export interface SystemStats {
  /** Total number of registered users. */
  totalUsers: number;
  /** Total number of vaults across all users. */
  totalVaults: number;
  /** Total number of documents across all vaults. */
  totalDocuments: number;
  /** Total storage used in bytes. */
  totalStorageBytes: number;
  /** Number of active users (logged in within 30 days). */
  activeUsers: number;
}

/** A single data point in a timeseries response. */
export interface TimeseriesDataPoint {
  /** ISO 8601 date string (e.g., `2024-01-15`). */
  date: string;
  /** Numeric value for the metric at this date. */
  value: number;
}

/** Response from the timeseries endpoint. */
export interface TimeseriesResponse {
  /** The metric queried. */
  metric: string;
  /** The time period queried. */
  period: string;
  /** Array of data points. */
  data: TimeseriesDataPoint[];
}

/** A user record as returned by admin user listing. */
export interface AdminUser {
  /** Unique user identifier. */
  id: string;
  /** User email address. */
  email: string;
  /** Display name, or `null`. */
  name: string | null;
  /** User role (`user` or `admin`). */
  role: string;
  /** Whether the user account is active. */
  isActive: boolean;
  /** Current subscription tier. */
  subscriptionTier: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/** Paginated response for admin user listing. */
export interface AdminUserListResponse {
  /** Array of user records. */
  users: AdminUser[];
  /** Total number of users matching the filters. */
  total: number;
  /** Current page number. */
  page: number;
  /** Number of users per page. */
  limit: number;
}

/** Detailed user information returned by the admin user detail endpoint. */
export interface AdminUserDetail extends AdminUser {
  /** ISO 8601 last-updated timestamp. */
  updatedAt: string;
  /** Number of vaults owned by the user. */
  vaultCount: number;
  /** Number of documents owned by the user. */
  documentCount: number;
  /** Total storage used in bytes. */
  storageBytes: number;
}

/** Parameters for filtering the admin user list. */
export interface AdminUserListParams {
  /** Page number (1-based). */
  page?: number;
  /** Number of results per page (max 100). */
  limit?: number;
  /** Search query (matches email or name). */
  search?: string;
  /** Filter by subscription tier. */
  tier?: 'free' | 'pro' | 'business';
  /** Filter by user role. */
  role?: 'user' | 'admin';
}

/** Parameters for updating a user via admin endpoint. */
export interface AdminUpdateUserParams {
  /** New role for the user. */
  role?: 'user' | 'admin';
  /** Whether the user account should be active. */
  isActive?: boolean;
  /** New subscription tier. */
  subscriptionTier?: 'free' | 'pro' | 'business';
}

/** A recent activity entry. */
export interface ActivityEntry {
  /** Event type (e.g., `create`, `update`, `delete`). */
  type: string;
  /** ID of the user who performed the action. */
  userId: string;
  /** ID of the vault where the event occurred. */
  vaultId: string;
  /** Document path involved, or `null`. */
  path: string | null;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

/** Subscription summary with per-tier counts. */
export interface SubscriptionSummary {
  /** Number of users on the free tier. */
  free: number;
  /** Number of users on the pro tier. */
  pro: number;
  /** Number of users on the business tier. */
  business: number;
  /** Total number of users with subscriptions. */
  total: number;
}

/** System health check result. */
export interface SystemHealth {
  /** Overall system status. */
  status: string;
  /** Database connection status. */
  database: string;
  /** Redis connection status. */
  redis: string;
  /** Server uptime in seconds. */
  uptime: number;
}

/**
 * Resource for admin operations including system stats, user management,
 * activity monitoring, subscription summaries, and system health.
 *
 * All methods require admin-level authentication.
 *
 * @example
 * ```typescript
 * const stats = await client.admin.getStats();
 * console.log(`Total users: ${stats.totalUsers}`);
 *
 * const users = await client.admin.listUsers({ tier: 'pro' });
 * users.users.forEach(u => console.log(u.email));
 * ```
 */
export class AdminResource {
  constructor(private http: KyInstance) {}

  /**
   * Retrieves system-wide statistics.
   *
   * @returns System statistics object
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user is not an admin
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const stats = await client.admin.getStats();
   * console.log(`Users: ${stats.totalUsers}, Vaults: ${stats.totalVaults}`);
   * ```
   */
  async getStats(): Promise<SystemStats> {
    try {
      return await this.http.get('admin/stats').json<SystemStats>();
    } catch (error) {
      throw await handleError(error, 'Admin stats', '');
    }
  }

  /**
   * Retrieves timeseries data for a given metric and period.
   *
   * @param metric - The metric to query (`signups`, `documents`, or `storage`)
   * @param period - The time period (`7d`, `30d`, or `90d`)
   * @returns Timeseries response with data points
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user is not an admin
   * @throws {ValidationError} If the metric or period is invalid
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const ts = await client.admin.getTimeseries('signups', '30d');
   * ts.data.forEach(d => console.log(`${d.date}: ${d.value}`));
   * ```
   */
  async getTimeseries(metric: string, period: string): Promise<TimeseriesResponse> {
    try {
      return await this.http.get('admin/stats/timeseries', {
        searchParams: { metric, period },
      }).json<TimeseriesResponse>();
    } catch (error) {
      throw await handleError(error, 'Timeseries', metric);
    }
  }

  /**
   * Lists users with optional filtering and pagination.
   *
   * @param params - Optional filter and pagination parameters
   * @returns Paginated list of users
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user is not an admin
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const result = await client.admin.listUsers({ search: 'alice', tier: 'pro' });
   * console.log(`Found ${result.total} users`);
   * result.users.forEach(u => console.log(u.email));
   * ```
   */
  async listUsers(params?: AdminUserListParams): Promise<AdminUserListResponse> {
    try {
      const searchParams: Record<string, string | number> = {};
      if (params?.page !== undefined) searchParams.page = params.page;
      if (params?.limit !== undefined) searchParams.limit = params.limit;
      if (params?.search) searchParams.search = params.search;
      if (params?.tier) searchParams.tier = params.tier;
      if (params?.role) searchParams.role = params.role;

      return await this.http.get('admin/users', {
        searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
      }).json<AdminUserListResponse>();
    } catch (error) {
      throw await handleError(error, 'Users', '');
    }
  }

  /**
   * Retrieves detailed information about a specific user.
   *
   * @param userId - The unique identifier of the user
   * @returns Detailed user information
   * @throws {NotFoundError} If no user exists with the given ID
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user is not an admin
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const user = await client.admin.getUser('user-uuid');
   * console.log(`${user.email}: ${user.vaultCount} vaults, ${user.documentCount} docs`);
   * ```
   */
  async getUser(userId: string): Promise<AdminUserDetail> {
    try {
      return await this.http.get(`admin/users/${userId}`).json<AdminUserDetail>();
    } catch (error) {
      throw await handleError(error, 'User', userId);
    }
  }

  /**
   * Updates a user's role, active status, or subscription tier.
   *
   * @param userId - The unique identifier of the user to update
   * @param params - Fields to update
   * @returns The updated user record
   * @throws {NotFoundError} If no user exists with the given ID
   * @throws {ValidationError} If the update parameters are invalid
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user is not an admin
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const updated = await client.admin.updateUser('user-uuid', {
   *   role: 'admin',
   *   isActive: true,
   * });
   * ```
   */
  async updateUser(userId: string, params: AdminUpdateUserParams): Promise<AdminUser> {
    try {
      return await this.http.patch(`admin/users/${userId}`, {
        json: params,
      }).json<AdminUser>();
    } catch (error) {
      throw await handleError(error, 'User', userId);
    }
  }

  /**
   * Retrieves recent activity across all vaults.
   *
   * @param limit - Maximum number of entries to return (default: 20, max: 100)
   * @returns Array of recent activity entries
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user is not an admin
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const activity = await client.admin.getActivity(10);
   * activity.forEach(a => console.log(`${a.type} by ${a.userId} at ${a.createdAt}`));
   * ```
   */
  async getActivity(limit?: number): Promise<ActivityEntry[]> {
    try {
      const searchParams: Record<string, number> = {};
      if (limit !== undefined) searchParams.limit = limit;

      const data = await this.http.get('admin/activity', {
        searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
      }).json<ActivityEntry[]>();
      return data;
    } catch (error) {
      throw await handleError(error, 'Activity', '');
    }
  }

  /**
   * Retrieves subscription summary with per-tier user counts.
   *
   * @returns Subscription summary object
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user is not an admin
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const summary = await client.admin.getSubscriptionSummary();
   * console.log(`Free: ${summary.free}, Pro: ${summary.pro}, Business: ${summary.business}`);
   * ```
   */
  async getSubscriptionSummary(): Promise<SubscriptionSummary> {
    try {
      return await this.http.get('admin/subscriptions').json<SubscriptionSummary>();
    } catch (error) {
      throw await handleError(error, 'Subscriptions', '');
    }
  }

  /**
   * Checks the system health status including database and Redis connectivity.
   *
   * @returns System health check result
   * @throws {AuthenticationError} If not authenticated
   * @throws {AuthorizationError} If the user is not an admin
   * @throws {NetworkError} If the request fails due to network issues
   *
   * @example
   * ```typescript
   * const health = await client.admin.getHealth();
   * console.log(`Status: ${health.status}, DB: ${health.database}, Redis: ${health.redis}`);
   * ```
   */
  async getHealth(): Promise<SystemHealth> {
    try {
      return await this.http.get('admin/health').json<SystemHealth>();
    } catch (error) {
      throw await handleError(error, 'Health', '');
    }
  }
}
