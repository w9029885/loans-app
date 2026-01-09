import { describe, it, expect, vi } from 'vitest';
import { listReservations } from './list-reservations';
import type { ReservationService, Reservation } from './reservation-service';

describe('listReservations', () => {
  const sampleItems: Reservation[] = [
    {
      id: 'res-1',
      userId: 'user-1',
      deviceModelId: 'device-1',
      deviceModelName: 'Laptop',
      status: 'reserved',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'res-2',
      userId: 'user-1',
      deviceModelId: 'device-2',
      deviceModelName: 'Monitor',
      status: 'collected',
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-03'),
      collectedAt: new Date('2025-01-03'),
    },
  ];

  const createMockService = (overrides: Partial<ReservationService> = {}): ReservationService => ({
    listReservations: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    createReservation: vi.fn(),
    updateReservationStatus: vi.fn(),
    deleteReservation: vi.fn(),
    ...overrides,
  });

  it('returns items and total count when service succeeds', async () => {
    const service = createMockService({
      listReservations: vi.fn().mockResolvedValue({ items: sampleItems, totalCount: 2 }),
    });

    const result = await listReservations(service);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toEqual(sampleItems);
      expect(result.totalCount).toBe(2);
    }
  });

  it('passes status filter to service', async () => {
    const mockListReservations = vi.fn().mockResolvedValue({ items: [], totalCount: 0 });
    const service = createMockService({
      listReservations: mockListReservations,
    });

    await listReservations(service, ['reserved', 'collected']);

    expect(mockListReservations).toHaveBeenCalledWith(['reserved', 'collected']);
  });

  it('returns empty items when no reservations exist', async () => {
    const service = createMockService({
      listReservations: vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
    });

    const result = await listReservations(service);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    }
  });

  it('returns error messages when service throws', async () => {
    const service = createMockService({
      listReservations: vi.fn().mockRejectedValue(new Error('Connection failed')),
    });

    const result = await listReservations(service);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['Connection failed']);
    }
  });

  it('returns default error message for non-Error exceptions', async () => {
    const service = createMockService({
      listReservations: vi.fn().mockRejectedValue('Unknown error'),
    });

    const result = await listReservations(service);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['Failed to list reservations']);
    }
  });
});
