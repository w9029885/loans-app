import type {
  InventoryService,
  AddDeviceInput,
  Device,
} from './inventory-service';

export type AddInventoryResult =
  | { success: true; item: Device }
  | { success: false; errors: readonly string[] };

export type AddInventoryCommand = {
  readonly name: string;
  readonly description: string;
  readonly count?: number;
};

export type AddInventoryUseCase = (
  service: InventoryService,
  command: AddInventoryCommand,
) => Promise<AddInventoryResult>;

export const addInventory: AddInventoryUseCase = async (service, command) => {
  try {
    const input: AddDeviceInput = {
      name: command.name,
      description: command.description,
      count: command.count ?? 1,
    };
    const { item } = await service.addInventoryItem(input);
    return { success: true, item };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, errors: [message] };
  }
};
