import { describe, it, expect, beforeEach } from 'vitest';
import { BookingResource } from './booking.js';
import { createKyMock, mockJsonResponse, mockNetworkError, type KyMock } from '../__tests__/mocks/ky.js';
import { NetworkError } from '../errors.js';

describe('BookingResource', () => {
  let resource: BookingResource;
  let kyMock: KyMock;

  beforeEach(() => {
    kyMock = createKyMock();
    resource = new BookingResource(kyMock as any);
  });

  // ---------------------------------------------------------------------------
  // listSlots
  // ---------------------------------------------------------------------------

  describe('listSlots', () => {
    it('should list event slots and unwrap the slots array', async () => {
      const mockSlots = [
        {
          id: 'slot-1',
          vaultId: 'v1',
          userId: 'u1',
          title: '30-min consult',
          durationMin: 30,
          bufferMin: 0,
          startTime: '09:00',
          endTime: '17:00',
          daysOfWeek: ['Mon', 'Wed', 'Fri'],
          timezone: 'America/New_York',
          isActive: true,
          maxConcurrent: 1,
          confirmationMode: 'auto' as const,
          createBackingFile: false,
          requirePhone: false,
          priceCents: null,
          currency: 'CAD',
          requirePayment: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockJsonResponse(kyMock.get, { slots: mockSlots });

      const result = await resource.listSlots('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/slots');
      expect(result).toEqual(mockSlots);
    });

    it('should return empty array when no slots exist', async () => {
      mockJsonResponse(kyMock.get, { slots: [] });

      const result = await resource.listSlots('v1');

      expect(result).toEqual([]);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listSlots('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // createSlot
  // ---------------------------------------------------------------------------

  describe('createSlot', () => {
    it('should POST slot data and return the created slot', async () => {
      const input = {
        title: 'Client Session',
        durationMin: 60,
        startTime: '10:00',
        endTime: '18:00',
        daysOfWeek: ['Tue', 'Thu'],
        timezone: 'America/Toronto',
        confirmationMode: 'email' as const,
      };
      const mockResponse = {
        id: 'slot-2',
        vaultId: 'v1',
        userId: 'u1',
        ...input,
        bufferMin: 0,
        isActive: true,
        maxConcurrent: 1,
        createBackingFile: false,
        requirePhone: false,
        priceCents: null,
        currency: 'CAD',
        requirePayment: false,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };
      mockJsonResponse(kyMock.post, mockResponse);

      const result = await resource.createSlot('v1', input);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/calendar/slots', { json: input });
      expect(result).toEqual(mockResponse);
      expect(result.title).toBe('Client Session');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.createSlot('v1', {
        title: 'Test',
        durationMin: 30,
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: ['Mon'],
        timezone: 'UTC',
      })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // updateSlot
  // ---------------------------------------------------------------------------

  describe('updateSlot', () => {
    it('should PUT slot data and return the updated slot', async () => {
      const updateData = { title: 'Updated Consult', isActive: false };
      const mockResponse = {
        id: 'slot-1',
        vaultId: 'v1',
        userId: 'u1',
        title: 'Updated Consult',
        durationMin: 30,
        bufferMin: 0,
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: ['Mon'],
        timezone: 'UTC',
        isActive: false,
        maxConcurrent: 1,
        confirmationMode: 'auto' as const,
        createBackingFile: false,
        requirePhone: false,
        priceCents: null,
        currency: 'CAD',
        requirePayment: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
      };
      mockJsonResponse(kyMock.put, mockResponse);

      const result = await resource.updateSlot('v1', 'slot-1', updateData);

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1/calendar/slots/slot-1', { json: updateData });
      expect(result.title).toBe('Updated Consult');
      expect(result.isActive).toBe(false);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.put);

      await expect(resource.updateSlot('v1', 'slot-1', { title: 'X' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteSlot
  // ---------------------------------------------------------------------------

  describe('deleteSlot', () => {
    it('should DELETE the slot at the correct URL', async () => {
      mockJsonResponse(kyMock.delete, {});

      await resource.deleteSlot('v1', 'slot-1');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/calendar/slots/slot-1');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.deleteSlot('v1', 'slot-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // getAvailability
  // ---------------------------------------------------------------------------

  describe('getAvailability', () => {
    it('should GET availability with date searchParam', async () => {
      const mockResponse = {
        times: [
          { startAt: '2026-03-15T10:00:00Z', endAt: '2026-03-15T10:30:00Z' },
          { startAt: '2026-03-15T11:00:00Z', endAt: '2026-03-15T11:30:00Z' },
        ],
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.getAvailability('v1', 'slot-1', '2026-03-15');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/slots/slot-1/availability', {
        searchParams: { date: '2026-03-15' },
      });
      expect(result.times).toHaveLength(2);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getAvailability('v1', 'slot-1', '2026-03-15')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // listBookings
  // ---------------------------------------------------------------------------

  describe('listBookings', () => {
    it('should GET bookings and return bookings with total', async () => {
      const mockBookings = [
        {
          id: 'b1',
          slotId: 'slot-1',
          vaultId: 'v1',
          status: 'confirmed' as const,
          startAt: '2026-03-15T10:00:00Z',
          endAt: '2026-03-15T10:30:00Z',
          guestName: 'Jane Doe',
          guestEmail: 'jane@example.com',
          paymentStatus: 'unpaid' as const,
          createdAt: '2026-03-01T00:00:00Z',
          updatedAt: '2026-03-01T00:00:00Z',
        },
      ];
      mockJsonResponse(kyMock.get, { bookings: mockBookings, total: 1 });

      const result = await resource.listBookings('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/bookings', { searchParams: {} });
      expect(result.bookings).toEqual(mockBookings);
      expect(result.total).toBe(1);
    });

    it('should pass filters as searchParams when provided', async () => {
      mockJsonResponse(kyMock.get, { bookings: [], total: 0 });

      await resource.listBookings('v1', {
        status: 'pending',
        slotId: 'slot-1',
        startAfter: '2026-03-01',
        startBefore: '2026-03-31',
      });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/bookings', {
        searchParams: {
          status: 'pending',
          slotId: 'slot-1',
          startAfter: '2026-03-01',
          startBefore: '2026-03-31',
        },
      });
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.listBookings('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // getBooking
  // ---------------------------------------------------------------------------

  describe('getBooking', () => {
    it('should GET a single booking by ID', async () => {
      const mockBooking = {
        id: 'b1',
        slotId: 'slot-1',
        vaultId: 'v1',
        status: 'confirmed' as const,
        startAt: '2026-03-15T10:00:00Z',
        endAt: '2026-03-15T10:30:00Z',
        guestName: 'Jane Doe',
        guestEmail: 'jane@example.com',
        paymentStatus: 'unpaid' as const,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      };
      mockJsonResponse(kyMock.get, mockBooking);

      const result = await resource.getBooking('v1', 'b1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/bookings/b1');
      expect(result).toEqual(mockBooking);
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getBooking('v1', 'b1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // updateBookingStatus
  // ---------------------------------------------------------------------------

  describe('updateBookingStatus', () => {
    it('should PATCH booking status and return updated booking', async () => {
      const mockResponse = {
        id: 'b1',
        slotId: 'slot-1',
        vaultId: 'v1',
        status: 'confirmed' as const,
        startAt: '2026-03-15T10:00:00Z',
        endAt: '2026-03-15T10:30:00Z',
        guestName: 'Jane Doe',
        guestEmail: 'jane@example.com',
        confirmedAt: '2026-03-10T12:00:00Z',
        paymentStatus: 'unpaid' as const,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-10T12:00:00Z',
      };
      mockJsonResponse(kyMock.patch, mockResponse);

      const result = await resource.updateBookingStatus('v1', 'b1', 'confirmed');

      expect(kyMock.patch).toHaveBeenCalledWith('vaults/v1/calendar/bookings/b1/status', {
        json: { status: 'confirmed' },
      });
      expect(result.status).toBe('confirmed');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.patch);

      await expect(resource.updateBookingStatus('v1', 'b1', 'cancelled')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // listTemplates
  // ---------------------------------------------------------------------------

  describe('listTemplates', () => {
    it('should GET templates and unwrap the templates array', async () => {
      const mockTemplates = [
        {
          id: 'tmpl-1',
          vaultId: 'v1',
          userId: 'u1',
          name: 'Kickoff Meeting',
          description: 'Standard kickoff',
          defaults: { durationMin: 60 },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
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

  // ---------------------------------------------------------------------------
  // createTemplate
  // ---------------------------------------------------------------------------

  describe('createTemplate', () => {
    it('should POST template data and return the created template', async () => {
      const input = {
        name: 'Sprint Planning',
        description: 'Bi-weekly sprint planning',
        defaults: { durationMin: 90, daysOfWeek: ['Mon'] },
      };
      const mockResponse = {
        id: 'tmpl-2',
        vaultId: 'v1',
        userId: 'u1',
        ...input,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };
      mockJsonResponse(kyMock.post, mockResponse);

      const result = await resource.createTemplate('v1', input);

      expect(kyMock.post).toHaveBeenCalledWith('vaults/v1/calendar/templates', { json: input });
      expect(result.name).toBe('Sprint Planning');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.createTemplate('v1', { name: 'T', defaults: {} })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // updateTemplate
  // ---------------------------------------------------------------------------

  describe('updateTemplate', () => {
    it('should PUT template data and return the updated template', async () => {
      const updateData = { name: 'Updated Planning', description: 'Updated description' };
      const mockResponse = {
        id: 'tmpl-1',
        vaultId: 'v1',
        userId: 'u1',
        name: 'Updated Planning',
        description: 'Updated description',
        defaults: {},
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-05T00:00:00Z',
      };
      mockJsonResponse(kyMock.put, mockResponse);

      const result = await resource.updateTemplate('v1', 'tmpl-1', updateData);

      expect(kyMock.put).toHaveBeenCalledWith('vaults/v1/calendar/templates/tmpl-1', { json: updateData });
      expect(result.name).toBe('Updated Planning');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.put);

      await expect(resource.updateTemplate('v1', 'tmpl-1', { name: 'X' })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteTemplate
  // ---------------------------------------------------------------------------

  describe('deleteTemplate', () => {
    it('should DELETE the template at the correct URL', async () => {
      mockJsonResponse(kyMock.delete, {});

      await resource.deleteTemplate('v1', 'tmpl-1');

      expect(kyMock.delete).toHaveBeenCalledWith('vaults/v1/calendar/templates/tmpl-1');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.deleteTemplate('v1', 'tmpl-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // getWaitlist
  // ---------------------------------------------------------------------------

  describe('getWaitlist', () => {
    it('should GET waitlist entries with total', async () => {
      const mockEntries = [
        {
          id: 'wl-1',
          slotId: 'slot-1',
          vaultId: 'v1',
          startAt: '2026-03-15T10:00:00Z',
          guestName: 'Bob Smith',
          guestEmail: 'bob@example.com',
          position: 1,
          status: 'waiting' as const,
          notifiedAt: null,
          expiresAt: null,
          createdAt: '2026-03-10T00:00:00Z',
        },
      ];
      mockJsonResponse(kyMock.get, { entries: mockEntries, total: 1 });

      const result = await resource.getWaitlist('v1', 'slot-1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/slots/slot-1/waitlist', {
        searchParams: {},
      });
      expect(result.entries).toEqual(mockEntries);
      expect(result.total).toBe(1);
    });

    it('should pass filters as searchParams when provided', async () => {
      mockJsonResponse(kyMock.get, { entries: [], total: 0 });

      await resource.getWaitlist('v1', 'slot-1', {
        status: 'waiting',
        startAt: '2026-03-15T10:00:00Z',
      });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/slots/slot-1/waitlist', {
        searchParams: {
          status: 'waiting',
          startAt: '2026-03-15T10:00:00Z',
        },
      });
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getWaitlist('v1', 'slot-1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // getBookingAnalytics
  // ---------------------------------------------------------------------------

  describe('getBookingAnalytics', () => {
    it('should GET booking analytics without filters', async () => {
      const mockResponse = {
        view: 'volume',
        data: [
          { date: '2026-03-01', bookings: 3, cancellations: 1 },
          { date: '2026-03-02', bookings: 5, cancellations: 0 },
        ],
      };
      mockJsonResponse(kyMock.get, mockResponse);

      const result = await resource.getBookingAnalytics('v1');

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/analytics', {
        searchParams: {},
      });
      expect(result.view).toBe('volume');
      expect(result.data).toHaveLength(2);
    });

    it('should pass analytics filters as searchParams', async () => {
      const mockResponse = { view: 'funnel', data: [] };
      mockJsonResponse(kyMock.get, mockResponse);

      await resource.getBookingAnalytics('v1', {
        view: 'funnel',
        from: '2026-03-01',
        to: '2026-03-31',
        slotId: 'slot-1',
      });

      expect(kyMock.get).toHaveBeenCalledWith('vaults/v1/calendar/analytics', {
        searchParams: {
          view: 'funnel',
          from: '2026-03-01',
          to: '2026-03-31',
          slotId: 'slot-1',
        },
      });
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.get);

      await expect(resource.getBookingAnalytics('v1')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  // ---------------------------------------------------------------------------
  // Public-facing methods
  // ---------------------------------------------------------------------------

  describe('joinWaitlist', () => {
    it('should POST to public waitlist endpoint and return position + leaveToken', async () => {
      const mockResponse = {
        message: 'Added to waitlist',
        position: 3,
        leaveToken: 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd',
      };
      mockJsonResponse(kyMock.post, mockResponse);

      const input = {
        guestName: 'Carol White',
        guestEmail: 'carol@example.com',
        startAt: '2026-03-15T10:00:00Z',
      };
      const result = await resource.joinWaitlist('myprofile', 'myvault', 'slot-1', input);

      expect(kyMock.post).toHaveBeenCalledWith(
        'public/vaults/myprofile/myvault/booking-slots/slot-1/waitlist',
        { json: input },
      );
      expect(result.position).toBe(3);
      expect(result.leaveToken).toBeTruthy();
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.joinWaitlist('p', 'v', 's', {
        guestName: 'X',
        guestEmail: 'x@example.com',
        startAt: '2026-03-15T10:00:00Z',
      })).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('leaveWaitlist', () => {
    it('should DELETE public waitlist entry by leave token', async () => {
      const mockResponse = { message: 'Removed from waitlist' };
      mockJsonResponse(kyMock.delete, mockResponse);

      const token = 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd';
      const result = await resource.leaveWaitlist(token);

      expect(kyMock.delete).toHaveBeenCalledWith(`public/bookings/waitlist/${token}`);
      expect(result.message).toBe('Removed from waitlist');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.delete);

      await expect(resource.leaveWaitlist('token')).rejects.toBeInstanceOf(NetworkError);
    });
  });

  describe('rescheduleBooking', () => {
    it('should POST to public reschedule endpoint', async () => {
      const mockResponse = {
        message: 'Booking rescheduled',
        guestName: 'Jane Doe',
        startAt: '2026-03-20T10:00:00Z',
      };
      mockJsonResponse(kyMock.post, mockResponse);

      const token = 'reschedule_token_abc123';
      const result = await resource.rescheduleBooking(token, '2026-03-20T10:00:00Z');

      expect(kyMock.post).toHaveBeenCalledWith(
        `public/bookings/reschedule/${token}`,
        { json: { newStartAt: '2026-03-20T10:00:00Z' } },
      );
      expect(result.guestName).toBe('Jane Doe');
      expect(result.startAt).toBe('2026-03-20T10:00:00Z');
    });

    it('should throw NetworkError on network failure', async () => {
      mockNetworkError(kyMock.post);

      await expect(resource.rescheduleBooking('token', '2026-03-20T10:00:00Z')).rejects.toBeInstanceOf(NetworkError);
    });
  });
});
