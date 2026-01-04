import type { ReservationService, UpdateReservationStatusInput, Reservation } from './reservation-service';

export type UpdateReservationStatusCommand = {
  id: string;
  status: UpdateReservationStatusInput['status'];
};

export type UpdateReservationStatusResult =
  | { success: true; item: Reservation }
  | { success: false; errors: string[] };

export async function updateReservationStatus(
  service: ReservationService,
  command: UpdateReservationStatusCommand
): Promise<UpdateReservationStatusResult> {
  try {
    const output = await service.updateReservationStatus(command.id, { status: command.status });
    return { success: true, item: output.item };
  } catch (err: unknown) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : 'Failed to update reservation status'],
    };
  }
}
