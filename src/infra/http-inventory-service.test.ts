import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpInventoryService } from './http-inventory-service';
import type { HttpClient } from './http-inventory-service';
import type { AddDeviceInput } from '@/app/inventory-service';

const makeResponse = (
  body: unknown,
  init: Partial<ResponseInit & { statusText?: string }> = {},
) => {
  const { status = 200, statusText = 'OK', headers = {} } = init;
  const isNoContent = status === 204;
  const payload = isNoContent
    ? null
    : typeof body === 'string'
      ? body
      : JSON.stringify(body);
  return new Response(payload as BodyInit | null, {
    status,
    statusText,
    headers: { 'content-type': 'application/json', ...headers },
  });
};

describe('HttpInventoryService', () => {
  let http: ReturnType<typeof vi.fn<HttpClient>>;

  beforeEach(() => {
    http = vi.fn();
  });

  it('lists inventory and maps DTOs', async () => {
    http.mockResolvedValueOnce(
      makeResponse({
        data: [
          {
            id: 'dev-1',
            name: 'Laptop',
            description: 'Dell',
            count: 3,
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
        count: 5,
      }),
    );

    const svc = new HttpInventoryService({ baseUrl: 'http://api', http });

    const result = await svc.listInventoryItems();

    expect(result.totalCount).toBe(5);
    expect(result.items[0].id).toBe('dev-1');
    expect(result.items[0].updatedAt).toBeInstanceOf(Date);
    expect(http).toHaveBeenCalledWith('http://api/api/devices', expect.any(Object));
  });

  it('throws when list returns errors array', async () => {
    http.mockResolvedValueOnce(makeResponse({ errors: ['bad', 'worse'] }));
    const svc = new HttpInventoryService({ http });
    await expect(svc.listInventoryItems()).rejects.toThrow('bad; worse');
  });

  it('adds device and maps response', async () => {
    http.mockResolvedValueOnce(
      makeResponse({
        item: {
          id: 'dev-9',
          name: 'Mouse',
          description: 'Wireless',
          count: 1,
          updatedAt: '2025-02-02T00:00:00.000Z',
        },
      }),
    );
    const svc = new HttpInventoryService({ baseUrl: 'http://api', http });

    const { item } = await svc.addInventoryItem({
      name: 'Mouse',
      description: 'Wireless',
    });

    expect(item.id).toBe('dev-9');
    expect(http).toHaveBeenCalledWith('http://api/api/devices', expect.objectContaining({ method: 'POST' }));
  });

  it('throws on malformed add response', async () => {
    // Array response should be treated as malformed add payload
    http.mockResolvedValueOnce(makeResponse([]));
    const svc = new HttpInventoryService({ http });
    await expect(
      svc.addInventoryItem({ name: 'Mouse', description: 'Wireless' }),
    ).rejects.toThrow('Malformed add device response');
  });

  it('updates device and maps response', async () => {
    http.mockResolvedValueOnce(
      makeResponse({
        data: {
          id: 'dev-1',
          name: 'Updated',
          description: 'Desc',
          count: 5,
          updatedAt: '2025-03-03T00:00:00.000Z',
        },
      }),
    );
    const svc = new HttpInventoryService({ http });

    const { item } = await svc.updateInventoryItem('dev-1', { name: 'Updated' });

    expect(item.name).toBe('Updated');
    expect(http).toHaveBeenCalledWith('/api/devices/dev-1', expect.objectContaining({ method: 'PATCH' }));
  });

  it('throws when update returns invalid date', async () => {
    http.mockResolvedValueOnce(
      makeResponse({ data: { id: 'dev-1', name: 'Bad', description: 'd', count: 1, updatedAt: 'not-a-date' } }),
    );
    const svc = new HttpInventoryService({ http });
    await expect(svc.updateInventoryItem('dev-1', {})).rejects.toThrow('Invalid updatedAt date');
  });

  it('deletes a device and sends auth header when provided', async () => {
    http.mockResolvedValueOnce(makeResponse(null, { status: 204, statusText: 'No Content' }));
    const svc = new HttpInventoryService({
      baseUrl: 'http://api',
      http,
      authTokenProvider: async () => 'abc123',
    });

    await svc.deleteInventoryItem('dev-7');

    const [, options] = http.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toMatchObject({ Authorization: 'Bearer abc123' });
    expect(options.method).toBe('DELETE');
  });

  it('ensureOk throws with response body details', async () => {
    http.mockResolvedValueOnce(
      makeResponse({ message: 'nope' }, { status: 400, statusText: 'Bad Request' }),
    );
    const svc = new HttpInventoryService({ http });
    await expect(svc.listInventoryItems()).rejects.toThrow('400 Bad Request - nope');
  });

  it('propagates custom headers and count fallback', async () => {
    http.mockResolvedValueOnce(
      makeResponse({
        data: [
          { id: 'dev-1', name: 'Laptop', description: 'd', count: 1, updatedAt: '2025-01-01T00:00:00.000Z' },
        ],
        // count omitted to trigger fallback
      }),
    );
    const svc = new HttpInventoryService({ http, headers: { 'x-test': 'yes' } });

    const result = await svc.listInventoryItems();

    expect(result.totalCount).toBe(1); // fallback to data length
    const [, options] = http.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toMatchObject({ 'x-test': 'yes', Accept: 'application/json' });
  });
});
