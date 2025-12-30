import { describe, it, expect, vi } from 'vitest';
import { addInventory } from './add-inventory';
import type { InventoryService, Device } from './inventory-service';

describe('addInventory', () => {
  const createdItem: Device = {
    id: 'dev-123',
    name: 'Keyboard',
    description: 'Mechanical keyboard',
    count: 2,
    updatedAt: new Date('2025-03-10'),
  };

  it('succeeds and returns created item', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn(),
      addInventoryItem: vi.fn().mockResolvedValue({ item: createdItem }),
      updateInventoryItem: vi.fn(),
      deleteInventoryItem: vi.fn(),
    };

    const result = await addInventory(service, {
      name: 'Keyboard',
      description: 'Mechanical keyboard',
      count: 2,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.item).toEqual(createdItem);
    }
    expect(service.addInventoryItem).toHaveBeenCalledWith({
      name: 'Keyboard',
      description: 'Mechanical keyboard',
      count: 2,
    });
  });

  it('defaults count to 1 when not provided', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn(),
      addInventoryItem: vi.fn().mockResolvedValue({ item: createdItem }),
      updateInventoryItem: vi.fn(),
      deleteInventoryItem: vi.fn(),
    };

    await addInventory(service, {
      name: 'Mouse',
      description: 'Wireless mouse',
    });

    expect(service.addInventoryItem).toHaveBeenCalledWith({
      name: 'Mouse',
      description: 'Wireless mouse',
      count: 1,
    });
  });

  it('returns error messages when service throws', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn(),
      addInventoryItem: vi.fn().mockRejectedValue(new Error('failed')),
      updateInventoryItem: vi.fn(),
      deleteInventoryItem: vi.fn(),
    };

    const result = await addInventory(service, {
      name: 'Keyboard',
      description: 'Mechanical keyboard',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['failed']);
    }
  });
});
