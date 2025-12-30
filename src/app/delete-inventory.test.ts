import { describe, it, expect, vi } from 'vitest';
import { deleteInventory } from './delete-inventory';
import type { InventoryService } from './inventory-service';

describe('deleteInventory', () => {
  it('returns success when service deletes item', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn(),
      addInventoryItem: vi.fn(),
      updateInventoryItem: vi.fn(),
      deleteInventoryItem: vi.fn().mockResolvedValue(undefined),
    };

    const result = await deleteInventory(service, { id: 'dev-1' });

    expect(result.success).toBe(true);
    expect(service.deleteInventoryItem).toHaveBeenCalledWith('dev-1');
  });

  it('returns error messages when service throws', async () => {
    const service: InventoryService = {
      listInventoryItems: vi.fn(),
      addInventoryItem: vi.fn(),
      updateInventoryItem: vi.fn(),
      deleteInventoryItem: vi.fn().mockRejectedValue(new Error('delete failed')),
    };

    const result = await deleteInventory(service, { id: 'dev-1' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toEqual(['delete failed']);
    }
  });
});
