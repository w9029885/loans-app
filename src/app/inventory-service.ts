export type Device = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly count?: number;
  readonly updatedAt: Date;
};

export type ListDevicesOutput = {
  readonly items: readonly Device[];
  readonly totalCount: number;
};

export type AddDeviceInput = {
  readonly name: string;
  readonly description: string;
  readonly count?: number;
};

export type AddDeviceOutput = {
  readonly item: Device;
};

export interface InventoryService {
  listInventoryItems(): Promise<ListDevicesOutput>;
  addInventoryItem(input: AddDeviceInput): Promise<AddDeviceOutput>;
  updateInventoryItem(id: string, input: Partial<AddDeviceInput>): Promise<AddDeviceOutput>;
  deleteInventoryItem(id: string): Promise<void>;
}
