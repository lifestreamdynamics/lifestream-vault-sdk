import type { KyInstance } from 'ky';
import { handleError } from '../handle-error.js';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** Assignment strategy for distributing bookings among group members. */
export type AssignmentMode = 'round_robin' | 'least_busy' | 'attendee_choice';

export interface TeamBookingGroup {
  id: string;
  teamId: string;
  name: string;
  assignmentMode: AssignmentMode;
  roundRobinIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamBookingGroupMember {
  id: string;
  groupId: string;
  userId: string;
  weight: number;
  isActive: boolean;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
}

export interface CreateBookingGroupInput {
  name: string;
  assignmentMode?: AssignmentMode;
}

export interface UpdateBookingGroupInput {
  name?: string;
  assignmentMode?: AssignmentMode;
  isActive?: boolean;
}

export interface AddGroupMemberInput {
  userId: string;
  weight?: number;
}

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
  constructor(private http: KyInstance) {}

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
  async listGroups(teamId: string): Promise<TeamBookingGroup[]> {
    try {
      const data = await this.http
        .get(`teams/${teamId}/booking-groups`)
        .json<{ groups: TeamBookingGroup[] }>();
      return data.groups;
    } catch (error) {
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
  async createGroup(teamId: string, data: CreateBookingGroupInput): Promise<TeamBookingGroup> {
    try {
      return await this.http
        .post(`teams/${teamId}/booking-groups`, { json: data })
        .json<TeamBookingGroup>();
    } catch (error) {
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
  async updateGroup(
    teamId: string,
    groupId: string,
    data: UpdateBookingGroupInput,
  ): Promise<TeamBookingGroup> {
    try {
      return await this.http
        .put(`teams/${teamId}/booking-groups/${groupId}`, { json: data })
        .json<TeamBookingGroup>();
    } catch (error) {
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
  async deleteGroup(teamId: string, groupId: string): Promise<void> {
    try {
      await this.http.delete(`teams/${teamId}/booking-groups/${groupId}`);
    } catch (error) {
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
  async listMembers(teamId: string, groupId: string): Promise<TeamBookingGroupMember[]> {
    try {
      const data = await this.http
        .get(`teams/${teamId}/booking-groups/${groupId}/members`)
        .json<{ members: TeamBookingGroupMember[] }>();
      return data.members;
    } catch (error) {
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
  async addMember(
    teamId: string,
    groupId: string,
    data: AddGroupMemberInput,
  ): Promise<TeamBookingGroupMember> {
    try {
      return await this.http
        .post(`teams/${teamId}/booking-groups/${groupId}/members`, { json: data })
        .json<TeamBookingGroupMember>();
    } catch (error) {
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
  async removeMember(teamId: string, groupId: string, userId: string): Promise<void> {
    try {
      await this.http.delete(`teams/${teamId}/booking-groups/${groupId}/members/${userId}`);
    } catch (error) {
      throw await handleError(error, 'Remove Group Member', userId);
    }
  }
}
