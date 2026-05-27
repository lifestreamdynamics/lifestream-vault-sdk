import { handleError } from '../handle-error.js';
/**
 * Resource for managing team booking groups (Business tier).
 *
 * Team booking groups allow round-robin or least-busy distribution of
 * bookings among a group of team members, enabling team scheduling workflows.
 *
 * @example
 * ```typescript
 * // List all booking groups for a team
 * const groups = await client.teamBookingGroups.listGroups('team-id');
 *
 * // Add a member to a group
 * await client.teamBookingGroups.addMember('team-id', 'group-id', {
 *   userId: 'user-id',
 *   weight: 2,
 * });
 * ```
 */
export class TeamBookingGroupsResource {
    http;
    constructor(http) {
        this.http = http;
    }
    /**
     * List all booking groups for a team.
     *
     * @param teamId - Team ID
     * @returns Array of booking groups
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user lacks the calendarBookingAdvanced feature
     * @throws {NotFoundError} If the team does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    async listGroups(teamId) {
        try {
            const data = await this.http
                .get(`teams/${teamId}/booking-groups`)
                .json();
            return data.groups;
        }
        catch (error) {
            throw await handleError(error, 'Booking Groups', teamId);
        }
    }
    /**
     * Create a new booking group for a team.
     *
     * @param teamId - Team ID
     * @param data - Group configuration
     * @returns The created booking group
     * @throws {ValidationError} If the data is invalid
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user lacks the calendarBookingAdvanced feature or admin role
     * @throws {NotFoundError} If the team does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    async createGroup(teamId, data) {
        try {
            return await this.http
                .post(`teams/${teamId}/booking-groups`, { json: data })
                .json();
        }
        catch (error) {
            throw await handleError(error, 'Create Booking Group', data.name);
        }
    }
    /**
     * Update an existing booking group.
     *
     * @param teamId - Team ID
     * @param groupId - Group ID
     * @param data - Fields to update
     * @returns The updated booking group
     * @throws {ValidationError} If the data is invalid
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user lacks the calendarBookingAdvanced feature or admin role
     * @throws {NotFoundError} If the team or group does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    async updateGroup(teamId, groupId, data) {
        try {
            return await this.http
                .put(`teams/${teamId}/booking-groups/${groupId}`, { json: data })
                .json();
        }
        catch (error) {
            throw await handleError(error, 'Update Booking Group', groupId);
        }
    }
    /**
     * Delete a booking group.
     *
     * @param teamId - Team ID
     * @param groupId - Group ID
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user lacks the calendarBookingAdvanced feature or admin role
     * @throws {NotFoundError} If the team or group does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    async deleteGroup(teamId, groupId) {
        try {
            await this.http.delete(`teams/${teamId}/booking-groups/${groupId}`);
        }
        catch (error) {
            throw await handleError(error, 'Delete Booking Group', groupId);
        }
    }
    /**
     * List active members of a booking group.
     *
     * @param teamId - Team ID
     * @param groupId - Group ID
     * @returns Array of booking group members with user info
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user lacks the calendarBookingAdvanced feature
     * @throws {NotFoundError} If the team or group does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    async listMembers(teamId, groupId) {
        try {
            const data = await this.http
                .get(`teams/${teamId}/booking-groups/${groupId}/members`)
                .json();
            return data.members;
        }
        catch (error) {
            throw await handleError(error, 'Group Members', groupId);
        }
    }
    /**
     * Add a member to a booking group.
     *
     * @param teamId - Team ID
     * @param groupId - Group ID
     * @param data - Member data (userId and optional weight)
     * @returns The created group member record
     * @throws {ValidationError} If the userId is not a team member
     * @throws {ConflictError} If the user is already an active member
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user lacks the calendarBookingAdvanced feature or admin role
     * @throws {NotFoundError} If the team, group, or user does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    async addMember(teamId, groupId, data) {
        try {
            return await this.http
                .post(`teams/${teamId}/booking-groups/${groupId}/members`, { json: data })
                .json();
        }
        catch (error) {
            throw await handleError(error, 'Add Group Member', groupId);
        }
    }
    /**
     * Remove a member from a booking group.
     *
     * @param teamId - Team ID
     * @param groupId - Group ID
     * @param userId - User ID to remove
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {AuthorizationError} If the user lacks the calendarBookingAdvanced feature or admin role
     * @throws {NotFoundError} If the team, group, or member does not exist
     * @throws {NetworkError} If the request fails due to network issues
     */
    async removeMember(teamId, groupId, userId) {
        try {
            await this.http.delete(`teams/${teamId}/booking-groups/${groupId}/members/${userId}`);
        }
        catch (error) {
            throw await handleError(error, 'Remove Group Member', userId);
        }
    }
}
//# sourceMappingURL=team-booking-groups.js.map