import { handleError } from '../handle-error.js';
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
    http;
    constructor(http) {
        this.http = http;
    }
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
    async getStats() {
        try {
            return await this.http.get('admin/stats').json();
        }
        catch (error) {
            throw await handleError(error, 'AdminStats', '');
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
    async getTimeseries(metric, period) {
        try {
            return await this.http.get('admin/stats/timeseries', {
                searchParams: { metric, period },
            }).json();
        }
        catch (error) {
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
    async listUsers(params) {
        try {
            const searchParams = {};
            if (params?.page !== undefined)
                searchParams.page = params.page;
            if (params?.limit !== undefined)
                searchParams.limit = params.limit;
            if (params?.search)
                searchParams.search = params.search;
            if (params?.tier)
                searchParams.tier = params.tier;
            if (params?.role)
                searchParams.role = params.role;
            return await this.http.get('admin/users', {
                searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
            }).json();
        }
        catch (error) {
            throw await handleError(error, 'AdminUsers', '');
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
    async getUser(userId) {
        try {
            return await this.http.get(`admin/users/${userId}`).json();
        }
        catch (error) {
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
    async updateUser(userId, params) {
        try {
            return await this.http.patch(`admin/users/${userId}`, {
                json: params,
            }).json();
        }
        catch (error) {
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
    async getActivity(limit) {
        try {
            const searchParams = {};
            if (limit !== undefined)
                searchParams.limit = limit;
            const data = await this.http.get('admin/activity', {
                searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
            }).json();
            return data;
        }
        catch (error) {
            throw await handleError(error, 'AdminActivity', '');
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
    async getSubscriptionSummary() {
        try {
            return await this.http.get('admin/subscriptions').json();
        }
        catch (error) {
            throw await handleError(error, 'AdminSubscriptions', '');
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
    async getHealth() {
        try {
            return await this.http.get('admin/health').json();
        }
        catch (error) {
            throw await handleError(error, 'AdminHealth', '');
        }
    }
    async getBackupStatus() {
        try {
            return await this.http.get('admin/backups/status').json();
        }
        catch (error) {
            throw await handleError(error, 'AdminBackupStatus', '');
        }
    }
}
//# sourceMappingURL=admin.js.map