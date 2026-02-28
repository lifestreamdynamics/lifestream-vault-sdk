import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CalendarResource } from './calendar.js';
import { createKyMock, mockJsonResponse, mockNetworkError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError } from '../errors.js';

describe('CalendarResource', () => {
  let resource: CalendarResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new CalendarResource(kyMock as any);
  });

  describe('getCalendar', () => {
    it('should get calendar data with date range', async () => {
      const mockResponse = {
        days: {
          '2024-01-01': { date: '2024-01-01', activityCount: 5, events: [], dueDocs: [] },
        },
        start: '2024-01-01',
        end: '2024-01-31',
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.getCalendar('vault-1', { start: '2024-01-01', end: '2024-01-31' });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/vault-1/calendar', {
        searchParams: { start: '2024-01-01', end: '2024-01-31' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should include types filter when provided', async () => {
      const mockResponse = { days: {}, start: '2024-01-01', end: '2024-01-31' };
      mockJsonResponse(kyMock.get, mockResponse);

      await resource.getCalendar('vault-1', { start: '2024-01-01', end: '2024-01-31', types: 'events,due' });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/vault-1/calendar', {
        searchParams: { start: '2024-01-01', end: '2024-01-31', types: 'events,due' },
      });
    });
  });

  describe('getActivity', () => {
    it('should get activity summary', async () => {
      const mockResponse = {
        days: [
          { date: '2024-01-01', created: 2, updated: 3, deleted: 1, total: 6 },
          { date: '2024-01-02', created: 1, updated: 0, deleted: 0, total: 1 },
        ],
        start: '2024-01-01',
        end: '2024-01-31',
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.getActivity('vault-1', { start: '2024-01-01', end: '2024-01-31' });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/vault-1/calendar/activity', {
        searchParams: { start: '2024-01-01', end: '2024-01-31' },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getDueDates', () => {
    it('should get all due dates by default', async () => {
      const mockResponse = [
        { documentId: 'd1', path: 'task.md', dueAt: '2024-01-15', completed: false, overdue: false },
      ];
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.getDueDates('vault-1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/vault-1/calendar/due', {
        searchParams: {},
      });
      expect(result).toEqual(mockResponse);
    });

    it('should filter by status when provided', async () => {
      const mockResponse = [
        { documentId: 'd1', path: 'overdue.md', dueAt: '2024-01-01', completed: false, overdue: true },
      ];
      mockJsonResponse(kyMock.get, mockResponse);

      await resource.getDueDates('vault-1', { status: 'overdue' });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/vault-1/calendar/due', {
        searchParams: { status: 'overdue' },
      });
    });
  });

  describe('listEvents', () => {
    it('should list all events when no filters provided', async () => {
      const mockResponse = [
        { id: 'e1', vaultId: 'v1', userId: 'u1', title: 'Meeting', startDate: '2024-01-15', allDay: false, completed: false, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
      ];
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.listEvents('vault-1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/vault-1/calendar/events', {
        searchParams: {},
      });
      expect(result).toEqual(mockResponse);
    });

    it('should filter by date range when provided', async () => {
      const mockResponse: any[] = [];
      mockJsonResponse(kyMock.get, mockResponse);

      await resource.listEvents('vault-1', { start: '2024-01-01', end: '2024-01-31' });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/vault-1/calendar/events', {
        searchParams: { start: '2024-01-01', end: '2024-01-31' },
      });
    });
  });

  describe('createEvent', () => {
    it('should create a calendar event', async () => {
      const eventData = {
        title: 'Team Meeting',
        description: 'Weekly sync',
        startDate: '2024-01-15T10:00:00Z',
        allDay: false,
      };
      const mockResponse = {
        id: 'e1',
        vaultId: 'v1',
        userId: 'u1',
        ...eventData,
        completed: false,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.post, mockResponse);

      const result = await resource.createEvent('vault-1', eventData);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/vault-1/calendar/events', {
        json: eventData,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateEvent', () => {
    it('should update a calendar event', async () => {
      const updateData = { title: 'Updated Meeting', completed: true };
      const mockResponse = {
        id: 'e1',
        vaultId: 'v1',
        userId: 'u1',
        title: 'Updated Meeting',
        startDate: '2024-01-15',
        allDay: false,
        completed: true,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };
      mockJsonResponse(kyMock.put, mockResponse);

      const result = await resource.updateEvent('vault-1', 'e1', updateData);

      expect(kyMock.put).toHaveBeenCalledWith('vaults/vault-1/calendar/events/e1', {
        json: updateData,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteEvent', () => {
    it('should delete a calendar event', async () => {
      mockJsonResponse(kyMock.delete, undefined);

      await resource.deleteEvent('vault-1', 'e1');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/vault-1/calendar/events/e1');
    });
  });

  describe('setDocumentDue', () => {
    it('should set due date on a document', async () => {
      const dueData = {
        dueAt: '2024-01-15T00:00:00Z',
        priority: 'high',
        recurrence: 'weekly',
      };
      const mockResponse = { success: true };
      mockJsonResponse(kyMock.patch, mockResponse);

      const result = await resource.setDocumentDue('vault-1', 'tasks/todo.md', dueData);

      expect(kyMock.patch).toHaveBeenCalledWith('vaults/vault-1/documents/tasks/todo.md/due', {
        json: dueData,
      });
      expect(result).toEqual(mockResponse);
    });

    it('should clear due date with null values', async () => {
      const dueData = { dueAt: null, priority: null, recurrence: null };
      const mockResponse = { success: true };
      mockJsonResponse(kyMock.patch, mockResponse);

      await resource.setDocumentDue('vault-1', 'tasks/todo.md', dueData);

      expect(kyMock.patch).toHaveBeenCalledWith('vaults/vault-1/documents/tasks/todo.md/due', {
        json: dueData,
      });
    });
  });

  describe('getIcalFeed', () => {
    it('should get the iCal feed as a string', async () => {
      const icalContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR';
      kyMock.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(undefined),
        text: vi.fn().mockResolvedValue(icalContent),
        ok: true,
        status: 200,
      });

      const result = await resource.getIcalFeed('vault-1');

      expect(kyMock.get).toHaveBeenCalledWith(
        'vaults/vault-1/calendar/feed.ics',
        expect.objectContaining({ searchParams: {} }),
      );
      expect(result).toBe(icalContent);
    });

    it('should pass include filter when provided', async () => {
      const icalContent = 'BEGIN:VCALENDAR\nEND:VCALENDAR';
      kyMock.get.mockReturnValue({
        json: vi.fn().mockResolvedValue(undefined),
        text: vi.fn().mockResolvedValue(icalContent),
        ok: true,
        status: 200,
      });

      await resource.getIcalFeed('vault-1', { include: 'events,due' });

      expect(kyMock.get).toHaveBeenCalledWith(
        'vaults/vault-1/calendar/feed.ics',
        expect.objectContaining({ searchParams: { include: 'events,due' } }),
      );
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getIcalFeed('vault-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getAgenda', () => {
    it('should get the agenda for a vault', async () => {
      const mockResponse = {
        groups: [
          { label: 'Today', items: [{ documentId: 'd1', path: 'task.md', dueAt: '2024-01-15', completed: false, overdue: false }] },
          { label: 'Overdue', items: [] },
        ],
        total: 1,
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.getAgenda('vault-1');

      expect(kyMock.get).toHaveBeenCalledWith(
        'vaults/vault-1/calendar/agenda',
        expect.objectContaining({ searchParams: {} }),
      );
      expect(result.total).toBe(1);
      expect(result.groups).toHaveLength(2);
    });

    it('should pass filter params when provided', async () => {
      const mockResponse = { groups: [], total: 0 };
      mockJsonResponse(kyMock.get, mockResponse);

      await resource.getAgenda('vault-1', { status: 'overdue', range: '7d', groupBy: 'priority' });

      expect(kyMock.get).toHaveBeenCalledWith(
        'vaults/vault-1/calendar/agenda',
        expect.objectContaining({ searchParams: { status: 'overdue', range: '7d', groupBy: 'priority' } }),
      );
    });

    it('should return empty groups when no agenda items', async () => {
      const mockResponse = { groups: [], total: 0 };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.getAgenda('vault-1');

      expect(result.total).toBe(0);
      expect(result.groups).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // Calendar connector OAuth methods
  // ---------------------------------------------------------------------------

  describe('connectGoogleCalendar', () => {
    it('should POST to the google connect endpoint and return authUrl', async () => {
      const mockResponse = { authUrl: 'https://accounts.google.com/o/oauth2/auth?...' };
      mockJsonResponse(kyMock.post, mockResponse);

      const result = await resource.connectGoogleCalendar('v1');

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/calendar-connectors/google/connect');
      expect(result).toEqual(mockResponse);
      expect(result.authUrl).toBe('https://accounts.google.com/o/oauth2/auth?...');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.connectGoogleCalendar('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('connectOutlookCalendar', () => {
    it('should POST to the outlook connect endpoint and return authUrl', async () => {
      const mockResponse = { authUrl: 'https://login.microsoftonline.com/oauth2/authorize?...' };
      mockJsonResponse(kyMock.post, mockResponse);

      const result = await resource.connectOutlookCalendar('v1');

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/calendar-connectors/outlook/connect');
      expect(result).toEqual(mockResponse);
      expect(result.authUrl).toBe('https://login.microsoftonline.com/oauth2/authorize?...');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.connectOutlookCalendar('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // Event template methods
  // ---------------------------------------------------------------------------

  describe('listTemplates', () => {
    it('should GET templates and return the templates array', async () => {
      const mockTemplates = [
        {
          id: 'tmpl-1',
          vaultId: 'v1',
          userId: 'u1',
          name: 'Daily Standup',
          duration: 15,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];
      mockJsonResponse(kyMock.get, { templates: mockTemplates });

      const result = await resource.listTemplates('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/templates');
      expect(result).toEqual(mockTemplates);
    });

    it('should return empty array when no templates exist', async () => {
      mockJsonResponse(kyMock.get, { templates: [] });

      const result = await resource.listTemplates('v1');

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listTemplates('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('createTemplate', () => {
    it('should POST with json body and return the created template', async () => {
      const input = { name: 'Sprint Planning', duration: 60, color: '#3b82f6' };
      const mockResponse = {
        id: 'tmpl-2',
        vaultId: 'v1',
        userId: 'u1',
        ...input,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.post, mockResponse);

      const result = await resource.createTemplate('v1', input);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/calendar/templates', { json: input });
      expect(result).toEqual(mockResponse);
      expect(result.name).toBe('Sprint Planning');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.createTemplate('v1', { name: 'T', duration: 30 })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('getTemplate', () => {
    it('should GET a template by id', async () => {
      const mockTemplate = {
        id: 'tmpl-1',
        vaultId: 'v1',
        userId: 'u1',
        name: 'Daily Standup',
        duration: 15,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      };
      mockJsonResponse(kyMock.get, mockTemplate);

      const result = await resource.getTemplate('v1', 'tmpl-1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/templates/tmpl-1');
      expect(result).toEqual(mockTemplate);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getTemplate('v1', 'tmpl-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('updateTemplate', () => {
    it('should PUT with json body and return the updated template', async () => {
      const updateData = { name: 'Updated Standup', duration: 20 };
      const mockResponse = {
        id: 'tmpl-1',
        vaultId: 'v1',
        userId: 'u1',
        name: 'Updated Standup',
        duration: 20,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };
      mockJsonResponse(kyMock.put, mockResponse);

      const result = await resource.updateTemplate('v1', 'tmpl-1', updateData);

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1/calendar/templates/tmpl-1', { json: updateData });
      expect(result).toEqual(mockResponse);
      expect(result.duration).toBe(20);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.put);

      await expect(resource.updateTemplate('v1', 'tmpl-1', { name: 'X' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('deleteTemplate', () => {
    it('should DELETE the template at the correct URL', async () => {
      mockJsonResponse(kyMock.delete, undefined);

      await resource.deleteTemplate('v1', 'tmpl-1');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/calendar/templates/tmpl-1');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.deleteTemplate('v1', 'tmpl-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('toggleComplete', () => {
    it('should set completedAt to now when completed is true', async () => {
      const mockResponse = { id: 'd1', completedAt: '2024-01-15T10:00:00Z' };
      mockJsonResponse(kyMock.patch, mockResponse);

      const before = Date.now();
      const result = await resource.toggleComplete('vault-1', 'tasks/todo.md', true);
      const after = Date.now();

      expect(kyMock.patch).toHaveBeenCalledWith(
        'vaults/vault-1/documents/tasks/todo.md',
        expect.objectContaining({
          json: expect.objectContaining({ completedAt: expect.any(String) }),
        }),
      );

      // Verify completedAt is a valid ISO string (not null)
      const call = vi.mocked(kyMock.patch).mock.calls[0];
      const json = (call[1] as { json: { completedAt: string | null } }).json;
      expect(json.completedAt).not.toBeNull();
      const ts = new Date(json.completedAt!).getTime();
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
      expect(result).toEqual(mockResponse);
    });

    it('should set completedAt to null when completed is false', async () => {
      const mockResponse = { id: 'd1', completedAt: null };
      mockJsonResponse(kyMock.patch, mockResponse);

      await resource.toggleComplete('vault-1', 'tasks/todo.md', false);

      expect(kyMock.patch).toHaveBeenCalledWith(
        'vaults/vault-1/documents/tasks/todo.md',
        { json: { completedAt: null } },
      );
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.patch);

      await expect(resource.toggleComplete('vault-1', 'tasks/todo.md', true)).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('error handling', () => {
    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getActivity('vault-1', { start: '2024-01-01', end: '2024-01-31' })).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
