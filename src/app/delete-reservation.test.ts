import { describe, it, expect, vi } from 'vitest';
import { deleteReservation } from './delete-reservation';
import type { ReservationService } from './reservation-service';

describe('deleteReservation', () => {
  const createMockService = (overrides: Partial<ReservationService> = {}): ReservationService => ({
    listReservations: vi.fn(),
    createReservation: vi.fn(),
    updateReservationStatus: vi.fn(),
    deleteReservation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  it('returns success when service succeeds', async () => {
    const service = createMockService();

    const result = await deleteReservation(service, { id: 'res-1' });

    expect(result.success).toBe(true);
  });

  it('passes id to service correctly', async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    const service = createMockService({
      deleteReservation: mockDelete,
    });

    await deleteReservation(service, { id: 'res-123' });

    expect(mockDelete).toHaveBeenCalledWith('res-123');
  });

  it('returns error messages when service throws', async () => {
    const service = createMockService({
      deleteReservation: vi.fn().mockRejectedValue(new Error('Reservation not found')),
    });

    const result = await deleteReservation(service, { id: 'res-1' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['Reservation not found']);
    }
  });

  it('returns default error message for non-Error exceptions', async () => {
    const service = createMockService({
      deleteReservation: vi.fn().mockRejectedValue('Unknown error'),
    });

    const result = await deleteReservation(service, { id: 'res-1' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['Failed to delete reservation']);
    }
  });
});
