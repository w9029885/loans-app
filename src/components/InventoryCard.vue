<script setup lang="ts">
import type { Device } from '@/app/inventory-service';

const props = defineProps<{ item: Device }>();

const emit = defineEmits<{ edit: []; delete: [] }>();

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
</script>

<template>
  <article class="card">
    <header class="card__header">
      <div>
        <div class="card__title">{{ props.item.name }}</div>
        <p class="card__desc">{{ props.item.description }}</p>
      </div>
      <div class="card__count">
        <span class="count-badge">{{ props.item.count }}</span>
        <span class="count-label">in stock</span>
      </div>
    </header>
    <footer class="card__footer">
      <div class="card__meta">
        <time :dateTime="props.item.updatedAt.toISOString()">
          {{ formatDate(props.item.updatedAt) }}
        </time>
        <span class="card__id">#{{ props.item.id }}</span>
      </div>
      <div class="card__actions">
        <button @click="$emit('edit')" class="btn-icon" title="Edit device" aria-label="Edit">✏️</button>
        <button @click="$emit('delete')" class="btn-icon btn-delete" title="Delete device" aria-label="Delete">🗑️</button>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  height: 100%;
}
.card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-grow: 1;
}
.card__title {
  font-weight: 600;
  font-size: 1.05rem;
  margin-bottom: 0.5rem;
}
.card__desc {
  color: #374151;
  line-height: 1.5;
  margin: 0;
  font-size: 0.875rem;
}
.card__count {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  min-width: 70px;
}
.count-badge {
  font-size: 1.75rem;
  font-weight: 700;
  color: #3b82f6;
  line-height: 1;
}
.count-label {
  font-size: 0.75rem;
  color: #6b7280;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 0.75rem;
  margin-top: 0.75rem;
}
.card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  color: #6b7280;
  font-size: 0.75rem;
}
.card__id {
  color: #9ca3af;
}
.card__actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
  padding: 0.25rem;
  transition: transform 0.2s, opacity 0.2s;
  opacity: 0.7;
}
.btn-icon:hover {
  opacity: 1;
  transform: scale(1.1);
}
.btn-delete:hover {
  color: #ef4444;
}
</style>
