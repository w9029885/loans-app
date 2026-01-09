import { describe, it, expect } from 'vitest';
import { FakeReservationService } from './fake-reservation-service';
import type { Reservation } from '../app/reservation-service';

const createTestReservation = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 'res-1',
  userId: 'user-1',
  deviceModelId: 'device-1',
  deviceModelName: 'Laptop',
  status: 'reserved',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

describe('FakeReservationService', () => {
  describe('listReservations', () => {
    it('should return all reservations when no filter provided', async () => {
      const reservations = [
        createTestReservation({ id: 'res-1', status: 'reserved' }),
        createTestReservation({ id: 'res-2', status: 'collected' }),
      ];
      const service = new FakeReservationService(reservations);

      const result = await service.listReservations();

      expect(result.items).toHaveLength(2);
      expect(result.totalCount).toBe(2);
    });

    it('should filter by status when provided', async () => {
      const reservations = [
        createTestReservation({ id: 'res-1', status: 'reserved' }),
        createTestReservation({ id: 'res-2', status: 'collected' }),
        createTestReservation({ id: 'res-3', status: 'returned' }),
      ];
      const service = new FakeReservationService(reservations);

      const result = await service.listReservations(['reserved', 'collected']);

      expect(result.items).toHaveLength(2);
      expect(result.items.map(r => r.status).sort()).toEqual(['collected', 'reserved']);
    });

    it('should return empty array when no reservations', async () => {
      const service = new FakeReservationService([]);

      const result = await service.listReservations();

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('createReservation', () => {
    it('should create a new reservation', async () => {
      const service = new FakeReservationService([]);

      const result = await service.createReservation({
        deviceModelId: 'device-1',
        deviceModelName: 'Laptop',
      });

      expect(result.item.deviceModelId).toBe('device-1');
      expect(result.item.deviceModelName).toBe('Laptop');
      expect(result.item.status).toBe('reserved');
      expect(result.item.id).toBeDefined();
    });

    it('should add reservation to the list', async () => {
      const service = new FakeReservationService([]);

      await service.createReservation({
        deviceModelId: 'device-1',
        deviceModelName: 'Laptop',
      });

      const list = await service.listReservations();
      expect(list.items).toHaveLength(1);
    });
  });

  describe('updateReservationStatus', () => {
    it('should update status to collected', async () => {
      const service = new FakeReservationService([
        createTestReservation({ id: 'res-1', status: 'reserved' }),
      ]);

      const result = await service.updateReservationStatus('res-1', { status: 'collected' });

      expect(result.item.status).toBe('collected');
      expect(result.item.collectedAt).toBeDefined();
    });

    it('should update status to returned', async () => {
      const service = new FakeReservationService([
        createTestReservation({ id: 'res-1', status: 'collected' }),
      ]);

      const result = await service.updateReservationStatus('res-1', { status: 'returned' });

      expect(result.item.status).toBe('returned');
      expect(result.item.returnedAt).toBeDefined();
    });

    it('should throw when reservation not found', async () => {
      const service = new FakeReservationService([]);

      await expect(
        service.updateReservationStatus('nonexistent', { status: 'collected' })
      ).rejects.toThrow('Reservation nonexistent not found');
    });
  });

  describe('deleteReservation', () => {
    it('should delete a reservation', async () => {
      const service = new FakeReservationService([
        createTestReservation({ id: 'res-1' }),
      ]);

      await service.deleteReservation('res-1');

      const list = await service.listReservations();
      expect(list.items).toHaveLength(0);
    });

    it('should throw when reservation not found', async () => {
      const service = new FakeReservationService([]);

      await expect(service.deleteReservation('nonexistent')).rejects.toThrow(
        'Reservation nonexistent not found'
      );
    });
  });
});
