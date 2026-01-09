<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';
import { useInventory } from '@/composables/use-inventory';
import { useReservations } from '@/composables/use-reservations';
import InventoryCard from '@/components/InventoryCard.vue';
import AddInventoryForm from '@/components/AddInventoryForm.vue';
import type { AddInventoryCommand } from '@/app/add-inventory';
import type { Device } from '@/app/inventory-service';
import type { AppConfig } from '@/config/appConfig';

const config = inject<AppConfig>('appConfig');
const rolesClaim = config?.auth0.rolesClaim || 'https://schemas.quickstarts/roles';

const { isAuthenticated, isLoading, user, loginWithRedirect, getAccessTokenSilently } =
  useAuth0();

const normalizeStrings = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === 'string')
    return value
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
};

const tokenRoles = ref<string[]>([]);
const tokenPermissions = ref<string[]>([]);

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

const roles = computed(() => {
  const claims = user.value ?? {};
  const fromClaim = (claims as any)[rolesClaim];
  const fallback = (claims as any).roles;
  return Array.from(
    new Set([
      ...normalizeStrings(fromClaim),
      ...normalizeStrings(fallback),
      ...tokenRoles.value,
    ]),
  );
});

const permissions = computed(() => {
  const claims = user.value ?? {};
  const perms = (claims as any).permissions ?? (claims as any).scope;
  // permissions may already be space-separated; normalizeStrings splits for us
  return Array.from(
    new Set([...normalizeStrings(perms), ...tokenPermissions.value]),
  );
});

const isStaff = computed(() => roles.value.includes('staff'));
const isStudent = computed(() => roles.value.includes('student'));
const canManage = computed(
  () => isStaff.value || permissions.value.includes('write:devices'),
);
const canSeeCounts = computed(
  () =>
    canManage.value ||
    isStudent.value ||
    permissions.value.includes('read:devices'),
);
const canReserve = computed(
  () => canSeeCounts.value || permissions.value.includes('reserve:devices'),
);

const {
  items,
  totalCount,
  loading,
  adding,
  deleting,
  updating,
  error,
  fetchItems,
  addItem,
  deleteItem,
  updateItem,
} = useInventory();

const {
  items: reservationItems,
  creating: reserving,
  error: reservationError,
  fetchItems: fetchReservations,
  createItem: createReservation,
} = useReservations();

const reservedStatusByDeviceId = computed(() => {
  const map = new Map<string, 'reserved' | 'collected'>();
  for (const reservation of reservationItems.value) {
    if (reservation.status !== 'reserved' && reservation.status !== 'collected') continue;
    const existing = map.get(reservation.deviceModelId);
    if (existing === 'collected') continue;
    map.set(reservation.deviceModelId, reservation.status);
  }
  return map;
});

// Check if a device is already reserved by the current user
const isDeviceReserved = (deviceId: string): boolean => {
  return reservedStatusByDeviceId.value.has(deviceId);
};

const reservationStatusForDevice = (deviceId: string): 'reserved' | 'collected' | undefined => {
  return reservedStatusByDeviceId.value.get(deviceId);
};

const showForm = ref(false);
const formRef = ref<InstanceType<typeof AddInventoryForm> | null>(null);
const successMessage = ref<string | null>(null);

const handleToggleForm = () => {
  if (!canManage.value) return;
  showForm.value = !showForm.value;
  successMessage.value = null;
  if (!showForm.value && formRef.value) formRef.value.resetForm();
};

const handleSubmit = async (command: AddInventoryCommand) => {
  successMessage.value = null;
  await addItem(command);
  if (!error.value) {
    successMessage.value = 'Item added successfully!';
    showForm.value = false;
    formRef.value?.resetForm();
    setTimeout(() => (successMessage.value = null), 3000);
  }
};

const handleCancel = () => {
  showForm.value = false;
  successMessage.value = null;
  formRef.value?.resetForm();
};

const handleDelete = async (item: Device) => {
  successMessage.value = null;
  const confirmed = window.confirm(
    `Delete “${item.name}”? This cannot be undone.`,
  );
  if (!confirmed) return;
  await deleteItem({ id: item.id });
  if (!error.value) {
    successMessage.value = 'Device deleted.';
    setTimeout(() => (successMessage.value = null), 2000);
  }
};

const handleEdit = async (item: Device) => {
  successMessage.value = null;
  const nextCountRaw = window.prompt(
    `Update stock count for “${item.name}”`,
    String(item.count ?? 0),
  );
  if (nextCountRaw === null) return;
  const nextCount = Number(nextCountRaw);
  if (!Number.isInteger(nextCount) || nextCount < 0) {
    successMessage.value = null;
    error.value = 'Count must be a non-negative whole number';
    return;
  }
  await updateItem({ id: item.id, count: nextCount });
  if (!error.value) {
    successMessage.value = 'Device updated.';
    setTimeout(() => (successMessage.value = null), 2000);
  }
};

const handleReserve = async (item: Device) => {
  successMessage.value = null;
  await createReservation({
    deviceModelId: item.id,
    deviceModelName: item.name,
  });
  if (!reservationError.value) {
    // Refresh reservations to update the reserved state
    await fetchReservations();
    successMessage.value = `Reservation for "${item.name}" created successfully! Check "My Reservations" to view it.`;
    setTimeout(() => (successMessage.value = null), 4000);
  } else {
    // Display reservation error
    error.value = reservationError.value;
    setTimeout(() => (error.value = null), 4000);
  }
};

const handleEditAvailability = (item: Device) => {
  successMessage.value = `Availability editor for “${item.name}” coming soon.`;
  setTimeout(() => (successMessage.value = null), 2000);
};

const loadAccessTokenClaims = async () => {
  tokenPermissions.value = [];
  tokenRoles.value = [];
  if (!isAuthenticated.value) return;
  try {
    const token = await getAccessTokenSilently();
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (!payload) return;
    const perms = (payload as any).permissions ?? (payload as any).scope;
    const fromClaim = (payload as any)[rolesClaim];
    const fallback = (payload as any).roles;
    tokenPermissions.value = normalizeStrings(perms);
    tokenRoles.value = Array.from(
      new Set([...normalizeStrings(fromClaim), ...normalizeStrings(fallback)]),
    );
  } catch (err) {
    console.warn('Failed to decode access token claims', err);
  }
};

onMounted(() => {
  console.log('[ListInventory] onMounted - fetching items');
  loadAccessTokenClaims();
  fetchItems();
  // Fetch user's reservations to track which devices they've reserved
  if (isAuthenticated.value) {
    fetchReservations();
  }
});

watch([isAuthenticated, user], () => {
  console.log('[ListInventory] Auth/user changed, reloading claims');
  loadAccessTokenClaims();
  // Also refresh reservations when auth changes
  if (isAuthenticated.value) {
    fetchReservations();
  }
});

watch([isAuthenticated, permissions, roles], ([auth, perms, rls]) => {
  // Re-fetch to get richer data when auth state changes
  console.log('[ListInventory] Auth state changed, re-fetching. isAuth:', auth, 'perms:', perms, 'roles:', rls);
  fetchItems();
});
</script>

<template>
  <section class="page">
    <header class="page__header">
      <div>
        <p class="eyebrow">Campus device pool</p>
        <h1>Device models</h1>
        <p class="lede">
          Browse available models. Sign in as a student to see availability or as
          staff to manage stock.
        </p>
      </div>
      <div class="header-actions">
        <button
          v-if="canManage"
          @click="handleToggleForm"
          class="btn btn--add"
          :disabled="loading"
        >
          {{ showForm ? 'Cancel' : '+ Add model' }}
        </button>
        <button
          v-else-if="!isAuthenticated && !isLoading"
          class="btn btn--primary"
          @click="loginWithRedirect()"
        >
          Sign in to manage
        </button>
      </div>
    </header>

    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <AddInventoryForm
      v-if="showForm && canManage"
      ref="formRef"
      :is-submitting="adding"
      :error="error"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    <div v-if="!loading" class="page__meta" aria-live="polite">
      <span v-if="canSeeCounts && totalCount > 0">{{ totalCount }} total</span>
      <span v-else-if="canSeeCounts">None yet</span>
      <span v-else>Sign in to see availability</span>
    </div>

    <div v-if="loading" class="state">Loading…</div>
    <div v-else-if="error" class="state state--error">
      <p>{{ error }}</p>
      <button class="btn btn--primary" @click="fetchItems" :disabled="loading">
        Try again
      </button>
    </div>
    <div v-else>
      <ul v-if="items.length" class="grid" role="list">
        <li v-for="i in items" :key="i.id" class="grid__item">
          <InventoryCard
            :item="i"
            :show-count="canSeeCounts"
            :show-reserve="canReserve && !canManage"
            :show-edit-availability="canManage"
            :disable-actions="deleting || updating"
            :is-reserved="isDeviceReserved(i.id)"
            :reserved-status="reservationStatusForDevice(i.id)"
            @delete="handleDelete(i)"
            @edit="handleEdit(i)"
            @reserve="handleReserve(i)"
            @edit-availability="handleEditAvailability(i)"
          />
        </li>
      </ul>
      <p v-else class="state">No items yet.</p>
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
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
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
.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.page__meta {
  color: #6b7280;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
}
.grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  /* Wider flexible columns; keeps equal 3rem gaps */
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 3rem;
}
.grid__item {
  display: block;
}
.state {
  color: #374151;
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
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn--add {
  background-color: #3b82f6;
  color: white;
}
.btn--add:hover:not(:disabled) {
  background-color: #2563eb;
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
