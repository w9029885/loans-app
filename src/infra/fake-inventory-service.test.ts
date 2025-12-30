import { describe, it, expect } from 'vitest';
import { FakeInventoryService } from './fake-inventory-service';
import type { Device } from '@/app/inventory-service';

const device = (overrides: Partial<Device> = {}): Device => ({
  id: 'dev-1',
  name: 'Laptop',
  description: 'Dell XPS',
  count: 2,
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides,
});

describe('FakeInventoryService', () => {
  it('lists items with total count and returns copies', async () => {
    const initial = [device({ id: 'dev-a' })];
    const svc = new FakeInventoryService(initial);

    const { items, totalCount } = await svc.listInventoryItems();

    expect(totalCount).toBe(1);
    expect(items).toEqual(initial);
    // array itself is a copy
    expect(items).not.toBe(initial);
  });

  it('adds items with generated id and default count', async () => {
    const svc = new FakeInventoryService();

    const { item } = await svc.addInventoryItem({
      name: 'Mouse',
      description: 'Wireless',
      // count omitted to hit default
    });

    expect(item.id).toMatch(/^dev_/);
    expect(item.count).toBe(1);

    const { items, totalCount } = await svc.listInventoryItems();
    expect(totalCount).toBe(1);
    expect(items[0]).toEqual(item);
  });

  it('updates an existing item and bumps updatedAt', async () => {
    const original = device({ id: 'dev-1', name: 'Old' });
    const svc = new FakeInventoryService([original]);

    const { item } = await svc.updateInventoryItem('dev-1', {
      name: 'New',
      count: 9,
    });

    expect(item.name).toBe('New');
    expect(item.count).toBe(9);
    expect(item.updatedAt.getTime()).toBeGreaterThan(original.updatedAt.getTime());

    const { items } = await svc.listInventoryItems();
    expect(items[0]).toEqual(item);
  });

  it('throws when updating a missing item', async () => {
    const svc = new FakeInventoryService();
    await expect(
      svc.updateInventoryItem('missing', { name: 'Nope' }),
    ).rejects.toThrow('Device with id missing not found');
  });

  it('deletes an item and reduces count', async () => {
    const svc = new FakeInventoryService([device({ id: 'dev-1' }), device({ id: 'dev-2' })]);

    await svc.deleteInventoryItem('dev-1');

    const { items, totalCount } = await svc.listInventoryItems();
    expect(totalCount).toBe(1);
    expect(items[0].id).toBe('dev-2');
  });

  it('throws when deleting a missing item', async () => {
    const svc = new FakeInventoryService([device({ id: 'dev-1' })]);
    await expect(svc.deleteInventoryItem('nope')).rejects.toThrow(
      'Device with id nope not found',
    );
  });
});
