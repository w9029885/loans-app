import { describe, it, expect, vi } from 'vitest';
import { listInventory } from './list-inventory';
import type { InventoryService, Device } from './inventory-service';

describe('listInventory', () => {
  const sampleItems: Device[] = [
    {
      id: 'dev-1',
      name: 'Laptop',
      description: 'Dell XPS',
      count: 5,
      updatedAt: new Date('2025-01-01'),
    },
    {
      id: 'dev-2',
      name: 'Monitor',
      description: '4K Monitor',
      count: 10,
      updatedAt: new Date('2025-02-02'),
    },
  ];

  it('returns items and total count when service succeeds', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn().mockResolvedValue({ items: sampleItems, totalCount: 2 }),
      addInventoryItem: vi.fn(),
      updateInventoryItem: vi.fn(),
      deleteInventoryItem: vi.fn(),
    };

    const result = await listInventory(service);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.items).toEqual(sampleItems);
      expect(result.totalCount).toBe(2);
    }
  });

  it('returns error messages when service throws', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn().mockRejectedValue(new Error('boom')),
      addInventoryItem: vi.fn(),
      updateInventoryItem: vi.fn(),
      deleteInventoryItem: vi.fn(),
    };

    const result = await listInventory(service);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['boom']);
    }
  });
});
