import { describe, it, expect, beforeEach } from 'vitest';
import { TeamsResource } from './teams.js';
import { createKyMock, mockJsonResponse, mockNetworkError, mockHTTPError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError, NotFoundError, AuthorizationError, ValidationError } from '../errors.js';

describe('TeamsResource', () => {
  let resource: TeamsResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new TeamsResource(kyMock as any);
  });

  // ── Team CRUD ──────────────────────────────────────────────────────

  describe('list', () => {
    it('should list teams', async () => {
      const mockTeams = [
        { id: 't1', name: 'Engineering', description: 'Eng team', ownerId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];
      mockJsonResponse(kyMock.get, { teams: mockTeams });

      const result = await resource.list();

      expect(kyMock.get).toHaveBeenCalledWith('teams');
      expect(result).toEqual(mockTeams);
    });

    it('should return empty array when no teams', async () => {
      mockJsonResponse(kyMock.get, { teams: [] });

      const result = await resource.list();

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.list()).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('get', () => {
    it('should get a team by id', async () => {
      const mockTeam = { id: 't1', name: 'Engineering', description: null, ownerId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      mockJsonResponse(kyMock.get, mockTeam);

      const result = await resource.get('t1');

      expect(kyMock.get).toHaveBeenCalledWith('teams/t1');
      expect(result).toEqual(mockTeam);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Team not found' });

      await expect(resource.get('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.get, 403, { message: 'Not a team member' });

      await expect(resource.get('t1')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe('create', () => {
    it('should create a team with name only', async () => {
      const mockTeam = { id: 't2', name: 'Design', description: null, ownerId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      mockJsonResponse(kyMock.post, mockTeam);

      const result = await resource.create({ name: 'Design' });

      expect(kyMock.post).toHaveBeenCalledWith('teams', { json: { name: 'Design' } });
      expect(result).toEqual(mockTeam);
    });

    it('should create a team with name and description', async () => {
      const mockTeam = { id: 't3', name: 'Marketing', description: 'Marketing team', ownerId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-01' };
      mockJsonResponse(kyMock.post, mockTeam);

      const result = await resource.create({ name: 'Marketing', description: 'Marketing team' });

      expect(kyMock.post).toHaveBeenCalledWith('teams', { json: { name: 'Marketing', description: 'Marketing team' } });
      expect(result).toEqual(mockTeam);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Name is required' });

      await expect(resource.create({ name: '' })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('update', () => {
    it('should update team name', async () => {
      const mockTeam = { id: 't1', name: 'Platform Eng', description: null, ownerId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-02' };
      mockJsonResponse(kyMock.patch, mockTeam);

      const result = await resource.update('t1', { name: 'Platform Eng' });

      expect(kyMock.patch).toHaveBeenCalledWith('teams/t1', { json: { name: 'Platform Eng' } });
      expect(result).toEqual(mockTeam);
    });

    it('should update team description to null', async () => {
      const mockTeam = { id: 't1', name: 'Eng', description: null, ownerId: 'u1', createdAt: '2024-01-01', updatedAt: '2024-01-02' };
      mockJsonResponse(kyMock.patch, mockTeam);

      await resource.update('t1', { description: null });

      expect(kyMock.patch).toHaveBeenCalledWith('teams/t1', { json: { description: null } });
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.patch, 403, { message: 'Admin role required' });

      await expect(resource.update('t1', { name: 'X' })).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe('delete', () => {
    it('should delete a team', async () => {
      await resource.delete('t1');

      expect(kyMock.delete).toHaveBeenCalledWith('teams/t1');
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Only owner can delete' });

      await expect(resource.delete('t1')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Team not found' });

      await expect(resource.delete('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── Members ────────────────────────────────────────────────────────

  describe('listMembers', () => {
    it('should list team members', async () => {
      const mockMembers = [
        { id: 'm1', teamId: 't1', userId: 'u1', role: 'owner', joinedAt: '2024-01-01', user: { id: 'u1', email: 'owner@test.com', name: 'Owner' } },
        { id: 'm2', teamId: 't1', userId: 'u2', role: 'member', joinedAt: '2024-01-02', user: { id: 'u2', email: 'member@test.com', name: null } },
      ];
      mockJsonResponse(kyMock.get, { members: mockMembers });

      const result = await resource.listMembers('t1');

      expect(kyMock.get).toHaveBeenCalledWith('teams/t1/members');
      expect(result).toEqual(mockMembers);
      expect(result).toHaveLength(2);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Team not found' });

      await expect(resource.listMembers('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('updateMemberRole', () => {
    it('should update a member role to admin', async () => {
      const mockMember = { id: 'm2', teamId: 't1', userId: 'u2', role: 'admin', joinedAt: '2024-01-02', user: { id: 'u2', email: 'user@test.com', name: 'User' } };
      mockJsonResponse(kyMock.patch, mockMember);

      const result = await resource.updateMemberRole('t1', 'u2', 'admin');

      expect(kyMock.patch).toHaveBeenCalledWith('teams/t1/members/u2', { json: { role: 'admin' } });
      expect(result).toEqual(mockMember);
    });

    it('should update a member role to member', async () => {
      const mockMember = { id: 'm2', teamId: 't1', userId: 'u2', role: 'member', joinedAt: '2024-01-02', user: { id: 'u2', email: 'user@test.com', name: 'User' } };
      mockJsonResponse(kyMock.patch, mockMember);

      const result = await resource.updateMemberRole('t1', 'u2', 'member');

      expect(kyMock.patch).toHaveBeenCalledWith('teams/t1/members/u2', { json: { role: 'member' } });
      expect(result.role).toBe('member');
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.patch, 403, { message: 'Cannot change owner role' });

      await expect(resource.updateMemberRole('t1', 'u1', 'member')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe('removeMember', () => {
    it('should remove a member', async () => {
      await resource.removeMember('t1', 'u2');

      expect(kyMock.delete).toHaveBeenCalledWith('teams/t1/members/u2');
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Cannot remove owner' });

      await expect(resource.removeMember('t1', 'u1')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe('leave', () => {
    it('should leave a team', async () => {
      await resource.leave('t1');

      expect(kyMock.post).toHaveBeenCalledWith('teams/t1/members/leave');
    });

    it('should throw AuthorizationError when owner tries to leave', async () => {
      mockHTTPError(kyMock.post, 403, { message: 'Owner cannot leave' });

      await expect(resource.leave('t1')).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.leave('t1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ── Invitations ────────────────────────────────────────────────────

  describe('inviteMember', () => {
    it('should invite a member with admin role', async () => {
      const mockInvitation = { id: 'inv1', teamId: 't1', email: 'new@test.com', role: 'admin', invitedBy: 'u1', createdAt: '2024-01-01', expiresAt: '2024-01-08' };
      mockJsonResponse(kyMock.post, mockInvitation);

      const result = await resource.inviteMember('t1', 'new@test.com', 'admin');

      expect(kyMock.post).toHaveBeenCalledWith('teams/t1/invitations', { json: { email: 'new@test.com', role: 'admin' } });
      expect(result).toEqual(mockInvitation);
    });

    it('should invite a member with member role', async () => {
      const mockInvitation = { id: 'inv2', teamId: 't1', email: 'colleague@test.com', role: 'member', invitedBy: 'u1', createdAt: '2024-01-01', expiresAt: '2024-01-08' };
      mockJsonResponse(kyMock.post, mockInvitation);

      const result = await resource.inviteMember('t1', 'colleague@test.com', 'member');

      expect(result.role).toBe('member');
    });

    it('should throw ValidationError when user is already a member', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'User is already a member' });

      await expect(resource.inviteMember('t1', 'existing@test.com', 'member')).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.post, 403, { message: 'Admin role required' });

      await expect(resource.inviteMember('t1', 'new@test.com', 'admin')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  describe('listInvitations', () => {
    it('should list pending invitations', async () => {
      const mockInvitations = [
        { id: 'inv1', teamId: 't1', email: 'pending@test.com', role: 'member', invitedBy: 'u1', createdAt: '2024-01-01', expiresAt: '2024-01-08' },
      ];
      mockJsonResponse(kyMock.get, { invitations: mockInvitations });

      const result = await resource.listInvitations('t1');

      expect(kyMock.get).toHaveBeenCalledWith('teams/t1/invitations');
      expect(result).toEqual(mockInvitations);
    });

    it('should return empty array when no invitations', async () => {
      mockJsonResponse(kyMock.get, { invitations: [] });

      const result = await resource.listInvitations('t1');

      expect(result).toEqual([]);
    });
  });

  describe('revokeInvitation', () => {
    it('should revoke an invitation', async () => {
      await resource.revokeInvitation('t1', 'inv1');

      expect(kyMock.delete).toHaveBeenCalledWith('teams/t1/invitations/inv1');
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.delete, 404, { message: 'Invitation not found' });

      await expect(resource.revokeInvitation('t1', 'nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw AuthorizationError on 403', async () => {
      mockHTTPError(kyMock.delete, 403, { message: 'Admin role required' });

      await expect(resource.revokeInvitation('t1', 'inv1')).rejects.toBeInstanceOf(AuthorizationError);
    });
  });

  // ── Team Vaults ────────────────────────────────────────────────────

  describe('createVault', () => {
    it('should create a team vault with name only', async () => {
      const mockVault = { id: 'v1', name: 'Shared Docs', slug: 'shared-docs' };
      mockJsonResponse(kyMock.post, mockVault);

      const result = await resource.createVault('t1', { name: 'Shared Docs' });

      expect(kyMock.post).toHaveBeenCalledWith('teams/t1/vaults', { json: { name: 'Shared Docs' } });
      expect(result).toEqual(mockVault);
    });

    it('should create a team vault with description', async () => {
      const mockVault = { id: 'v2', name: 'Wiki', slug: 'wiki', description: 'Team wiki' };
      mockJsonResponse(kyMock.post, mockVault);

      const result = await resource.createVault('t1', { name: 'Wiki', description: 'Team wiki' });

      expect(kyMock.post).toHaveBeenCalledWith('teams/t1/vaults', { json: { name: 'Wiki', description: 'Team wiki' } });
      expect(result).toEqual(mockVault);
    });

    it('should throw ValidationError on 400', async () => {
      mockHTTPError(kyMock.post, 400, { message: 'Name is required' });

      await expect(resource.createVault('t1', { name: '' })).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('listVaults', () => {
    it('should list team vaults', async () => {
      const mockVaults = [
        { id: 'v1', name: 'Shared Docs', slug: 'shared-docs' },
        { id: 'v2', name: 'Wiki', slug: 'wiki' },
      ];
      mockJsonResponse(kyMock.get, { vaults: mockVaults });

      const result = await resource.listVaults('t1');

      expect(kyMock.get).toHaveBeenCalledWith('teams/t1/vaults');
      expect(result).toEqual(mockVaults);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no vaults', async () => {
      mockJsonResponse(kyMock.get, { vaults: [] });

      const result = await resource.listVaults('t1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError on 404', async () => {
      mockHTTPError(kyMock.get, 404, { message: 'Team not found' });

      await expect(resource.listVaults('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── Team Calendar ───────────────────────────────────────────────────

  describe('getCalendar', () => {
    it('should get team calendar data for a date range', async () => {
      const mockResponse = {
        days: { '2024-01-01': { date: '2024-01-01', activityCount: 3, events: [], dueDocs: [] } },
        start: '2024-01-01',
        end: '2024-01-31',
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.getCalendar('t1', { start: '2024-01-01', end: '2024-01-31' });

      expect(kyMock.get).toHaveBeenCalledWith(
        'teams/t1/calendar',
        expect.objectContaining({ searchParams: expect.any(URLSearchParams) }),
      );
      expect(result.start).toBe('2024-01-01');
      expect(result.end).toBe('2024-01-31');
    });

    it('should include types filter when provided', async () => {
      const mockResponse = { days: {}, start: '2024-01-01', end: '2024-01-31' };
      mockJsonResponse(kyMock.get, mockResponse);

      await resource.getCalendar('t1', { start: '2024-01-01', end: '2024-01-31', types: 'events,due' });

      expect(kyMock.get).toHaveBeenCalledWith(
        'teams/t1/calendar',
        expect.objectContaining({ searchParams: expect.any(URLSearchParams) }),
      );
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getCalendar('t1', { start: '2024-01-01', end: '2024-01-31' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getCalendarActivity', () => {
    it('should get team calendar activity for a date range', async () => {
      const mockResponse = {
        days: [
          { date: '2024-01-01', created: 2, updated: 1, deleted: 0, total: 3 },
        ],
        start: '2024-01-01',
        end: '2024-01-31',
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.getCalendarActivity('t1', { start: '2024-01-01', end: '2024-01-31' });

      expect(kyMock.get).toHaveBeenCalledWith(
        'teams/t1/calendar/activity',
        expect.objectContaining({ searchParams: expect.any(URLSearchParams) }),
      );
      expect(result.days).toHaveLength(1);
      expect(result.days[0].total).toBe(3);
    });
  });

  describe('getCalendarEvents', () => {
    it('should get team calendar events and unwrap events array', async () => {
      const mockEvents = [
        { id: 'e1', vaultId: 'v1', userId: 'u1', title: 'Team Meeting', startDate: '2024-01-15', allDay: false, completed: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];
      mockJsonResponse(kyMock.get, { events: mockEvents });

      const result = await resource.getCalendarEvents('t1');

      expect(kyMock.get).toHaveBeenCalledWith(
        'teams/t1/calendar/events',
        expect.objectContaining({ searchParams: undefined }),
      );
      expect(result).toEqual(mockEvents);
    });

    it('should pass date range filter when provided', async () => {
      mockJsonResponse(kyMock.get, { events: [] });

      await resource.getCalendarEvents('t1', { start: '2024-01-01', end: '2024-01-31' });

      expect(kyMock.get).toHaveBeenCalledWith(
        'teams/t1/calendar/events',
        expect.objectContaining({ searchParams: expect.any(URLSearchParams) }),
      );
    });

    it('should return empty array when no events', async () => {
      mockJsonResponse(kyMock.get, { events: [] });

      const result = await resource.getCalendarEvents('t1');

      expect(result).toEqual([]);
    });
  });
});
