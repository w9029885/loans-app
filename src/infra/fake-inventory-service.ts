import type {
  Device,
  InventoryService,
  ListDevicesOutput,
  AddDeviceInput,
  AddDeviceOutput,
} from '../app/inventory-service';

export class FakeInventoryService implements InventoryService {
  private items: Device[];
  private idCounter: number;

  constructor(initial: ReadonlyArray<Device> = []) {
    this.items = [...initial];
    this.idCounter = initial.length;
  }

  async listInventoryItems(): Promise<ListDevicesOutput> {
    return {
      items: [...this.items],
      totalCount: this.items.length,
    };
  }

  async addInventoryItem(input: AddDeviceInput): Promise<AddDeviceOutput> {
    const item: Device = {
      id: this.nextId(),
      name: input.name,
      description: input.description,
      count: input.count ?? 1,
      updatedAt: new Date(),
    };
    this.items.unshift(item);
    return { item };
  }

  async updateInventoryItem(
    id: string,
    input: Partial<AddDeviceInput>,
  ): Promise<AddDeviceOutput> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Device with id ${id} not found`);
    }
    const existing = this.items[index]!;
    const updated: Device = {
      id: existing.id,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      count: input.count ?? existing.count,
      updatedAt: new Date(),
    };
    this.items[index] = updated;
    return { item: updated };
  }

  async deleteInventoryItem(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Device with id ${id} not found`);
    }
    this.items.splice(index, 1);
  }

  private nextId(): string {
    this.idCounter += 1;
    return `dev_${this.idCounter}`;
  }
}
