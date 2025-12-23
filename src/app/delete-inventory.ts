import type { InventoryService } from './inventory-service';

export type DeleteInventoryResult =
  | { success: true }
  | { success: false; errors: readonly string[] };

export type DeleteInventoryCommand = {
  readonly id: string;
};

export type DeleteInventoryUseCase = (
  service: InventoryService,
  command: DeleteInventoryCommand,
) => Promise<DeleteInventoryResult>;

export const deleteInventory: DeleteInventoryUseCase = async (service, command) => {
  try {
    await service.deleteInventoryItem(command.id);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [message] };
  }
};
