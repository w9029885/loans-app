import type { ReservationService, CreateReservationInput, Reservation } from './reservation-service';

export type CreateReservationCommand = CreateReservationInput;

export type CreateReservationResult =
  | { success: true; item: Reservation }
  | { success: false; errors: string[] };

export async function createReservation(
  service: ReservationService,
  command: CreateReservationCommand
): Promise<CreateReservationResult> {
  try {
    const output = await service.createReservation(command);
    return { success: true, item: output.item };
  } catch (err: unknown) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : 'Failed to create reservation'],
    };
  }
}
