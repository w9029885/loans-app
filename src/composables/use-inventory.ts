import { inject, ref, type Ref } from 'vue';
import { INVENTORY_KEY, type InventoryUses } from '@/config/appServices';
import type { Device } from '@/app/inventory-service';
import type { AddInventoryCommand } from '@/app/add-inventory';
import type { UpdateInventoryCommand } from '@/app/update-inventory';
import type { DeleteInventoryCommand } from '@/app/delete-inventory';
import { useTelemetry } from '@/composables/useTelemetry';

export type UseInventory = {
  readonly items: Ref<readonly Device[]>;
  readonly totalCount: Ref<number>;
  readonly loading: Ref<boolean>;
  readonly adding: Ref<boolean>;
  readonly deleting: Ref<boolean>;
  readonly updating: Ref<boolean>;
  readonly error: Ref<string | null>;
  fetchItems: () => Promise<void>;
  addItem: (command: AddInventoryCommand) => Promise<void>;
  updateItem: (command: UpdateInventoryCommand) => Promise<void>;
  deleteItem: (command: DeleteInventoryCommand) => Promise<void>;
};

export function useInventory(): UseInventory {
  const uses = inject<InventoryUses>(INVENTORY_KEY);
  if (!uses) throw new Error('Inventory not provided');

  const telemetry = useTelemetry();

  const items = ref<readonly Device[]>([]);
  const totalCount = ref(0);
  const loading = ref(false);
  const adding = ref(false);
  const deleting = ref(false);
  const updating = ref(false);
  const error = ref<string | null>(null);

  const fetchItems = async (): Promise<void> => {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      const result = await uses.listInventory();
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
        { operation: 'fetchItems' },
      );
    } finally {
      loading.value = false;
    }
  };

  const add = async (command: AddInventoryCommand): Promise<void> => {
    if (adding.value) return;
    adding.value = true;
    error.value = null;
    try {
      const result = await uses.addInventory(command);
      if (result.success) {
        items.value = [result.item, ...items.value];
        totalCount.value = Math.max(totalCount.value + 1, items.value.length);
      } else {
        error.value = result.errors.join('; ');
        telemetry.trackEvent('inventory_add_failed_ui', {
          errors: result.errors.join('; '),
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      telemetry.trackException(
        e instanceof Error ? e : new Error(String(e)),
        { operation: 'addItem' },
      );
    } finally {
      adding.value = false;
    }
  };

  const update = async (command: UpdateInventoryCommand): Promise<void> => {
    if (updating.value) return;
    updating.value = true;
    error.value = null;
    try {
      const result = await uses.updateInventory(command);
      if (result.success) {
        items.value = items.value.map((i) =>
          i.id === result.item.id ? result.item : i,
        );
      } else {
        error.value = result.errors.join('; ');
        telemetry.trackEvent('inventory_update_failed_ui', {
          errors: result.errors.join('; '),
          id: command.id,
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      telemetry.trackException(
        e instanceof Error ? e : new Error(String(e)),
        { operation: 'updateItem', id: command.id },
      );
    } finally {
      updating.value = false;
    }
  };

  const remove = async (command: DeleteInventoryCommand): Promise<void> => {
    if (deleting.value) return;
    deleting.value = true;
    error.value = null;
    try {
      const result = await uses.deleteInventory(command);
      if (result.success) {
        items.value = items.value.filter((i) => i.id !== command.id);
        totalCount.value = Math.max(totalCount.value - 1, items.value.length);
      } else {
        error.value = result.errors.join('; ');
        telemetry.trackEvent('inventory_delete_failed_ui', {
          errors: result.errors.join('; '),
          id: command.id,
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      telemetry.trackException(
        e instanceof Error ? e : new Error(String(e)),
        { operation: 'deleteItem', id: command.id },
      );
    } finally {
      deleting.value = false;
    }
  };

  return {
    items,
    totalCount,
    loading,
    adding,
    deleting,
    updating,
    error,
    fetchItems,
    addItem: add,
    updateItem: update,
    deleteItem: remove,
  };
}
