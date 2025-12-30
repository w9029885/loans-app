import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { inject } from 'vue';
import { useInventory } from './use-inventory';
import type { InventoryUses } from '@/config/appServices';
import type { Device } from '@/app/inventory-service';

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue');
  return {
    ...actual,
    inject: vi.fn(),
  };
});

const device = (overrides: Partial<Device> = {}): Device => ({
  id: 'dev-1',
  name: 'Laptop',
  description: 'Dell XPS',
  count: 5,
  updatedAt: new Date('2025-01-01'),
  ...overrides,
});

describe('useInventory', () => {
  const injectMock = inject as unknown as vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    injectMock.mockReset();
  });

  it('throws when inventory services are not provided', () => {
    injectMock.mockReturnValue(undefined);
    expect(() => useInventory()).toThrow('Inventory not provided');
  });

  it('fetches items successfully', async () => {
    const items = [device({ id: 'dev-1' }), device({ id: 'dev-2', name: 'Monitor' })];
    const uses: InventoryUses = {
      listInventory: vi.fn().mockResolvedValue({ success: true, items, totalCount: 2 }),
      addInventory: vi.fn(),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    expect(inv.loading.value).toBe(false);

    await inv.fetchItems();

    expect(inv.loading.value).toBe(false);
    expect(inv.error.value).toBe(null);
    expect(inv.items.value).toEqual(items);
    expect(inv.totalCount.value).toBe(2);
    expect(uses.listInventory).toHaveBeenCalledTimes(1);
  });

  it('sets error when fetch fails from use case', async () => {
    const uses: InventoryUses = {
      listInventory: vi.fn().mockResolvedValue({ success: false, errors: ['boom'] }),
      addInventory: vi.fn(),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    await inv.fetchItems();

    expect(inv.error.value).toBe('boom');
    expect(inv.items.value).toEqual([]);
    expect(inv.totalCount.value).toBe(0);
  });

  it('sets error when fetch throws', async () => {
    const uses: InventoryUses = {
      listInventory: vi.fn().mockRejectedValue(new Error('network down')),
      addInventory: vi.fn(),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    await inv.fetchItems();

    expect(inv.error.value).toBe('network down');
    expect(inv.items.value).toEqual([]);
    expect(inv.totalCount.value).toBe(0);
  });

  it('skips fetch when already loading', async () => {
    const uses: InventoryUses = {
      listInventory: vi.fn(),
      addInventory: vi.fn(),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    inv.loading.value = true;

    await inv.fetchItems();

    expect(uses.listInventory).not.toHaveBeenCalled();
    expect(inv.loading.value).toBe(true);
  });

  it('adds item successfully and updates totals', async () => {
    const newItem = device({ id: 'dev-new', count: 3 });
    const uses: InventoryUses = {
      listInventory: vi.fn(),
      addInventory: vi.fn().mockResolvedValue({ success: true, item: newItem }),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    inv.items.value = [device({ id: 'existing', count: 4 })];
    inv.totalCount.value = 1;

    await inv.addItem({ name: 'Laptop', description: 'desc', count: 3 });

    expect(inv.error.value).toBe(null);
    expect(inv.items.value[0]).toEqual(newItem);
    expect(inv.totalCount.value).toBe(2);
  });

  it('sets error when add fails', async () => {
    const uses: InventoryUses = {
      listInventory: vi.fn(),
      addInventory: vi.fn().mockResolvedValue({ success: false, errors: ['invalid'] }),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    await inv.addItem({ name: 'Laptop', description: 'desc', count: 1 });

    expect(inv.error.value).toBe('invalid');
    expect(inv.items.value).toEqual([]);
  });

  it('skips add when already adding', async () => {
    const uses: InventoryUses = {
      listInventory: vi.fn(),
      addInventory: vi.fn(),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    inv.adding.value = true;

    await inv.addItem({ name: 'Laptop', description: 'desc' });

    expect(uses.addInventory).not.toHaveBeenCalled();
  });

  it('updates item successfully', async () => {
    const updated = device({ id: 'dev-1', name: 'Updated' });
    const uses: InventoryUses = {
      listInventory: vi.fn(),
      addInventory: vi.fn(),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn().mockResolvedValue({ success: true, item: updated }),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    inv.items.value = [device({ id: 'dev-1', name: 'Old' }), device({ id: 'dev-2' })];

    await inv.updateItem({ id: 'dev-1', name: 'Updated' });

    expect(inv.items.value[0]).toEqual(updated);
    expect(inv.error.value).toBe(null);
  });

  it('sets error when update fails', async () => {
    const uses: InventoryUses = {
      listInventory: vi.fn(),
      addInventory: vi.fn(),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn().mockResolvedValue({ success: false, errors: ['bad update'] }),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    inv.items.value = [device({ id: 'dev-1' })];

    await inv.updateItem({ id: 'dev-1', name: 'Updated' });

    expect(inv.error.value).toBe('bad update');
    expect(inv.items.value[0].name).toBe('Laptop');
  });

  it('deletes item successfully and updates totals', async () => {
    const uses: InventoryUses = {
      listInventory: vi.fn(),
      addInventory: vi.fn(),
      deleteInventory: vi.fn().mockResolvedValue({ success: true }),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    inv.items.value = [device({ id: 'dev-1' }), device({ id: 'dev-2' })];
    inv.totalCount.value = 2;

    await inv.deleteItem({ id: 'dev-1' });

    expect(inv.items.value).toHaveLength(1);
    expect(inv.items.value[0].id).toBe('dev-2');
    expect(inv.totalCount.value).toBe(1);
    expect(inv.error.value).toBe(null);
  });

  it('sets error when delete fails', async () => {
    const uses: InventoryUses = {
      listInventory: vi.fn(),
      addInventory: vi.fn(),
      deleteInventory: vi.fn().mockResolvedValue({ success: false, errors: ['cannot delete'] }),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    inv.items.value = [device({ id: 'dev-1' })];
    inv.totalCount.value = 1;

    await inv.deleteItem({ id: 'dev-1' });

    expect(inv.error.value).toBe('cannot delete');
    expect(inv.items.value).toHaveLength(1);
    expect(inv.totalCount.value).toBe(1);
  });

  it('skips delete when already deleting', async () => {
    const uses: InventoryUses = {
      listInventory: vi.fn(),
      addInventory: vi.fn(),
      deleteInventory: vi.fn(),
      updateInventory: vi.fn(),
    };
    injectMock.mockReturnValue(uses);

    const inv = useInventory();
    inv.deleting.value = true;

    await inv.deleteItem({ id: 'dev-1' });

    expect(uses.deleteInventory).not.toHaveBeenCalled();
  });
});
