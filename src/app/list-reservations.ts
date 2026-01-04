import type { ReservationService, ListReservationsOutput, ReservationStatus } from './reservation-service';

export type { ReservationStatus } from './reservation-service';

export type ListReservationsResult =
  | { success: true; items: ListReservationsOutput['items']; totalCount: number }
  | { success: false; errors: string[] };

export async function listReservations(
  service: ReservationService,
  statusFilter?: ReservationStatus[]
): Promise<ListReservationsResult> {
  try {
    const output = await service.listReservations(statusFilter);
    return {
      success: true,
      items: output.items,
      totalCount: output.totalCount,
    };
  } catch (err: unknown) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : 'Failed to list reservations'],
    };
  }
}
