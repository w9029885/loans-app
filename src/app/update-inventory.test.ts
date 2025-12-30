import { describe, it, expect, vi } from 'vitest';
import { updateInventory } from './update-inventory';
import type { InventoryService, Device } from './inventory-service';

describe('updateInventory', () => {
  const updatedItem: Device = {
    id: 'dev-1',
    name: 'Updated Name',
    description: 'Updated Description',
    count: 7,
    updatedAt: new Date('2025-04-01'),
  };

  it('updates inventory and returns item', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn(),
      addInventoryItem: vi.fn(),
      updateInventoryItem: vi.fn().mockResolvedValue({ item: updatedItem }),
      deleteInventoryItem: vi.fn(),
    };

    const result = await updateInventory(service, {
      id: 'dev-1',
      name: 'Updated Name',
      description: 'Updated Description',
      count: 7,
    });

    expect(result.success).toBe(true);
    expect(service.updateInventoryItem).toHaveBeenCalledWith('dev-1', {
      name: 'Updated Name',
      description: 'Updated Description',
      count: 7,
    });
    if (result.success) {
      expect(result.item).toEqual(updatedItem);
    }
  });

  it('only sends provided fields to service', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn(),
      addInventoryItem: vi.fn(),
      updateInventoryItem: vi.fn().mockResolvedValue({ item: updatedItem }),
      deleteInventoryItem: vi.fn(),
    };

    await updateInventory(service, {
      id: 'dev-1',
      name: 'New Name',
    });

    expect(service.updateInventoryItem).toHaveBeenCalledWith('dev-1', {
      name: 'New Name',
    });
  });

  it('returns error messages when service throws', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn(),
      addInventoryItem: vi.fn(),
      updateInventoryItem: vi.fn().mockRejectedValue(new Error('update failed')),
      deleteInventoryItem: vi.fn(),
    };

    const result = await updateInventory(service, {
      id: 'dev-1',
      name: 'Updated Name',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['update failed']);
    }
  });
});
