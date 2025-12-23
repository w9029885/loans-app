<script setup lang="ts">
import { reactive, ref, computed } from 'vue';
import type { AddInventoryCommand } from '@/app/add-inventory';

const emit = defineEmits<{ submit: [command: AddInventoryCommand]; cancel: [] }>();

const props = defineProps<{ isSubmitting?: boolean; error?: string | null }>();

const form = reactive({ name: '', description: '', count: 1 });
const validationErrors = ref<Record<string, string>>({});
const touched = reactive({ name: false, description: false, count: false });

const validate = (): boolean => {
  const errors: Record<string, string> = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Name is required';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  else if (name.length > 100) errors.name = 'Name must be no more than 100 characters';

  const description = form.description.trim();
  if (!description) errors.description = 'Description is required';
  else if (description.length < 5) errors.description = 'Description must be at least 5 characters';
  else if (description.length > 500) errors.description = 'Description must be no more than 500 characters';

  if (!Number.isFinite(form.count) || form.count < 0) {
    errors.count = 'Count must be a non-negative number';
  } else if (!Number.isInteger(form.count)) {
    errors.count = 'Count must be a whole number';
  }
  validationErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const isValid = computed(() => {
  return (
    form.name.trim().length >= 2 &&
    form.name.trim().length <= 100 &&
    form.description.trim().length >= 5 &&
    form.description.trim().length <= 500 &&
    Number.isFinite(form.count) &&
    form.count >= 0 &&
    Number.isInteger(form.count)
  );
});

const handleSubmit = () => {
  touched.name = true;
  touched.description = true;
  touched.count = true;
  if (!validate()) return;
  emit('submit', {
    name: form.name.trim(),
    description: form.description.trim(),
    count: form.count,
  });
};

const handleCancel = () => emit('cancel');

const resetForm = () => {
  form.name = '';
  form.description = '';
  form.count = 1;
  validationErrors.value = {};
  touched.name = false;
  touched.description = false;
  touched.count = false;
};

const markTouched = (field: keyof typeof touched) => {
  touched[field] = true;
  validate();
};

defineExpose({ resetForm });
</script>

<template>
  <div class="form">
    <h2>Add Device Model</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="name">Device Name</label>
        <input id="name" type="text" v-model="form.name" @blur="markTouched('name')" maxlength="100" :disabled="isSubmitting" />
        <span class="char-count">{{ form.name.length }} / 100</span>
        <span v-if="touched.name && validationErrors.name" class="error">{{ validationErrors.name }}</span>
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea id="description" v-model="form.description" @blur="markTouched('description')" rows="4" maxlength="500" :disabled="isSubmitting"></textarea>
        <span class="char-count">{{ form.description.length }} / 500</span>
        <span v-if="touched.description && validationErrors.description" class="error">{{ validationErrors.description }}</span>
      </div>

      <div class="form-group">
        <label for="count">Stock Count</label>
        <input id="count" type="number" v-model.number="form.count" @blur="markTouched('count')" min="0" step="1" :disabled="isSubmitting" />
        <span v-if="touched.count && validationErrors.count" class="error">{{ validationErrors.count }}</span>
      </div>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="form-actions">
        <button type="button" @click="handleCancel" class="btn btn-secondary" :disabled="isSubmitting">Cancel</button>
        <button type="submit" class="btn btn-primary" :disabled="!isValid || isSubmitting">{{ isSubmitting ? 'Submitting...' : 'Add Device' }}</button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.form { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.form h2 { margin: 0 0 1.5rem; font-size: 1.5rem; color: #111827; }
.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; color: #374151; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; }
input[type='text'], input[type='number'], textarea { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; font-family: inherit; transition: border-color 0.2s; }
input[type='text']:focus, input[type='number']:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
.char-count { display: block; margin-top: 0.25rem; font-size: 0.75rem; color: #9ca3af; text-align: right; }
.error { display: block; margin-top: 0.5rem; font-size: 0.875rem; color: #ef4444; }
.form-error { padding: 1rem; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; margin-bottom: 1rem; font-size: 0.875rem; }
.form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; }
.btn { padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary { background-color: #f3f4f6; color: #374151; }
.btn-secondary:hover:not(:disabled) { background-color: #e5e7eb; }
.btn-primary { background-color: #3b82f6; color: white; }
.btn-primary:hover:not(:disabled) { background-color: #2563eb; }
</style>
