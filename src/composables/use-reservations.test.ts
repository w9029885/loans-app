import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inject } from 'vue';
import { useReservations } from './use-reservations';
import type { ReservationUses } from '@/config/appServices';
import type { Reservation } from '@/app/reservation-service';

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue');
  return {
    ...actual,
    inject: vi.fn(),
  };
});

vi.mock('@/composables/useTelemetry', () => ({
  useTelemetry: () => ({
    trackEvent: vi.fn(),
    trackException: vi.fn(),
  }),
}));

const reservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 'res-1',
  userId: 'user-1',
  deviceModelId: 'device-1',
  deviceModelName: 'Laptop',
  status: 'reserved',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

describe('useReservations', () => {
  const injectMock = inject as unknown as vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    injectMock.mockReset();
  });

  it('throws when reservation services are not provided', () => {
    injectMock.mockReturnValue(undefined);
    expect(() => useReservations()).toThrow('Reservations not provided');
  });

  describe('fetchItems', () => {
    it('fetches items successfully', async () => {
      const items = [reservation({ id: 'res-1' }), reservation({ id: 'res-2' })];
      const uses: ReservationUses = {
        listReservations: vi.fn().mockResolvedValue({ success: true, items, totalCount: 2 }),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.fetchItems();

      expect(res.loading.value).toBe(false);
      expect(res.error.value).toBe(null);
      expect(res.items.value).toEqual(items);
      expect(res.totalCount.value).toBe(2);
    });

    it('passes status filter to use case', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn().mockResolvedValue({ success: true, items: [], totalCount: 0 }),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.fetchItems(['reserved', 'collected']);

      expect(uses.listReservations).toHaveBeenCalledWith(['reserved', 'collected']);
    });

    it('sets error when fetch fails from use case', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn().mockResolvedValue({ success: false, errors: ['Access denied'] }),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.fetchItems();

      expect(res.error.value).toBe('Access denied');
      expect(res.items.value).toEqual([]);
      expect(res.totalCount.value).toBe(0);
    });

    it('sets error when fetch throws', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn().mockRejectedValue(new Error('Network error')),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.fetchItems();

      expect(res.error.value).toBe('Network error');
    });

    it('skips fetch when already loading', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      res.loading.value = true;

      await res.fetchItems();

      expect(uses.listReservations).not.toHaveBeenCalled();
    });
  });

  describe('createItem', () => {
    it('creates item successfully and updates list', async () => {
      const newItem = reservation({ id: 'res-new' });
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn().mockResolvedValue({ success: true, item: newItem }),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.createItem({ deviceModelId: 'device-1', deviceModelName: 'Laptop' });

      expect(res.creating.value).toBe(false);
      expect(res.items.value).toContainEqual(newItem);
      expect(res.totalCount.value).toBe(1);
    });

    it('sets error when create fails from use case', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn().mockResolvedValue({ success: false, errors: ['Device unavailable'] }),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.createItem({ deviceModelId: 'device-1', deviceModelName: 'Laptop' });

      expect(res.error.value).toBe('Device unavailable');
    });

    it('sets error when create throws', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn().mockRejectedValue(new Error('Server error')),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.createItem({ deviceModelId: 'device-1', deviceModelName: 'Laptop' });

      expect(res.error.value).toBe('Server error');
    });

    it('skips create when already creating', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      res.creating.value = true;

      await res.createItem({ deviceModelId: 'device-1', deviceModelName: 'Laptop' });

      expect(uses.createReservation).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('updates status successfully', async () => {
      const updated = reservation({ id: 'res-1', status: 'collected' });
      const uses: ReservationUses = {
        listReservations: vi.fn().mockResolvedValue({ success: true, items: [reservation()], totalCount: 1 }),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn().mockResolvedValue({ success: true, item: updated }),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.fetchItems(); // populate items
      await res.updateStatus({ id: 'res-1', status: 'collected' });

      expect(res.updating.value).toBe(false);
      expect(res.items.value.find(i => i.id === 'res-1')?.status).toBe('collected');
    });

    it('sets error when update fails from use case', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn().mockResolvedValue({ success: false, errors: ['Invalid status'] }),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.updateStatus({ id: 'res-1', status: 'collected' });

      expect(res.error.value).toBe('Invalid status');
    });

    it('sets error when update throws', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn().mockRejectedValue(new Error('Not found')),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.updateStatus({ id: 'res-1', status: 'collected' });

      expect(res.error.value).toBe('Not found');
    });

    it('skips update when already updating', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      res.updating.value = true;

      await res.updateStatus({ id: 'res-1', status: 'collected' });

      expect(uses.updateReservationStatus).not.toHaveBeenCalled();
    });
  });

  describe('deleteItem', () => {
    it('deletes item successfully and updates list', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn().mockResolvedValue({ success: true, items: [reservation()], totalCount: 1 }),
        createReservation: vi.fn(),
        deleteReservation: vi.fn().mockResolvedValue({ success: true }),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.fetchItems(); // populate items
      await res.deleteItem({ id: 'res-1' });

      expect(res.deleting.value).toBe(false);
      expect(res.items.value).toEqual([]);
      expect(res.totalCount.value).toBe(0);
    });

    it('sets error when delete fails from use case', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn(),
        deleteReservation: vi.fn().mockResolvedValue({ success: false, errors: ['Not found'] }),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.deleteItem({ id: 'res-1' });

      expect(res.error.value).toBe('Not found');
    });

    it('sets error when delete throws', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn(),
        deleteReservation: vi.fn().mockRejectedValue(new Error('Unauthorized')),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      await res.deleteItem({ id: 'res-1' });

      expect(res.error.value).toBe('Unauthorized');
    });

    it('skips delete when already deleting', async () => {
      const uses: ReservationUses = {
        listReservations: vi.fn(),
        createReservation: vi.fn(),
        deleteReservation: vi.fn(),
        updateReservationStatus: vi.fn(),
      };
      injectMock.mockReturnValue(uses);

      const res = useReservations();
      res.deleting.value = true;

      await res.deleteItem({ id: 'res-1' });

      expect(uses.deleteReservation).not.toHaveBeenCalled();
    });
  });
});
