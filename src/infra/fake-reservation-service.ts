import type {
  ReservationService,
  ListReservationsOutput,
  CreateReservationInput,
  CreateReservationOutput,
  UpdateReservationStatusInput,
  UpdateReservationStatusOutput,
  Reservation,
  ReservationStatus,
} from '../app/reservation-service';

/**
 * Fake in-memory implementation of ReservationService for tests.
 */
export class FakeReservationService implements ReservationService {
  private items: Reservation[] = [];
  private nextId = 1;

  constructor(initial: Reservation[] = []) {
    this.items = initial.map((r) => ({ ...r }));
  }

  async listReservations(statusFilter?: ReservationStatus[]): Promise<ListReservationsOutput> {
    let filtered = [...this.items];
    
    if (statusFilter && statusFilter.length > 0) {
      filtered = filtered.filter((r) => statusFilter.includes(r.status));
    }

    return {
      items: filtered,
      totalCount: filtered.length,
    };
  }

  async createReservation(input: CreateReservationInput): Promise<CreateReservationOutput> {
    const now = new Date();
    const newItem: Reservation = {
      id: `res-${this.nextId++}`,
      userId: 'test-user-id',
      deviceModelId: input.deviceModelId,
      deviceModelName: input.deviceModelName,
      status: 'reserved',
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(newItem);
    return { item: newItem };
  }

  async updateReservationStatus(
    id: string,
    input: UpdateReservationStatusInput
  ): Promise<UpdateReservationStatusOutput> {
    const item = this.items.find((r) => r.id === id);
    if (!item) {
      throw new Error(`Reservation ${id} not found`);
    }
    const now = new Date();
    const updated: Reservation = {
      ...item,
      status: input.status,
      updatedAt: now,
      collectedAt: input.status === 'collected' ? now : item.collectedAt,
      returnedAt: input.status === 'returned' ? now : item.returnedAt,
    };
    const index = this.items.findIndex((r) => r.id === id);
    this.items[index] = updated;
    return { item: updated };
  }

  async deleteReservation(id: string): Promise<void> {
    const index = this.items.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error(`Reservation ${id} not found`);
    }
    this.items.splice(index, 1);
  }
}
