import type { ReservationService } from './reservation-service';

export type DeleteReservationCommand = {
  id: string;
};

export type DeleteReservationResult =
  | { success: true }
  | { success: false; errors: string[] };

export async function deleteReservation(
  service: ReservationService,
  command: DeleteReservationCommand
): Promise<DeleteReservationResult> {
  try {
    await service.deleteReservation(command.id);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : 'Failed to delete reservation'],
    };
  }
}
