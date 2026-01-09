<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';
import { useReservations } from '@/composables/use-reservations';
import type { Reservation, ReservationStatus } from '@/app/reservation-service';
import type { AppConfig } from '@/config/appConfig';

const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0();

const config = inject<AppConfig>('appConfig');
const rolesClaim = config?.auth0.rolesClaim || 'https://schemas.quickstarts/roles';

const {
  items,
  totalCount,
  loading,
  deleting,
  updating,
  error,
  fetchItems,
  updateStatus,
  deleteItem,
} = useReservations();

const successMessage = ref<string | null>(null);
const isStaff = ref(false);

// Decode JWT payload to check permissions
const decodeJwtPayload = (token: string): Record<string, unknown> | undefined => {
  const [, base64Payload] = token.split('.');
  if (!base64Payload) return undefined;
  const normalized = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded =
    normalized.length % 4 === 0
      ? normalized
      : normalized + '='.repeat(4 - (normalized.length % 4));
  try {
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

const checkStaffStatus = async () => {
  if (!isAuthenticated.value) {
    isStaff.value = false;
    return;
  }
  try {
    const token = await getAccessTokenSilently();
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (!payload) return;
    
    const permissions = (payload as any).permissions || [];
    const roles = (payload as any)[rolesClaim] || (payload as any).roles || [];
    
    isStaff.value = 
      (Array.isArray(roles) && roles.includes('staff')) ||
      (Array.isArray(permissions) && permissions.includes('write:devices'));
  } catch {
    isStaff.value = false;
  }
};

const handleDelete = async (item: Reservation) => {
  successMessage.value = null;
  const action = isStaff.value ? 'Cancel this student\'s reservation' : 'Cancel your reservation';
  const confirmed = window.confirm(
    `${action} for "${item.deviceModelName}"? This cannot be undone.`,
  );
  if (!confirmed) return;
  await deleteItem({ id: item.id });
  if (!error.value) {
    successMessage.value = 'Reservation cancelled.';
    setTimeout(() => (successMessage.value = null), 2000);
  }
};

const handleMarkCollected = async (item: Reservation) => {
  successMessage.value = null;
  const confirmed = window.confirm(
    `Mark "${item.deviceModelName}" as collected by the student?`,
  );
  if (!confirmed) return;
  await updateStatus({ id: item.id, status: 'collected' });
  if (!error.value) {
    successMessage.value = 'Reservation marked as collected.';
    setTimeout(() => (successMessage.value = null), 2000);
  }
};

const handleMarkReturned = async (item: Reservation) => {
  successMessage.value = null;
  const confirmed = window.confirm(
    `Mark "${item.deviceModelName}" as returned?`,
  );
  if (!confirmed) return;
  await updateStatus({ id: item.id, status: 'returned' });
  if (!error.value) {
    successMessage.value = 'Reservation marked as returned.';
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

function formatDateShort(d: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

// Calculate return due date (2 days from collection)
function getReturnDueDate(collectedAt: Date | undefined): Date | undefined {
  if (!collectedAt) return undefined;
  const dueDate = new Date(collectedAt);
  dueDate.setDate(dueDate.getDate() + 2);
  return dueDate;
}

// Check if a reservation is overdue
function isOverdue(collectedAt: Date | undefined): boolean {
  if (!collectedAt) return false;
  const dueDate = getReturnDueDate(collectedAt);
  if (!dueDate) return false;
  return new Date() > dueDate;
}

const activeReservations = computed(() =>
  items.value.filter((r) => r.status === 'reserved' || r.status === 'collected'),
);

const pastReservations = computed(() =>
  items.value.filter((r) => r.status === 'returned'),
);

onMounted(async () => {
  if (isAuthenticated.value) {
    await checkStaffStatus();
    fetchItems();
  }
});

// Page title and description based on staff status
const pageTitle = computed(() => isStaff.value ? 'Student Reservations' : 'My Reservations');
const pageDescription = computed(() => 
  isStaff.value 
    ? 'View and manage all student device reservations. Mark devices as collected or returned.'
    : 'View and manage your device reservations. Active reservations can be collected from staff.'
);
</script>

<template>
  <section class="page">
    <header class="page__header">
      <div>
        <p class="eyebrow">{{ isStaff ? 'Staff Portal' : 'My account' }}</p>
        <h1>{{ pageTitle }}</h1>
        <p class="lede">{{ pageDescription }}</p>
      </div>
    </header>

    <div v-if="!isLoading && !isAuthenticated" class="state">
      <p>You need to sign in to view your reservations.</p>
      <button class="btn btn--primary" @click="loginWithRedirect()">
        Sign in
      </button>
    </div>

    <div v-else-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <div v-if="isAuthenticated">
      <div v-if="loading" class="state">Loading…</div>
      <div v-else-if="error" class="state state--error">
        <p>{{ error }}</p>
        <button class="btn btn--primary" @click="fetchItems()" :disabled="loading">
          Try again
        </button>
      </div>
      <div v-else>
        <div v-if="activeReservations.length > 0" class="section">
          <h2 class="section-title">Active Reservations</h2>
          <ul class="reservation-list" role="list">
            <li
              v-for="r in activeReservations"
              :key="r.id"
              class="reservation-card"
            >
              <div class="reservation-header">
                <div>
                  <div class="device-name">{{ r.deviceModelName }}</div>
                  <div class="reservation-id">#{{ r.id }}</div>
                  <div v-if="isStaff" class="user-id">User: {{ r.userId }}</div>
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
                <div v-if="r.status === 'collected' && r.collectedAt" class="detail-item">
                  <span class="detail-label">Return Due:</span>
                  <time 
                    :dateTime="getReturnDueDate(r.collectedAt)?.toISOString()"
                    :class="{ 'overdue': isOverdue(r.collectedAt) }"
                  >
                    {{ formatDateShort(getReturnDueDate(r.collectedAt)!) }}
                    <span v-if="isOverdue(r.collectedAt)" class="overdue-badge">OVERDUE</span>
                  </time>
                </div>
              </div>
              <div class="reservation-actions">
                <!-- Staff can mark reserved items as collected -->
                <button
                  v-if="isStaff && r.status === 'reserved'"
                  @click="handleMarkCollected(r)"
                  class="btn-small btn--primary"
                  :disabled="updating"
                >
                  Mark Collected
                </button>
                <!-- Staff can mark collected items as returned -->
                <button
                  v-if="isStaff && r.status === 'collected'"
                  @click="handleMarkReturned(r)"
                  class="btn-small btn--primary"
                  :disabled="updating"
                >
                  Mark Returned
                </button>
                <!-- Cancel button for reserved items (staff only) -->
                <button
                  v-if="isStaff && r.status === 'reserved'"
                  @click="handleDelete(r)"
                  class="btn-small btn--danger"
                  :disabled="deleting"
                >
                  Cancel
                </button>
              </div>
            </li>
          </ul>
        </div>

        <div v-if="pastReservations.length > 0" class="section">
          <h2 class="section-title">Past Reservations</h2>
          <ul class="reservation-list" role="list">
            <li
              v-for="r in pastReservations"
              :key="r.id"
              class="reservation-card reservation-card--past"
            >
              <div class="reservation-header">
                <div>
                  <div class="device-name">{{ r.deviceModelName }}</div>
                  <div class="reservation-id">#{{ r.id }}</div>
                  <div v-if="isStaff" class="user-id">User: {{ r.userId }}</div>
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
            </li>
          </ul>
        </div>

        <p v-if="items.length === 0" class="state">
          No reservations yet. Browse available devices to make a reservation.
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.page {
  max-width: 800px;
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
  max-width: 520px;
}
.section {
  margin-bottom: 2.5rem;
}
.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: #111827;
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
.reservation-card--past {
  opacity: 0.7;
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
  margin-right: 0.5rem;
}
.btn-small:last-child {
  margin-right: 0;
}
.btn-small:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--danger {
  background-color: #ef4444;
  color: white;
}
.btn--danger:hover:not(:disabled) {
  background-color: #dc2626;
}
.user-id {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
}
.overdue {
  color: #dc2626;
  font-weight: 600;
}
.overdue-badge {
  display: inline-block;
  background-color: #dc2626;
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  margin-left: 0.5rem;
  vertical-align: middle;
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
