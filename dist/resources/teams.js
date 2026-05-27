import { handleError } from '../handle-error.js';
import { ensureArray } from '../utils/ensure-array.js';
/**
 * Resource for managing teams, members, invitations, and team vaults.
 *
 * Teams allow users to collaborate on shared vaults with role-based access
 * control. Team members can be owners, admins, or regular members.
 *
 * @example
 * ```typescript
 * const teams = await client.teams.list();
 * const team = await client.teams.create({ name: 'Engineering' });
 * const members = await client.teams.listMembers(team.id);
 * ```
 */
export class TeamsResource {
    http;
    constructor(http) {
        this.http = http;
    }
    // ── Team CRUD ──────────────────────────────────────────────────────
    /**
     * Lists all teams the authenticated user belongs to.
     *
     * @returns Array of team objects
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const teams = await client.teams.list();
     * for (const team of teams) {
     *   console.log(team.name);
     * }
     * ```
     */
    async list() {
        try {
            const data = await this.http.get('teams').json();
            return data.teams;
        }
        catch (error) {
            throw await handleError(error, 'Teams', '');
        }
    }
    /**
     * Retrieves a single team by ID.
     *
     * @param teamId - The unique identifier of the team
     * @returns The team object
     * @throws {NotFoundError} If no team exists with the given ID
     * @throws {AuthorizationError} If the user is not a member of the team
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const team = await client.teams.get('team-uuid');
     * console.log(team.name, team.description);
     * ```
     */
    async get(teamId) {
        try {
            return await this.http.get(`teams/${teamId}`).json();
        }
        catch (error) {
            throw await handleError(error, 'Team', teamId);
        }
    }
    /**
     * Creates a new team. The authenticated user becomes the team owner.
     *
     * @param params - Team creation parameters
     * @param params.name - Display name for the team (required)
     * @param params.description - Optional description of the team's purpose
     * @returns The newly created team object
     * @throws {ValidationError} If the name is empty or invalid
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const team = await client.teams.create({
     *   name: 'Engineering',
     *   description: 'Backend and frontend engineering team',
     * });
     * console.log(team.id);
     * ```
     */
    async create(params) {
        try {
            return await this.http.post('teams', { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'Team', params.name);
        }
    }
    /**
     * Updates an existing team's metadata. Requires admin or owner role.
     *
     * Only the provided fields are modified; omitted fields remain unchanged.
     *
     * @param teamId - The unique identifier of the team to update
     * @param params - Fields to update
     * @param params.name - New display name for the team
     * @param params.description - New description, or `null` to clear
     * @returns The updated team object
     * @throws {NotFoundError} If no team exists with the given ID
     * @throws {AuthorizationError} If the user lacks admin/owner role
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const updated = await client.teams.update('team-uuid', {
     *   name: 'Platform Engineering',
     * });
     * ```
     */
    async update(teamId, params) {
        try {
            return await this.http.patch(`teams/${teamId}`, { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'Team', teamId);
        }
    }
    /**
     * Permanently deletes a team. Only the team owner can delete a team.
     *
     * This removes all memberships, invitations, and team vault associations.
     *
     * @param teamId - The unique identifier of the team to delete
     * @throws {NotFoundError} If no team exists with the given ID
     * @throws {AuthorizationError} If the user is not the team owner
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.teams.delete('team-uuid');
     * ```
     */
    async delete(teamId) {
        try {
            await this.http.delete(`teams/${teamId}`);
        }
        catch (error) {
            throw await handleError(error, 'Team', teamId);
        }
    }
    // ── Members ────────────────────────────────────────────────────────
    /**
     * Lists all members of a team.
     *
     * @param teamId - The unique identifier of the team
     * @returns Array of team member objects with user details
     * @throws {NotFoundError} If no team exists with the given ID
     * @throws {AuthorizationError} If the user is not a member of the team
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const members = await client.teams.listMembers('team-uuid');
     * for (const member of members) {
     *   console.log(member.user.email, member.role);
     * }
     * ```
     */
    async listMembers(teamId) {
        try {
            const data = await this.http.get(`teams/${teamId}/members`).json();
            return ensureArray(data.members);
        }
        catch (error) {
            throw await handleError(error, 'Team', teamId);
        }
    }
    /**
     * Updates a team member's role. Requires admin or owner role.
     *
     * Cannot change the owner's role. Admins cannot promote others to owner.
     *
     * @param teamId - The unique identifier of the team
     * @param userId - The user ID of the member to update
     * @param role - The new role to assign (`'admin'` or `'member'`)
     * @returns The updated team member object
     * @throws {NotFoundError} If the team or member is not found
     * @throws {AuthorizationError} If the user lacks permission to change roles
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const member = await client.teams.updateMemberRole('team-uuid', 'user-uuid', 'admin');
     * console.log(member.role); // 'admin'
     * ```
     */
    async updateMemberRole(teamId, userId, role) {
        try {
            return await this.http.patch(`teams/${teamId}/members/${userId}`, { json: { role } }).json();
        }
        catch (error) {
            throw await handleError(error, 'Team member', userId);
        }
    }
    /**
     * Removes a member from a team. Requires admin or owner role.
     *
     * The team owner cannot be removed.
     *
     * @param teamId - The unique identifier of the team
     * @param userId - The user ID of the member to remove
     * @throws {NotFoundError} If the team or member is not found
     * @throws {AuthorizationError} If the user lacks permission or is trying to remove the owner
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.teams.removeMember('team-uuid', 'user-uuid');
     * ```
     */
    async removeMember(teamId, userId) {
        try {
            await this.http.delete(`teams/${teamId}/members/${userId}`);
        }
        catch (error) {
            throw await handleError(error, 'Team member', userId);
        }
    }
    /**
     * Leaves a team. The authenticated user removes themselves from the team.
     *
     * The team owner cannot leave; they must delete the team or transfer ownership first.
     *
     * @param teamId - The unique identifier of the team to leave
     * @throws {NotFoundError} If no team exists with the given ID
     * @throws {AuthorizationError} If the user is the team owner
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.teams.leave('team-uuid');
     * ```
     */
    async leave(teamId) {
        try {
            await this.http.post(`teams/${teamId}/members/leave`);
        }
        catch (error) {
            throw await handleError(error, 'Team', teamId);
        }
    }
    // ── Invitations ────────────────────────────────────────────────────
    /**
     * Invites a user to join a team by email. Requires admin or owner role.
     *
     * @param teamId - The unique identifier of the team
     * @param email - Email address of the user to invite
     * @param role - Role to assign upon acceptance (`'admin'`, `'editor'`, or `'viewer'`)
     * @returns The created invitation object
     * @throws {ValidationError} If the email is invalid or the user is already a member
     * @throws {AuthorizationError} If the user lacks admin/owner role
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const invitation = await client.teams.inviteMember(
     *   'team-uuid',
     *   'colleague@example.com',
     *   'editor',
     * );
     * console.log(invitation.expiresAt);
     * ```
     */
    async inviteMember(teamId, email, role) {
        try {
            return await this.http.post(`teams/${teamId}/invitations`, { json: { email, role } }).json();
        }
        catch (error) {
            throw await handleError(error, 'Team invitation', email);
        }
    }
    /**
     * Lists all pending invitations for a team.
     *
     * @param teamId - The unique identifier of the team
     * @returns Array of pending invitation objects
     * @throws {NotFoundError} If no team exists with the given ID
     * @throws {AuthorizationError} If the user is not a member of the team
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const invitations = await client.teams.listInvitations('team-uuid');
     * for (const inv of invitations) {
     *   console.log(inv.email, inv.role, inv.expiresAt);
     * }
     * ```
     */
    async listInvitations(teamId) {
        try {
            const data = await this.http.get(`teams/${teamId}/invitations`).json();
            return data.invitations;
        }
        catch (error) {
            throw await handleError(error, 'Team', teamId);
        }
    }
    /**
     * Revokes a pending invitation. Requires admin or owner role.
     *
     * @param teamId - The unique identifier of the team
     * @param invitationId - The unique identifier of the invitation to revoke
     * @throws {NotFoundError} If the team or invitation is not found
     * @throws {AuthorizationError} If the user lacks admin/owner role
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * await client.teams.revokeInvitation('team-uuid', 'invitation-uuid');
     * ```
     */
    async revokeInvitation(teamId, invitationId) {
        try {
            await this.http.delete(`teams/${teamId}/invitations/${invitationId}`);
        }
        catch (error) {
            throw await handleError(error, 'Team invitation', invitationId);
        }
    }
    // ── Team Vaults ────────────────────────────────────────────────────
    /**
     * Creates a new vault under a team. Requires editor role or above.
     *
     * @param teamId - The unique identifier of the team
     * @param params - Vault creation parameters
     * @param params.name - Display name for the vault (required)
     * @param params.description - Optional description of the vault's purpose
     * @returns The newly created vault object
     * @throws {ValidationError} If the name is empty or the slug conflicts
     * @throws {AuthorizationError} If the user lacks the required team role
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const vault = await client.teams.createVault('team-uuid', {
     *   name: 'Shared Docs',
     *   description: 'Team documentation',
     * });
     * ```
     */
    async createVault(teamId, params) {
        try {
            return await this.http.post(`teams/${teamId}/vaults`, { json: params }).json();
        }
        catch (error) {
            throw await handleError(error, 'Team vault', params.name);
        }
    }
    /**
     * Lists all vaults belonging to a team.
     *
     * @param teamId - The unique identifier of the team
     * @returns Array of vault objects
     * @throws {NotFoundError} If no team exists with the given ID
     * @throws {AuthorizationError} If the user is not a member of the team
     * @throws {AuthenticationError} If the request is not authenticated
     * @throws {NetworkError} If the request fails due to network issues
     *
     * @example
     * ```typescript
     * const vaults = await client.teams.listVaults('team-uuid');
     * for (const vault of vaults) {
     *   console.log(vault.name);
     * }
     * ```
     */
    async listVaults(teamId) {
        try {
            const data = await this.http.get(`teams/${teamId}/vaults`).json();
            return data.vaults;
        }
        catch (error) {
            throw await handleError(error, 'Team', teamId);
        }
    }
    async getCalendar(teamId, params) {
        try {
            const searchParams = { start: params.start, end: params.end };
            if (params.types)
                searchParams.types = params.types;
            return await this.http.get(`teams/${teamId}/calendar`, { searchParams }).json();
        }
        catch (error) {
            throw await handleError(error, 'Team Calendar', teamId);
        }
    }
    async getCalendarActivity(teamId, params) {
        try {
            const searchParams = { start: params.start, end: params.end };
            return await this.http.get(`teams/${teamId}/calendar/activity`, { searchParams }).json();
        }
        catch (error) {
            throw await handleError(error, 'Team Calendar Activity', teamId);
        }
    }
    async getCalendarEvents(teamId, params) {
        try {
            const searchParams = {};
            if (params?.start)
                searchParams.start = params.start;
            if (params?.end)
                searchParams.end = params.end;
            const data = await this.http.get(`teams/${teamId}/calendar/events`, { searchParams }).json();
            return data.events;
        }
        catch (error) {
            throw await handleError(error, 'Team Calendar Events', teamId);
        }
    }
    async getUpcoming(teamId) {
        try {
            return await this.http.get(`teams/${teamId}/calendar/upcoming`).json();
        }
        catch (error) {
            throw await handleError(error, 'Team Upcoming', teamId);
        }
    }
    async getDue(teamId, params) {
        try {
            const searchParams = {};
            if (params?.status)
                searchParams.status = params.status;
            const data = await this.http.get(`teams/${teamId}/calendar/due`, { searchParams }).json();
            return data.dueDocs ?? [];
        }
        catch (error) {
            throw await handleError(error, 'Team Due Documents', teamId);
        }
    }
    async getAgenda(teamId, params) {
        try {
            const searchParams = {};
            if (params?.range)
                searchParams.range = params.range;
            if (params?.groupBy)
                searchParams.groupBy = params.groupBy;
            return await this.http.get(`teams/${teamId}/calendar/agenda`, { searchParams }).json();
        }
        catch (error) {
            throw await handleError(error, 'Team Agenda', teamId);
        }
    }
    async getICalFeed(teamId) {
        try {
            return await this.http.get(`teams/${teamId}/calendar/feed.ics`).text();
        }
        catch (error) {
            throw await handleError(error, 'Team iCal Feed', teamId);
        }
    }
}
//# sourceMappingURL=teams.js.map