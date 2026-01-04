export type ReservationStatus = 'reserved' | 'collected' | 'returned';

export type Reservation = {
  readonly id: string;
  readonly userId: string;
  readonly deviceModelId: string;
  readonly deviceModelName: string;
  readonly status: ReservationStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly collectedAt?: Date;
  readonly returnedAt?: Date;
};

export type ListReservationsOutput = {
  readonly items: readonly Reservation[];
  readonly totalCount: number;
};

export type CreateReservationInput = {
  readonly deviceModelId: string;
  readonly deviceModelName: string;
};

export type CreateReservationOutput = {
  readonly item: Reservation;
};

export type UpdateReservationStatusInput = {
  readonly status: ReservationStatus;
};

export type UpdateReservationStatusOutput = {
  readonly item: Reservation;
};

export interface ReservationService {
  listReservations(statusFilter?: ReservationStatus[]): Promise<ListReservationsOutput>;
  createReservation(input: CreateReservationInput): Promise<CreateReservationOutput>;
  updateReservationStatus(id: string, input: UpdateReservationStatusInput): Promise<UpdateReservationStatusOutput>;
  deleteReservation(id: string): Promise<void>;
}
