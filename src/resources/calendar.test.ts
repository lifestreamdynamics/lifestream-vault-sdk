import { describe, it, expect, beforeEach } from 'vitest';
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

  describe('error handling', () => {
    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getActivity('vault-1', { start: '2024-01-01', end: '2024-01-31' })).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
