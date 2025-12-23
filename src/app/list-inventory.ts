import type { InventoryService, Device } from './inventory-service';

export type ListInventoryResult =
  | { success: true; items: readonly Device[]; totalCount: number }
  | { success: false; errors: readonly string[] };

export type ListInventoryUseCase = (
  service: InventoryService,
) => Promise<ListInventoryResult>;

export const listInventory: ListInventoryUseCase = async (service) => {
  try {
    const { items, totalCount } = await service.listInventoryItems();
    return { success: true, items, totalCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [message] };
  }
};
