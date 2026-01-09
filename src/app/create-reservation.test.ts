import { describe, it, expect, vi } from 'vitest';
import { createReservation } from './create-reservation';
import type { ReservationService, Reservation } from './reservation-service';

describe('createReservation', () => {
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
    createReservation: vi.fn().mockResolvedValue({ item: sampleReservation }),
    updateReservationStatus: vi.fn(),
    deleteReservation: vi.fn(),
    ...overrides,
  });

  it('returns success with created item when service succeeds', async () => {
    const service = createMockService();

    const result = await createReservation(service, {
      deviceModelId: 'device-1',
      deviceModelName: 'Laptop',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.item).toEqual(sampleReservation);
    }
  });

  it('passes command to service correctly', async () => {
    const mockCreateReservation = vi.fn().mockResolvedValue({ item: sampleReservation });
    const service = createMockService({
      createReservation: mockCreateReservation,
    });

    await createReservation(service, {
      deviceModelId: 'device-1',
      deviceModelName: 'Laptop',
    });

    expect(mockCreateReservation).toHaveBeenCalledWith({
      deviceModelId: 'device-1',
      deviceModelName: 'Laptop',
    });
  });

  it('returns error messages when service throws', async () => {
    const service = createMockService({
      createReservation: vi.fn().mockRejectedValue(new Error('Device unavailable')),
    });

    const result = await createReservation(service, {
      deviceModelId: 'device-1',
      deviceModelName: 'Laptop',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['Device unavailable']);
    }
  });

  it('returns default error message for non-Error exceptions', async () => {
    const service = createMockService({
      createReservation: vi.fn().mockRejectedValue('Unknown error'),
    });

    const result = await createReservation(service, {
      deviceModelId: 'device-1',
      deviceModelName: 'Laptop',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['Failed to create reservation']);
    }
  });
});
