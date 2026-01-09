import type {
  ReservationService,
  ListReservationsOutput,
  CreateReservationInput,
  CreateReservationOutput,
  UpdateReservationStatusInput,
  UpdateReservationStatusOutput,
  Reservation,
  ReservationStatus,
} from '../app/reservation-service';
import type { Telemetry } from '../composables/useTelemetry';
import {
  computeBackoffDelayMs,
  defaultRetryOptions,
  isLikelyNetworkError,
  isRetryableHttpStatus,
  sleep,
} from './retry';

export type HttpReservationServiceOptions = {
  /** Base URL for the reservations API, e.g. http://localhost:7072 */
  baseUrl?: string;
  /** Function to get the current access token for Authorization header */
  authTokenProvider?: () => Promise<string | null>;
  /** Optional telemetry service for tracking errors */
  telemetry?: Telemetry;
};

export class HttpReservationService implements ReservationService {
  private readonly baseUrl: string;
  private readonly authTokenProvider?: () => Promise<string | null>;
  private readonly telemetry?: Telemetry;

  constructor(options: HttpReservationServiceOptions = {}) {
    this.baseUrl = (options.baseUrl || '').replace(/\/$/, '');
    this.authTokenProvider = options.authTokenProvider;
    this.telemetry = options.telemetry;
  }

  private trackException(err: unknown, context?: Record<string, unknown>): void {
    if (!this.telemetry) return;
    const error = err instanceof Error ? err : new Error(String(err));
    this.telemetry.trackException(error, context);
  }

  private trackEvent(name: string, properties?: Record<string, any>): void {
    this.telemetry?.trackEvent(name, properties);
  }

  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.authTokenProvider) {
      try {
        const token = await this.authTokenProvider();
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
      } catch (err) {
        console.warn('Failed to get auth token', err);
      }
    }
    return headers;
  }

  private parseReservation(data: any): Reservation {
    return {
      id: data.id,
      userId: data.userId,
      deviceModelId: data.deviceModelId,
      deviceModelName: data.deviceModelName,
      status: data.status,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      collectedAt: data.collectedAt ? new Date(data.collectedAt) : undefined,
      returnedAt: data.returnedAt ? new Date(data.returnedAt) : undefined,
    };
  }

  async listReservations(statusFilter?: ReservationStatus[]): Promise<ListReservationsOutput> {
    const retry = defaultRetryOptions;
    let lastRes: Response | undefined;
    try {
      const url = new URL('api/reservations', this.baseUrl);
      if (statusFilter && statusFilter.length > 0) {
        url.searchParams.set('status', statusFilter.join(','));
      }

      const headers = await this.getHeaders();
      for (let attempt = 1; attempt <= retry.attempts; attempt++) {
        try {
          lastRes = await fetch(url.toString(), {
            method: 'GET',
            headers,
          });

          if (!lastRes.ok && isRetryableHttpStatus(lastRes.status) && attempt < retry.attempts) {
            const delayMs = computeBackoffDelayMs(
              attempt - 1,
              retry.baseDelayMs,
              retry.maxDelayMs,
            );
            console.warn(
              `[HttpReservationService] listReservations retrying (attempt ${attempt + 1}/${retry.attempts}) after ${delayMs}ms, status=${lastRes.status}`,
            );
            this.trackEvent('reservations_fetch_retry', {
              attempt,
              nextAttempt: attempt + 1,
              status: lastRes.status,
              delayMs,
            });
            await sleep(delayMs);
            continue;
          }

          if (!lastRes.ok) {
            const errorData = await lastRes.json().catch(() => ({}));
            const message = errorData?.error?.message || `${lastRes.status} ${lastRes.statusText}`;
            throw new Error(`Failed to list reservations: ${message}`);
          }

          const data = await lastRes.json();
          const items = Array.isArray(data)
            ? data.map((item) => this.parseReservation(item))
            : [];
          return {
            items,
            totalCount: items.length,
          };
        } catch (err) {
          if (attempt < retry.attempts && isLikelyNetworkError(err)) {
            const delayMs = computeBackoffDelayMs(
              attempt - 1,
              retry.baseDelayMs,
              retry.maxDelayMs,
            );
            console.warn(
              `[HttpReservationService] listReservations retrying (attempt ${attempt + 1}/${retry.attempts}) after ${delayMs}ms (network error)`,
              err,
            );
            this.trackEvent('reservations_fetch_retry', {
              attempt,
              nextAttempt: attempt + 1,
              reason: 'network',
              delayMs,
            });
            await sleep(delayMs);
            continue;
          }
          throw err;
        }
      }

      if (lastRes && !lastRes.ok && isRetryableHttpStatus(lastRes.status)) {
        throw new Error(
          `Reservations service temporarily unavailable (${lastRes.status}). Please try again in a moment.`,
        );
      }

      throw new Error('Failed to list reservations');
    } catch (err) {
      this.trackException(err, { operation: 'listReservations' });
      throw err;
    }
  }

  async createReservation(input: CreateReservationInput): Promise<CreateReservationOutput> {
    try {
      const url = new URL('api/reservations', this.baseUrl);
      const headers = await this.getHeaders();
      
      const res = await fetch(url.toString(), {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `${res.status} ${res.statusText}`;
        throw new Error(`Failed to create reservation: ${message}`);
      }

      const data = await res.json();
      return {
        item: this.parseReservation(data),
      };
    } catch (err) {
      this.trackException(err, { operation: 'createReservation' });
      throw err;
    }
  }

  async updateReservationStatus(
    id: string,
    input: UpdateReservationStatusInput
  ): Promise<UpdateReservationStatusOutput> {
    try {
      const url = new URL(`api/reservations/${id}/status`, this.baseUrl);
      const headers = await this.getHeaders();
      
      const res = await fetch(url.toString(), {
        method: 'PATCH',
        headers,
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `${res.status} ${res.statusText}`;
        throw new Error(`Failed to update reservation status: ${message}`);
      }

      const data = await res.json();
      return {
        item: this.parseReservation(data),
      };
    } catch (err) {
      this.trackException(err, { operation: 'updateReservationStatus', id });
      throw err;
    }
  }

  async deleteReservation(id: string): Promise<void> {
    try {
      const url = new URL(`api/reservations/${id}`, this.baseUrl);
      const headers = await this.getHeaders();
      
      const res = await fetch(url.toString(), {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `${res.status} ${res.statusText}`;
        throw new Error(`Failed to delete reservation: ${message}`);
      }
    } catch (err) {
      this.trackException(err, { operation: 'deleteReservation', id });
      throw err;
    }
  }
}
