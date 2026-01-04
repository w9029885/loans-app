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
import { useTelemetry } from '../composables/useTelemetry';

import type { ReservationService } from '../app/reservation-service';
import { listReservations } from '../app/list-reservations';
import type { ListReservationsResult, ReservationStatus } from '../app/list-reservations';
import { createReservation } from '../app/create-reservation';
import type {
  CreateReservationCommand,
  CreateReservationResult,
} from '../app/create-reservation';
import { deleteReservation } from '../app/delete-reservation';
import type {
  DeleteReservationCommand,
  DeleteReservationResult,
} from '../app/delete-reservation';
import { updateReservationStatus } from '../app/update-reservation-status';
import type {
  UpdateReservationStatusCommand,
  UpdateReservationStatusResult,
} from '../app/update-reservation-status';
import { HttpReservationService } from '../infra/http-reservation-service';

let _inventoryService: InventoryService | undefined;
let _reservationService: ReservationService | undefined;

export type BuildInventoryUsesOptions = {
  /** Optional override for API base URL. Falls back to env. */
  apiBaseUrl?: string;
  /** Optional provider for an access token to add to API calls. */
  authTokenProvider?: () => Promise<string | null>;
};

// Env-controlled service selection for inventory
// - VITE_INVENTORY_SERVICE: 'fake' | 'http' (optional)
// - VITE_INVENTORY_BASE_URL: string (optional)
// - VITE_USE_SEED_DATA: 'true' | 'false' (optional, defaults to false)
function createInventoryServiceFromEnv(
  options: BuildInventoryUsesOptions = {},
): InventoryService {
  const env = import.meta.env as Record<string, string | undefined>;
  const kind = (env.VITE_INVENTORY_SERVICE || '').toLowerCase();
  const baseUrl = options.apiBaseUrl || env.VITE_INVENTORY_BASE_URL;
  const useSeedData = env.VITE_USE_SEED_DATA === 'true';

  console.log('[appServices] Creating inventory service:', { kind, baseUrl, hasAuthProvider: !!options.authTokenProvider });

  if (kind === 'fake') {
    return new FakeInventoryService(useSeedData ? seedItems : []);
  }
  if (kind === 'http')
    return new HttpInventoryService({
      baseUrl,
      authTokenProvider: options.authTokenProvider,
      telemetry: useTelemetry(),
    });

  if (baseUrl)
    return new HttpInventoryService({
      baseUrl,
      authTokenProvider: options.authTokenProvider,
      telemetry: useTelemetry(),
    });
  return new FakeInventoryService(useSeedData ? seedItems : []);
}

export function getInventoryService(
  options: BuildInventoryUsesOptions = {},
): InventoryService {
  if (!_inventoryService) {
    _inventoryService = createInventoryServiceFromEnv(options);
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

export function buildInventoryUses(
  options: BuildInventoryUsesOptions = {},
): InventoryUses {
  // Build with a service created using provided options so auth headers can flow through.
  _inventoryService = createInventoryServiceFromEnv(options);
  return {
    listInventory: makeListInventory(),
    addInventory: makeAddInventory(),
    deleteInventory: makeDeleteInventory(),
    updateInventory: makeUpdateInventory(),
  };
}

export const INVENTORY_KEY = 'Inventory' as const;

// ============================================================
// Reservation Service Configuration
// ============================================================

export type BuildReservationUsesOptions = {
  /** Optional override for API base URL. Falls back to env. */
  apiBaseUrl?: string;
  /** Optional provider for an access token to add to API calls. */
  authTokenProvider?: () => Promise<string | null>;
};

function createReservationServiceFromEnv(
  options: BuildReservationUsesOptions = {},
): ReservationService {
  const env = import.meta.env as Record<string, string | undefined>;
  const baseUrl = options.apiBaseUrl || env.VITE_RESERVATION_BASE_URL;
  
  return new HttpReservationService({
    baseUrl,
    authTokenProvider: options.authTokenProvider,
    telemetry: useTelemetry(),
  });
}

export function getReservationService(
  options: BuildReservationUsesOptions = {},
): ReservationService {
  if (!_reservationService) {
    _reservationService = createReservationServiceFromEnv(options);
  }
  return _reservationService;
}

export function setReservationService(service: ReservationService): void {
  _reservationService = service;
}

export function makeListReservations(): (
  statusFilter?: ReservationStatus[]
) => Promise<ListReservationsResult> {
  const service = getReservationService();
  return (statusFilter?: ReservationStatus[]) => listReservations(service, statusFilter);
}

export function makeCreateReservation(): (
  command: CreateReservationCommand,
) => Promise<CreateReservationResult> {
  const service = getReservationService();
  return (command: CreateReservationCommand) => createReservation(service, command);
}

export function makeDeleteReservation(): (
  command: DeleteReservationCommand,
) => Promise<DeleteReservationResult> {
  const service = getReservationService();
  return (command: DeleteReservationCommand) => deleteReservation(service, command);
}

export function makeUpdateReservationStatus(): (
  command: UpdateReservationStatusCommand,
) => Promise<UpdateReservationStatusResult> {
  const service = getReservationService();
  return (command: UpdateReservationStatusCommand) => updateReservationStatus(service, command);
}

export type ReservationUses = {
  listReservations: (statusFilter?: ReservationStatus[]) => Promise<ListReservationsResult>;
  createReservation: (command: CreateReservationCommand) => Promise<CreateReservationResult>;
  deleteReservation: (command: DeleteReservationCommand) => Promise<DeleteReservationResult>;
  updateReservationStatus: (
    command: UpdateReservationStatusCommand,
  ) => Promise<UpdateReservationStatusResult>;
};

export function buildReservationUses(
  options: BuildReservationUsesOptions = {},
): ReservationUses {
  // Build with a service created using provided options so auth headers can flow through.
  _reservationService = createReservationServiceFromEnv(options);
  return {
    listReservations: makeListReservations(),
    createReservation: makeCreateReservation(),
    deleteReservation: makeDeleteReservation(),
    updateReservationStatus: makeUpdateReservationStatus(),
  };
}

export const RESERVATION_KEY = 'Reservation' as const;

//small change 2
