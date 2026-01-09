import { describe, it, expect, vi } from 'vitest';
import { updateReservationStatus } from './update-reservation-status';
import type { ReservationService, Reservation } from './reservation-service';

describe('updateReservationStatus', () => {
  const sampleReservation: Reservation = {
    id: 'res-1',
    userId: 'user-1',
    deviceModelId: 'device-1',
    deviceModelName: 'Laptop',
    status: 'reserved',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const createMockService = (overrides: Partial<ReservationService> = {}): ReservationService => ({
    listReservations: vi.fn(),
    createReservation: vi.fn(),
    updateReservationStatus: vi.fn().mockResolvedValue({ item: sampleReservation }),
    deleteReservation: vi.fn(),
    ...overrides,
  });

  it('returns success with updated item when service succeeds', async () => {
    const updatedReservation = { ...sampleReservation, status: 'collected' as const };
    const service = createMockService({
      updateReservationStatus: vi.fn().mockResolvedValue({ item: updatedReservation }),
    });

    const result = await updateReservationStatus(service, {
      id: 'res-1',
      status: 'collected',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.item.status).toBe('collected');
    }
  });

  it('passes command to service correctly', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ item: sampleReservation });
    const service = createMockService({
      updateReservationStatus: mockUpdate,
    });

    await updateReservationStatus(service, {
      id: 'res-1',
      status: 'collected',
    });

    expect(mockUpdate).toHaveBeenCalledWith('res-1', { status: 'collected' });
  });

  it('can update to returned status', async () => {
    const returnedReservation: Reservation = {
      ...sampleReservation,
      status: 'returned',
      returnedAt: new Date('2025-01-05'),
    };
    const service = createMockService({
      updateReservationStatus: vi.fn().mockResolvedValue({ item: returnedReservation }),
    });

    const result = await updateReservationStatus(service, {
      id: 'res-1',
      status: 'returned',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.item.status).toBe('returned');
      expect(result.item.returnedAt).toBeDefined();
    }
  });

  it('returns error messages when service throws', async () => {
    const service = createMockService({
      updateReservationStatus: vi.fn().mockRejectedValue(new Error('Not found')),
    });

    const result = await updateReservationStatus(service, {
      id: 'res-1',
      status: 'collected',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['Not found']);
    }
  });

  it('returns default error message for non-Error exceptions', async () => {
    const service = createMockService({
      updateReservationStatus: vi.fn().mockRejectedValue('Unknown error'),
    });

    const result = await updateReservationStatus(service, {
      id: 'res-1',
      status: 'collected',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['Failed to update reservation status']);
    }
  });
});
