<script setup lang="ts">
import { computed, inject } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';
import type { AppConfig } from './config/appConfig';

const config = inject<AppConfig>('appConfig');
const rolesClaim = config?.auth0.rolesClaim || 'https://schemas.quickstarts/roles';

const { isAuthenticated, loginWithRedirect, logout, user, isLoading } =
  useAuth0();
const returnTo = window.location.origin;

const roleList = computed(() => {
  const current = user.value ?? {};
  const fromClaim = (current as any)?.[rolesClaim];
  const fromRoles = Array.isArray(fromClaim)
    ? fromClaim
    : typeof fromClaim === 'string'
      ? [fromClaim]
      : [];
  const fallback = Array.isArray((current as any).roles)
    ? (current as any).roles
    : [];
  return Array.from(new Set([...fromRoles, ...fallback]));
});

const roleLabel = computed(() =>
  roleList.value.length ? roleList.value.join(', ') : 'guest',
);
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">Campus Loans</div>
      <div class="spacer" aria-hidden="true"></div>
      <div class="auth">
        <div v-if="!isLoading && isAuthenticated && user" class="user-chip">
          <div class="user-name">{{ user.name || user.email }}</div>
          <div class="user-role">{{ roleLabel }}</div>
        </div>
        <button
          v-if="!isAuthenticated"
          class="btn"
          @click="loginWithRedirect()"
        >
          Sign in
        </button>
        <button
          v-else
          class="btn btn--ghost"
          @click="logout({ logoutParams: { returnTo } })"
        >
          Sign out
        </button>
      </div>
    </header>
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  background: linear-gradient(180deg, #f9fafb 0%, #edf2f7 100%);
  color: #111827;
  font-family:
    'Inter',
    'Segoe UI',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Helvetica Neue',
    Arial,
    sans-serif;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  background: #0b1021;
  color: #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.brand {
  font-weight: 700;
  letter-spacing: 0.01em;
}

.spacer {
  flex: 1;
}

.auth {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-chip {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 0.45rem 0.75rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  white-space: nowrap;
}

.user-role {
  font-size: 0.75rem;
  color: #cbd5e1;
  white-space: nowrap;
}

.btn {
  border: none;
  background: #2563eb;
  color: white;
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s;
}

.btn:hover {
  background: #1d4ed8;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
}

.btn:active {
  transform: translateY(1px);
}

.btn--ghost {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #e5e7eb;
}

.content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}
</style>
