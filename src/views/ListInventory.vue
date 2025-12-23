<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useInventory } from '@/composables/use-inventory';
import InventoryCard from '@/components/InventoryCard.vue';
import AddInventoryForm from '@/components/AddInventoryForm.vue';
import type { AddInventoryCommand } from '@/app/add-inventory';
import type { Device } from '@/app/inventory-service';

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

const showForm = ref(false);
const formRef = ref<InstanceType<typeof AddInventoryForm> | null>(null);
const successMessage = ref<string | null>(null);

const handleToggleForm = () => {
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
    String(item.count),
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

onMounted(() => fetchItems());
</script>

<template>
  <section class="page">
    <header class="page__header">
      <h1>Inventory test cicd</h1>
      <button
        @click="handleToggleForm"
        class="btn btn--add"
        :disabled="loading"
      >
        {{ showForm ? 'Cancel' : '+ Add Item' }}
      </button>
    </header>
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <AddInventoryForm
      v-if="showForm"
      ref="formRef"
      :is-submitting="adding"
      :error="error"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />

    <div v-if="!loading" class="page__meta" aria-live="polite">
      <span v-if="totalCount > 0">{{ totalCount }} total</span>
      <span v-else>None yet</span>
    </div>

    <div v-if="loading" class="state">Loading…</div>
    <div v-else-if="error" class="state state--error">{{ error }}</div>
    <div v-else>
      <ul v-if="items.length" class="grid" role="list">
        <li v-for="i in items" :key="i.id" class="grid__item">
          <InventoryCard
            :item="i"
            @delete="handleDelete(i)"
            @edit="handleEdit(i)"
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
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
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
