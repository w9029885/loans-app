import type {
  Device,
  InventoryService,
  ListDevicesOutput,
  AddDeviceInput,
  AddDeviceOutput,
} from '../app/inventory-service';

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
};

export class HttpInventoryService implements InventoryService {
  private readonly baseUrl?: string;
  private readonly http: HttpClient;
  private readonly headers: Record<string, string>;

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
  }

  async listInventoryItems(): Promise<ListDevicesOutput> {
    const res = await this.http(this.url('/api/devices'), {
      method: 'GET',
      headers: this.mergeHeaders({ Accept: 'application/json' }),
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
    return { items: mapped, totalCount };
  }

  async addInventoryItem(
    input: AddDeviceInput,
  ): Promise<AddDeviceOutput> {
    const dto = toAddDeviceRequestDto(input);
    const res = await this.http(this.url('/api/devices'), {
      method: 'POST',
      headers: this.mergeHeaders({
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
    const itemDto = itemSource && typeof itemSource === 'object' ? (itemSource as DeviceDto) : undefined;
    if (!itemDto || typeof itemDto !== 'object') {
      throw new Error('Malformed add device response');
    }
    const item = toDomainDevice(itemDto);
    return { item };
  }

  async updateInventoryItem(
    id: string,
    input: Partial<AddDeviceInput>,
  ): Promise<AddDeviceOutput> {
    const dto = toUpdateDeviceRequestDto(input);
    const res = await this.http(this.url(`/api/devices/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: this.mergeHeaders({
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
    return { item };
  }

  async deleteInventoryItem(id: string): Promise<void> {
    const res = await this.http(this.url(`/api/devices/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers: this.mergeHeaders({ Accept: 'application/json' }),
    });
    await this.ensureOk(res);
  }

  // helpers
  private url(path: string): string {
    if (!this.baseUrl) return path;
    return `${this.baseUrl}${path}`;
  }

  private mergeHeaders(extra: Record<string, string>): Record<string, string> {
    return { ...this.headers, ...extra };
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
