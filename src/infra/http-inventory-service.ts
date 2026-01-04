import type {
  Device,
  InventoryService,
  ListDevicesOutput,
  AddDeviceInput,
  AddDeviceOutput,
} from '../app/inventory-service';
import type { Telemetry } from '../composables/useTelemetry';

type DeviceDto = {
  id: string;
  name: string;
  description: string;
  count: number;
  updatedAt: string;
};

type ListDevicesResponseDto = {
  data?: DeviceDto[];
  count?: number;
  errors?: string[];
};

type AddDeviceRequestDto = {
  name: string;
  description: string;
  count: number;
};

export type HttpClient = typeof fetch;

export type HttpInventoryServiceOptions = {
  readonly baseUrl?: string;
  readonly http?: HttpClient;
  readonly headers?: Record<string, string>;
  readonly authTokenProvider?: () => Promise<string | null>;
  readonly telemetry?: Telemetry;
};

export class HttpInventoryService implements InventoryService {
  private readonly baseUrl?: string;
  private readonly http: HttpClient;
  private readonly headers: Record<string, string>;
  private readonly authTokenProvider?: () => Promise<string | null>;
  private readonly telemetry?: Telemetry;

  constructor(options: HttpInventoryServiceOptions = {}) {
    this.baseUrl = options.baseUrl
      ? options.baseUrl.replace(/\/$/, '')
      : undefined;
    const rawHttp: HttpClient | undefined =
      options.http ?? (typeof fetch !== 'undefined' ? fetch : undefined);
    if (!rawHttp) throw new Error('No fetch implementation available');
    const target: any = typeof window !== 'undefined' ? window : globalThis;
    this.http = (rawHttp as any).bind(target);
    this.headers = { ...(options.headers ?? {}) };
    this.authTokenProvider = options.authTokenProvider;
    this.telemetry = options.telemetry;
  }

  private nowMs(): number {
    return typeof performance !== 'undefined' && performance.now
      ? performance.now()
      : Date.now();
  }

  private trackDependency(
    name: string,
    data: string,
    startMs: number,
    success: boolean,
    responseCode?: number,
    properties?: Record<string, any>
  ): void {
    if (!this.telemetry) return;
    const duration = Math.max(this.nowMs() - startMs, 0);
    this.telemetry.trackDependency(name, data, duration, success, responseCode, properties);
  }

  private trackEvent(name: string, properties?: Record<string, any>): void {
    this.telemetry?.trackEvent(name, properties);
  }

  private trackException(err: unknown, properties?: Record<string, any>): void {
    if (!this.telemetry) return;
    const exception = err instanceof Error ? err : new Error(String(err));
    this.telemetry.trackException(exception, properties);
  }

  async listInventoryItems(): Promise<ListDevicesOutput> {
    const url = this.url('/api/devices');
    const started = this.nowMs();
    let res: Response | undefined;
    let success = false;

    try {
      res = await this.http(url, {
        method: 'GET',
        headers: await this.authHeaders({ Accept: 'application/json' }),
      });
      await this.ensureOk(res);
      const body = (await this.parseJson(res)) as ListDevicesResponseDto;

      if (Array.isArray(body.errors) && body.errors.length) {
        throw new Error(body.errors.join('; '));
      }

      const items = Array.isArray(body.data) ? body.data : [];
      const mapped = items.map(toDomainDevice);
      const totalCount =
        typeof body.count === 'number' ? body.count : mapped.length;
      success = true;
      this.trackEvent('inventory_fetch', {
        totalCount,
        itemCount: mapped.length,
      });
      this.telemetry?.trackMetric('inventory_total_count', totalCount);
      return { items: mapped, totalCount };
    } catch (err) {
      this.trackException(err, { operation: 'listInventoryItems' });
      this.trackEvent('inventory_fetch_failed');
      throw err;
    } finally {
      this.trackDependency('GET /api/devices', url, started, success, res?.status);
    }
  }

  async addInventoryItem(
    input: AddDeviceInput,
  ): Promise<AddDeviceOutput> {
    const dto = toAddDeviceRequestDto(input);
    const url = this.url('/api/devices');
    const started = this.nowMs();
    let res: Response | undefined;
    let success = false;

    try {
      res = await this.http(url, {
        method: 'POST',
        headers: await this.authHeaders({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(dto),
      });
      await this.ensureOk(res);
      const raw = (await this.parseJson(res)) as unknown;
      const body = (raw && typeof raw === 'object' ? (raw as any) : {}) as {
        item?: DeviceDto;
        data?: unknown;
        errors?: string[];
      };
      if (Array.isArray(body.errors) && body.errors.length) {
        throw new Error(body.errors.join('; '));
      }
      let itemSource: unknown = body.item ?? body.data ?? raw;
      // If data was an array, it's not a valid add response; ignore it
      if (Array.isArray(itemSource)) itemSource = undefined;
      const itemDto =
        itemSource && typeof itemSource === 'object'
          ? (itemSource as DeviceDto)
          : undefined;
      if (!itemDto || typeof itemDto !== 'object') {
        throw new Error('Malformed add device response');
      }
      const item = toDomainDevice(itemDto);
      success = true;
      this.trackEvent('inventory_add', {
        id: item.id,
        count: item.count,
        name: item.name,
      });
      return { item };
    } catch (err) {
      this.trackException(err, { operation: 'addInventoryItem' });
      this.trackEvent('inventory_add_failed');
      throw err;
    } finally {
      this.trackDependency('POST /api/devices', url, started, success, res?.status);
    }
  }

  async updateInventoryItem(
    id: string,
    input: Partial<AddDeviceInput>,
  ): Promise<AddDeviceOutput> {
    const dto = toUpdateDeviceRequestDto(input);
    const url = this.url(`/api/devices/${encodeURIComponent(id)}`);
    const started = this.nowMs();
    let res: Response | undefined;
    let success = false;

    try {
      res = await this.http(url, {
        method: 'PATCH',
        headers: await this.authHeaders({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(dto),
      });
      await this.ensureOk(res);
      const raw = (await this.parseJson(res)) as unknown;
      const body = (raw && typeof raw === 'object' ? (raw as any) : {}) as {
        item?: DeviceDto;
        data?: unknown;
        errors?: string[];
      };
      if (Array.isArray(body.errors) && body.errors.length) {
        throw new Error(body.errors.join('; '));
      }
      const itemDto = (body.item ?? body.data ?? raw) as DeviceDto | undefined;
      if (!itemDto || typeof itemDto !== 'object') {
        throw new Error('Malformed update device response');
      }
      const item = toDomainDevice(itemDto);
      success = true;
      this.trackEvent('inventory_update', {
        id: item.id,
        count: item.count,
      });
      return { item };
    } catch (err) {
      this.trackException(err, { operation: 'updateInventoryItem', id });
      this.trackEvent('inventory_update_failed', { id });
      throw err;
    } finally {
      this.trackDependency('PATCH /api/devices/{id}', url, started, success, res?.status);
    }
  }

  async deleteInventoryItem(id: string): Promise<void> {
    const url = this.url(`/api/devices/${encodeURIComponent(id)}`);
    const started = this.nowMs();
    let res: Response | undefined;
    let success = false;

    try {
      res = await this.http(url, {
        method: 'DELETE',
        headers: await this.authHeaders({ Accept: 'application/json' }),
      });
      await this.ensureOk(res);
      success = true;
      this.trackEvent('inventory_delete', { id });
    } catch (err) {
      this.trackException(err, { operation: 'deleteInventoryItem', id });
      this.trackEvent('inventory_delete_failed', { id });
      throw err;
    } finally {
      this.trackDependency('DELETE /api/devices/{id}', url, started, success, res?.status);
    }
  }

  // helpers
  private url(path: string): string {
    if (!this.baseUrl) return path;
    return `${this.baseUrl}${path}`;
  }

  private mergeHeaders(extra: Record<string, string>): Record<string, string> {
    return { ...this.headers, ...extra };
  }

  private async authHeaders(
    extra: Record<string, string>,
  ): Promise<Record<string, string>> {
    const headers = this.mergeHeaders(extra);
    if (this.authTokenProvider) {
      try {
        const token = await this.authTokenProvider();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
          console.log('[HttpInventoryService] Auth header attached, token length:', token.length);
        } else {
          console.log('[HttpInventoryService] No token returned from provider');
        }
      } catch (err: any) {
        // Log token errors for debugging
        console.warn('[HttpInventoryService] Failed to get auth token for API call:', err?.message || err);
        // Still proceed unauthenticated - the API will return limited data
      }
    } else {
      console.log('[HttpInventoryService] No authTokenProvider configured');
    }
    return headers;
  }

  private async ensureOk(res: Response): Promise<void> {
    if (res.ok) return;
    let message = `${res.status} ${res.statusText}`;
    try {
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const errBody = await res.clone().json();
        const msg = (errBody && (errBody.message || errBody.error)) as
          | string
          | undefined;
        if (msg) message = `${message} - ${msg}`;
      } else {
        const text = await res.clone().text();
        if (text) message = `${message} - ${text.slice(0, 300)}`;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  private async parseJson(res: Response): Promise<unknown> {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON response');
    }
  }
}

function toDomainDevice(dto: DeviceDto): Device {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    count: dto.count,
    updatedAt: toDate(dto.updatedAt),
  };
}

function toAddDeviceRequestDto(
  input: AddDeviceInput,
): AddDeviceRequestDto {
  return {
    name: input.name,
    description: input.description,
    count: input.count ?? 1,
  };
}

function toUpdateDeviceRequestDto(
  input: Partial<AddDeviceInput>,
): Partial<AddDeviceRequestDto> {
  const result: Partial<AddDeviceRequestDto> = {};
  if (input.name !== undefined) result.name = input.name;
  if (input.description !== undefined) result.description = input.description;
  if (input.count !== undefined) result.count = input.count;
  return result;
}

function toDate(v: string): Date {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid updatedAt date');
  }
  return d;
}
