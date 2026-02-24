import { describe, it, expect, beforeEach } from 'vitest';
import { TeamBookingGroupsResource } from './team-booking-groups.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthorizationError, ValidationError, ConflictError } from '../errors.js';

describe('TeamBookingGroupsResource', () => {
  let resource: TeamBookingGroupsResource;
  let kyMock: KyMock;

  const mockGroup = {
    id: 'grp-1',
    teamId: 'team-1',
    name: 'Support Agents',
    assignmentMode: 'round_robin' as const,
    roundRobinIndex: 0,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockMember = {
    id: 'mem-1',
    groupId: 'grp-1',
    userId: 'user-1',
    weight: 1,
    isActive: true,
    user: { id: 'user-1', displayName: 'Alice', email: 'alice@example.com' },
  };

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new TeamBookingGroupsResource(kyMock as any);
  });

  // ── listGroups ────────────────────────────────────────────────────────────

  describe('listGroups', () => {
    it('should return groups array for a team', async () => {
      mockJsonResponse(kyMock.get, { groups: [mockGroup] });

      const result = await resource.listGroups('team-1');

      expect(kyMock.get).toHaveBeenCalledWith('teams/team-1/booking-groups');
      expect(result).toEqual([mockGroup]);
    });

    it('should return empty array when no groups exist', async () => {
      mockJsonResponse(kyMock.get, { groups: [] });

      const result = await resource.listGroups('team-1');

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listGroups('team-1')).rejects.toBeInstanceOf(NetworkError);
    });

    it('should throw NotFoundError when team does not exist', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Team not found' });

      await expect(resource.listGroups('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError when user lacks required feature', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Forbidden' });

      await expect(resource.listGroups('team-1')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  // ── createGroup ───────────────────────────────────────────────────────────

  describe('createGroup', () => {
    it('should create a group and return it', async () => {
      mockJsonResponse(kyMock.post, mockGroup);

      const input = { name: 'Support Agents', assignmentMode: 'round_robin' as const };
      const result = await resource.createGroup('team-1', input);

      expect(kyMock.post).toHaveBeenCalledWith('teams/team-1/booking-groups', { json: input });
      expect(result).toEqual(mockGroup);
    });

    it('should create group with only required name field', async () => {
      mockJsonResponse(kyMock.post, mockGroup);

      await resource.createGroup('team-1', { name: 'Support Agents' });

      expect(kyMock.post).toHaveBeenCalledWith('teams/team-1/booking-groups', {
        json: { name: 'Support Agents' },
      });
    });

    it('should throw ValidationError on invalid input', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Invalid input' });

      await expect(resource.createGroup('team-1', { name: '' })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.createGroup('team-1', { name: 'Group' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── updateGroup ───────────────────────────────────────────────────────────

  describe('updateGroup', () => {
    it('should update a group and return updated record', async () => {
      const updatedGroup = { ...mockGroup, name: 'Renamed Group', isActive: false };
      mockJsonResponse(kyMock.put, updatedGroup);

      const input = { name: 'Renamed Group', isActive: false };
      const result = await resource.updateGroup('team-1', 'grp-1', input);

      expect(kyMock.put).toHaveBeenCalledWith('teams/team-1/booking-groups/grp-1', { json: input });
      expect(result).toEqual(updatedGroup);
    });

    it('should throw NotFoundError when group does not exist', async () => {
      mockHTTPError(kyMock.put, 404, { message: 'Group not found' });

      await expect(resource.updateGroup('team-1', 'nonexistent', { name: 'X' })).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.put);

      await expect(resource.updateGroup('team-1', 'grp-1', {})).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── deleteGroup ───────────────────────────────────────────────────────────

  describe('deleteGroup', () => {
    it('should call correct endpoint', async () => {
      await resource.deleteGroup('team-1', 'grp-1');

      expect(kyMock.delete).toHaveBeenCalledWith('teams/team-1/booking-groups/grp-1');
    });

    it('should throw NotFoundError when group does not exist', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Group not found' });

      await expect(resource.deleteGroup('team-1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.deleteGroup('team-1', 'grp-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── listMembers ───────────────────────────────────────────────────────────

  describe('listMembers', () => {
    it('should return members array for a group', async () => {
      mockJsonResponse(kyMock.get, { members: [mockMember] });

      const result = await resource.listMembers('team-1', 'grp-1');

      expect(kyMock.get).toHaveBeenCalledWith('teams/team-1/booking-groups/grp-1/members');
      expect(result).toEqual([mockMember]);
    });

    it('should return empty array when no members exist', async () => {
      mockJsonResponse(kyMock.get, { members: [] });

      const result = await resource.listMembers('team-1', 'grp-1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError when group does not exist', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Group not found' });

      await expect(resource.listMembers('team-1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listMembers('team-1', 'grp-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── addMember ─────────────────────────────────────────────────────────────

  describe('addMember', () => {
    it('should add a member and return the member record', async () => {
      mockJsonResponse(kyMock.post, mockMember);

      const input = { userId: 'user-1', weight: 1 };
      const result = await resource.addMember('team-1', 'grp-1', input);

      expect(kyMock.post).toHaveBeenCalledWith('teams/team-1/booking-groups/grp-1/members', { json: input });
      expect(result).toEqual(mockMember);
    });

    it('should add a member with only userId (weight optional)', async () => {
      mockJsonResponse(kyMock.post, mockMember);

      await resource.addMember('team-1', 'grp-1', { userId: 'user-1' });

      expect(kyMock.post).toHaveBeenCalledWith('teams/team-1/booking-groups/grp-1/members', {
        json: { userId: 'user-1' },
      });
    });

    it('should throw ConflictError when user is already a member', async () => {
      mockHTTPError(kyMock.post, 409, { message: 'User is already a member' });

      await expect(resource.addMember('team-1', 'grp-1', { userId: 'user-1' })).rejects.toBeInstanceOf(ConflictError);
    });

    it('should throw ValidationError when userId is not a team member', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'User is not a team member' });

      await expect(resource.addMember('team-1', 'grp-1', { userId: 'outsider' })).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.addMember('team-1', 'grp-1', { userId: 'user-1' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── removeMember ──────────────────────────────────────────────────────────

  describe('removeMember', () => {
    it('should call correct endpoint with userId', async () => {
      await resource.removeMember('team-1', 'grp-1', 'user-1');

      expect(kyMock.delete).toHaveBeenCalledWith('teams/team-1/booking-groups/grp-1/members/user-1');
    });

    it('should throw NotFoundError when member does not exist', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Member not found' });

      await expect(resource.removeMember('team-1', 'grp-1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError when user lacks admin role', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Forbidden' });

      await expect(resource.removeMember('team-1', 'grp-1', 'user-1')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.removeMember('team-1', 'grp-1', 'user-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
