import type { InventoryService } from '../app/inventory-service';
import { listInventory } from '../app/list-inventory';
import type { ListInventoryResult } from '../app/list-inventory';
import { addInventory } from '../app/add-inventory';
import type {
  AddInventoryCommand,
  AddInventoryResult,
} from '../app/add-inventory';
import { deleteInventory } from '../app/delete-inventory';
import type {
  DeleteInventoryCommand,
  DeleteInventoryResult,
} from '../app/delete-inventory';
import { updateInventory } from '../app/update-inventory';
import type {
  UpdateInventoryCommand,
  UpdateInventoryResult,
} from '../app/update-inventory';
import { FakeInventoryService } from '../infra/fake-inventory-service';
import { HttpInventoryService } from '../infra/http-inventory-service';
import { seedItems } from '../seed/items';

let _inventoryService: InventoryService | undefined;

// Env-controlled service selection for inventory
// - VITE_INVENTORY_SERVICE: 'fake' | 'http' (optional)
// - VITE_INVENTORY_BASE_URL: string (optional)
// - VITE_USE_SEED_DATA: 'true' | 'false' (optional, defaults to false)
function createInventoryServiceFromEnv(): InventoryService {
  const env = import.meta.env as Record<string, string | undefined>;
  const kind = (env.VITE_INVENTORY_SERVICE || '').toLowerCase();
  const baseUrl = env.VITE_INVENTORY_BASE_URL;
  const useSeedData = env.VITE_USE_SEED_DATA === 'true';

  if (kind === 'fake') {
    return new FakeInventoryService(useSeedData ? seedItems : []);
  }
  if (kind === 'http') return new HttpInventoryService({ baseUrl });

  if (baseUrl) return new HttpInventoryService({ baseUrl });
  return new FakeInventoryService(useSeedData ? seedItems : []);
}

export function getInventoryService(): InventoryService {
  if (!_inventoryService) {
    _inventoryService = createInventoryServiceFromEnv();
  }
  return _inventoryService;
}

export function setInventoryService(service: InventoryService): void {
  _inventoryService = service;
}

export function makeListInventory(): () => Promise<ListInventoryResult> {
  const service = getInventoryService();
  return () => listInventory(service);
}

export function makeAddInventory(): (
  command: AddInventoryCommand,
) => Promise<AddInventoryResult> {
  const service = getInventoryService();
  return (command: AddInventoryCommand) => addInventory(service, command);
}

export function makeDeleteInventory(): (
  command: DeleteInventoryCommand,
) => Promise<DeleteInventoryResult> {
  const service = getInventoryService();
  return (command: DeleteInventoryCommand) => deleteInventory(service, command);
}

export function makeUpdateInventory(): (
  command: UpdateInventoryCommand,
) => Promise<UpdateInventoryResult> {
  const service = getInventoryService();
  return (command: UpdateInventoryCommand) => updateInventory(service, command);
}

export type InventoryUses = {
  listInventory: () => Promise<ListInventoryResult>;
  addInventory: (command: AddInventoryCommand) => Promise<AddInventoryResult>;
  deleteInventory: (
    command: DeleteInventoryCommand,
  ) => Promise<DeleteInventoryResult>;
  updateInventory: (
    command: UpdateInventoryCommand,
  ) => Promise<UpdateInventoryResult>;
};

export function buildInventoryUses(): InventoryUses {
  return {
    listInventory: makeListInventory(),
    addInventory: makeAddInventory(),
    deleteInventory: makeDeleteInventory(),
    updateInventory: makeUpdateInventory(),
  };
}

export const INVENTORY_KEY = 'Inventory' as const;

//small change
