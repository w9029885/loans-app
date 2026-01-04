<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';
import { useReservations } from '@/composables/use-reservations';
import type { Reservation, ReservationStatus } from '@/app/reservation-service';
import type { AppConfig } from '@/config/appConfig';

const config = inject<AppConfig>('appConfig');
const rolesClaim = config?.auth0.rolesClaim || 'https://schemas.quickstarts/roles';

const { isAuthenticated, isLoading, user, loginWithRedirect } = useAuth0();

const normalizeStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === 'string')
    return value
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
};

const roles = computed(() => {
  const claims = user.value ?? {};
  const fromClaim = (claims as any)[rolesClaim];
  const fallback = (claims as any).roles;
  return Array.from(
    new Set([...normalizeStrings(fromClaim), ...normalizeStrings(fallback)]),
  );
});

const isStaff = computed(() => roles.value.includes('staff'));

const {
  items,
  totalCount,
  loading,
  updating,
  error,
  fetchItems,
  updateStatus,
} = useReservations();

const successMessage = ref<string | null>(null);
const filterStatus = ref<'all' | 'reserved' | 'collected' | 'returned'>('all');

const handleUpdateStatus = async (item: Reservation, newStatus: ReservationStatus) => {
  successMessage.value = null;
  const action = newStatus === 'collected' ? 'mark as collected' : 'mark as returned';
  const confirmed = window.confirm(
    `${action.charAt(0).toUpperCase() + action.slice(1)} reservation for "${item.deviceModelName}" by user ${item.userId}?`,
  );
  if (!confirmed) return;
  await updateStatus({ id: item.id, status: newStatus });
  if (!error.value) {
    successMessage.value = `Reservation ${newStatus}.`;
    setTimeout(() => (successMessage.value = null), 2000);
  }
};

const statusLabel = (status: ReservationStatus): string => {
  const labels: Record<ReservationStatus, string> = {
    reserved: 'Reserved',
    collected: 'Collected',
    returned: 'Returned',
  };
  return labels[status] || status;
};

const statusClass = (status: ReservationStatus): string => {
  const classes: Record<ReservationStatus, string> = {
    reserved: 'status--reserved',
    collected: 'status--collected',
    returned: 'status--returned',
  };
  return classes[status] || '';
};

function formatDate(d: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

const filteredReservations = computed(() => {
  if (filterStatus.value === 'all') return items.value;
  return items.value.filter((r) => r.status === filterStatus.value);
});

const loadReservations = async () => {
  if (!isAuthenticated.value || !isStaff.value) return;
  const statusFilter =
    filterStatus.value === 'all'
      ? undefined
      : [filterStatus.value as ReservationStatus];
  await fetchItems(statusFilter);
};

onMounted(() => {
  loadReservations();
});

watch([isAuthenticated, isStaff, filterStatus], () => {
  loadReservations();
});
</script>

<template>
  <section class="page">
    <header class="page__header">
      <div>
        <p class="eyebrow">Staff portal</p>
        <h1>Manage Reservations</h1>
        <p class="lede">
          View all student reservations and manage device collection and returns.
        </p>
      </div>
    </header>

    <div v-if="!isLoading && !isAuthenticated" class="state">
      <p>You need to sign in to manage reservations.</p>
      <button class="btn btn--primary" @click="loginWithRedirect()">
        Sign in
      </button>
    </div>

    <div v-else-if="!isLoading && isAuthenticated && !isStaff" class="state state--error">
      <p>This page is only accessible to staff members.</p>
    </div>

    <div v-else-if="isAuthenticated && isStaff">
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>

      <div class="filters">
        <label class="filter-label">Filter by status:</label>
        <div class="filter-buttons">
          <button
            class="filter-btn"
            :class="{ 'filter-btn--active': filterStatus === 'all' }"
            @click="filterStatus = 'all'"
          >
            All
          </button>
          <button
            class="filter-btn"
            :class="{ 'filter-btn--active': filterStatus === 'reserved' }"
            @click="filterStatus = 'reserved'"
          >
            Reserved
          </button>
          <button
            class="filter-btn"
            :class="{ 'filter-btn--active': filterStatus === 'collected' }"
            @click="filterStatus = 'collected'"
          >
            Collected
          </button>
          <button
            class="filter-btn"
            :class="{ 'filter-btn--active': filterStatus === 'returned' }"
            @click="filterStatus = 'returned'"
          >
            Returned
          </button>
        </div>
      </div>

      <div v-if="loading" class="state">Loading…</div>
      <div v-else-if="error" class="state state--error">{{ error }}</div>
      <div v-else>
        <p v-if="filteredReservations.length === 0" class="state">
          No reservations found.
        </p>
        <ul v-else class="reservation-list" role="list">
          <li
            v-for="r in filteredReservations"
            :key="r.id"
            class="reservation-card"
          >
            <div class="reservation-header">
              <div>
                <div class="device-name">{{ r.deviceModelName }}</div>
                <div class="user-info">User: {{ r.userId }}</div>
                <div class="reservation-id">#{{ r.id }}</div>
              </div>
              <span class="status-badge" :class="statusClass(r.status)">
                {{ statusLabel(r.status) }}
              </span>
            </div>
            <div class="reservation-details">
              <div class="detail-item">
                <span class="detail-label">Reserved:</span>
                <time :dateTime="r.createdAt.toISOString()">
                  {{ formatDate(r.createdAt) }}
                </time>
              </div>
              <div v-if="r.collectedAt" class="detail-item">
                <span class="detail-label">Collected:</span>
                <time :dateTime="r.collectedAt.toISOString()">
                  {{ formatDate(r.collectedAt) }}
                </time>
              </div>
              <div v-if="r.returnedAt" class="detail-item">
                <span class="detail-label">Returned:</span>
                <time :dateTime="r.returnedAt.toISOString()">
                  {{ formatDate(r.returnedAt) }}
                </time>
              </div>
            </div>
            <div v-if="r.status !== 'returned'" class="reservation-actions">
              <button
                v-if="r.status === 'reserved'"
                @click="handleUpdateStatus(r, 'collected')"
                class="btn-small btn--primary"
                :disabled="updating"
              >
                Mark as Collected
              </button>
              <button
                v-if="r.status === 'collected'"
                @click="handleUpdateStatus(r, 'returned')"
                class="btn-small btn--success"
                :disabled="updating"
              >
                Mark as Returned
              </button>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.page__header {
  margin-bottom: 2rem;
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: #6b7280;
  margin: 0 0 0.2rem;
}
.lede {
  margin: 0.25rem 0 0;
  color: #4b5563;
  max-width: 600px;
}
.filters {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}
.filter-label {
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
}
.filter-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.filter-btn {
  padding: 0.375rem 0.875rem;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
}
.filter-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}
.filter-btn--active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
.filter-btn--active:hover {
  background: #2563eb;
  border-color: #2563eb;
}
.reservation-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.reservation-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.reservation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.device-name {
  font-weight: 600;
  font-size: 1.05rem;
  margin-bottom: 0.25rem;
}
.user-info {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}
.reservation-id {
  color: #9ca3af;
  font-size: 0.75rem;
}
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.status--reserved {
  background-color: #dbeafe;
  color: #1e40af;
}
.status--collected {
  background-color: #fef3c7;
  color: #92400e;
}
.status--returned {
  background-color: #d1fae5;
  color: #065f46;
}
.reservation-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0;
  border-top: 1px solid #f3f4f6;
  font-size: 0.875rem;
}
.detail-item {
  display: flex;
  gap: 0.5rem;
}
.detail-label {
  font-weight: 500;
  color: #6b7280;
}
.reservation-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
}
.btn-small {
  padding: 0.375rem 0.875rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--primary {
  background-color: #3b82f6;
  color: white;
}
.btn--primary:hover:not(:disabled) {
  background-color: #2563eb;
}
.btn--success {
  background-color: #10b981;
  color: white;
}
.btn--success:hover:not(:disabled) {
  background-color: #059669;
}
.state {
  color: #374151;
  padding: 1rem 0;
}
.state--error {
  color: #b91c1c;
}
.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn--primary {
  background-color: #0ea5e9;
  color: white;
}
.btn--primary:hover:not(:disabled) {
  background-color: #0284c7;
}
.success-message {
  padding: 1rem;
  background-color: #d1fae5;
  border: 1px solid #6ee7b7;
  border-radius: 6px;
  color: #065f46;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}
</style>
