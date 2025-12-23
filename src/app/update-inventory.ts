import type { InventoryService, Device, AddDeviceInput } from './inventory-service';

export type UpdateInventoryResult =
  | { success: true; item: Device }
  | { success: false; errors: readonly string[] };

export type UpdateInventoryCommand = {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
  readonly count?: number;
};

export type UpdateInventoryUseCase = (
  service: InventoryService,
  command: UpdateInventoryCommand,
) => Promise<UpdateInventoryResult>;

export const updateInventory: UpdateInventoryUseCase = async (
  service,
  command,
) => {
  try {
    const input: Partial<AddDeviceInput> = {};
    if (command.name !== undefined) (input as any).name = command.name;
    if (command.description !== undefined) (input as any).description = command.description;
    if (command.count !== undefined) (input as any).count = command.count;

    const { item } = await service.updateInventoryItem(command.id, input);
    return { success: true, item };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [message] };
  }
};
