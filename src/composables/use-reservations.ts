import { inject, ref, type Ref } from 'vue';
import { RESERVATION_KEY, type ReservationUses } from '@/config/appServices';
import type { Reservation, ReservationStatus } from '@/app/reservation-service';
import type { CreateReservationCommand } from '@/app/create-reservation';
import type { UpdateReservationStatusCommand } from '@/app/update-reservation-status';
import type { DeleteReservationCommand } from '@/app/delete-reservation';
import { useTelemetry } from '@/composables/useTelemetry';

export type UseReservations = {
  readonly items: Ref<readonly Reservation[]>;
  readonly totalCount: Ref<number>;
  readonly loading: Ref<boolean>;
  readonly creating: Ref<boolean>;
  readonly deleting: Ref<boolean>;
  readonly updating: Ref<boolean>;
  readonly error: Ref<string | null>;
  fetchItems: (statusFilter?: ReservationStatus[]) => Promise<void>;
  createItem: (command: CreateReservationCommand) => Promise<void>;
  updateStatus: (command: UpdateReservationStatusCommand) => Promise<void>;
  deleteItem: (command: DeleteReservationCommand) => Promise<void>;
};

export function useReservations(): UseReservations {
  const uses = inject<ReservationUses>(RESERVATION_KEY);
  if (!uses) throw new Error('Reservations not provided');

  const telemetry = useTelemetry();

  const items = ref<readonly Reservation[]>([]);
  const totalCount = ref(0);
  const loading = ref(false);
  const creating = ref(false);
  const deleting = ref(false);
  const updating = ref(false);
  const error = ref<string | null>(null);

  const fetchItems = async (statusFilter?: ReservationStatus[]): Promise<void> => {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      const result = await uses.listReservations(statusFilter);
      if (result.success) {
        items.value = result.items;
        totalCount.value = result.totalCount;
      } else {
        error.value = result.errors.join('; ');
        items.value = [];
        totalCount.value = 0;
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      items.value = [];
      totalCount.value = 0;
      telemetry.trackException(
        e instanceof Error ? e : new Error(String(e)),
        { operation: 'fetchReservations' },
      );
    } finally {
      loading.value = false;
    }
  };

  const create = async (command: CreateReservationCommand): Promise<void> => {
    if (creating.value) return;
    creating.value = true;
    error.value = null;
    try {
      const result = await uses.createReservation(command);
      if (result.success) {
        items.value = [result.item, ...items.value];
        totalCount.value = Math.max(totalCount.value + 1, items.value.length);
      } else {
        error.value = result.errors.join('; ');
        telemetry.trackEvent('reservation_create_failed_ui', {
          errors: result.errors.join('; '),
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      telemetry.trackException(
        e instanceof Error ? e : new Error(String(e)),
        { operation: 'createReservation' },
      );
    } finally {
      creating.value = false;
    }
  };

  const updateStatusFn = async (command: UpdateReservationStatusCommand): Promise<void> => {
    if (updating.value) return;
    updating.value = true;
    error.value = null;
    try {
      const result = await uses.updateReservationStatus(command);
      if (result.success) {
        items.value = items.value.map((i) =>
          i.id === result.item.id ? result.item : i,
        );
      } else {
        error.value = result.errors.join('; ');
        telemetry.trackEvent('reservation_update_failed_ui', {
          errors: result.errors.join('; '),
          id: command.id,
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      telemetry.trackException(
        e instanceof Error ? e : new Error(String(e)),
        { operation: 'updateReservationStatus', id: command.id },
      );
    } finally {
      updating.value = false;
    }
  };

  const remove = async (command: DeleteReservationCommand): Promise<void> => {
    if (deleting.value) return;
    deleting.value = true;
    error.value = null;
    try {
      const result = await uses.deleteReservation(command);
      if (result.success) {
        items.value = items.value.filter((i) => i.id !== command.id);
        totalCount.value = Math.max(totalCount.value - 1, items.value.length);
      } else {
        error.value = result.errors.join('; ');
        telemetry.trackEvent('reservation_delete_failed_ui', {
          errors: result.errors.join('; '),
          id: command.id,
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      telemetry.trackException(
        e instanceof Error ? e : new Error(String(e)),
        { operation: 'deleteReservation', id: command.id },
      );
    } finally {
      deleting.value = false;
    }
  };

  return {
    items,
    totalCount,
    loading,
    creating,
    deleting,
    updating,
    error,
    fetchItems,
    createItem: create,
    updateStatus: updateStatusFn,
    deleteItem: remove,
  };
}
