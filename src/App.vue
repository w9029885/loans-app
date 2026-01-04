<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';
import { RouterLink } from 'vue-router';
import type { AppConfig } from './config/appConfig';

const config = inject<AppConfig>('appConfig');
const rolesClaim = config?.auth0.rolesClaim || 'https://schemas.quickstarts/roles';

const { isAuthenticated, loginWithRedirect, logout, user, isLoading, error, getAccessTokenSilently } =
  useAuth0();
const returnTo = window.location.origin;

// Roles from access token (since Auth0 puts custom claims there)
const accessTokenRoles = ref<string[]>([]);
const accessTokenPermissions = ref<string[]>([]);

// Decode JWT payload
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

// Load roles from access token
const loadAccessTokenRoles = async () => {
  if (!isAuthenticated.value) {
    accessTokenRoles.value = [];
    accessTokenPermissions.value = [];
    return;
  }
  try {
    const token = await getAccessTokenSilently();
    if (!token) return;
    const payload = decodeJwtPayload(token);
    if (!payload) return;
    
    // Check various places where roles might be
    const fromClaim = (payload as any)[rolesClaim];
    const fromRoles = (payload as any).roles;
    const fromPermissions = (payload as any).permissions;
    
    const roles: string[] = [];
    if (Array.isArray(fromClaim)) roles.push(...fromClaim);
    else if (typeof fromClaim === 'string') roles.push(fromClaim);
    if (Array.isArray(fromRoles)) roles.push(...fromRoles);
    
    accessTokenRoles.value = [...new Set(roles)];
    accessTokenPermissions.value = Array.isArray(fromPermissions) ? fromPermissions : [];
    console.log('Access token roles:', accessTokenRoles.value, 'Permissions:', accessTokenPermissions.value);
  } catch (err: any) {
    // If consent is required, trigger re-authentication
    if (err?.error === 'consent_required' || err?.message?.includes('Consent required')) {
      console.log('Consent required, triggering re-authentication...');
      // Clear any cached state and force re-login with consent
      localStorage.clear();
      await loginWithRedirect({
        authorizationParams: {
          prompt: 'consent',
        },
      });
      return;
    }
    console.warn('Failed to get access token roles', err);
  }
};

// Log auth errors and state changes for debugging
watch(error, (err) => {
  if (err) {
    console.error('Auth0 error:', err);
  }
});

watch([isAuthenticated, isLoading], ([auth, loading]) => {
  console.log('Auth state:', { isAuthenticated: auth, isLoading: loading, user: user.value });
  if (auth && !loading) {
    loadAccessTokenRoles();
  }
});

onMounted(() => {
  // Handle callback errors in URL
  const params = new URLSearchParams(window.location.search);
  const errorParam = params.get('error');
  const errorDesc = params.get('error_description');
  if (errorParam) {
    console.error('Auth0 callback error:', errorParam, errorDesc);
  }
  
  // Load roles if already authenticated
  if (isAuthenticated.value) {
    loadAccessTokenRoles();
  }
});

const roleList = computed(() => {
  const current = user.value ?? {};
  // Check ID token claims
  const fromClaim = (current as any)?.[rolesClaim];
  const fromIdToken = Array.isArray(fromClaim)
    ? fromClaim
    : typeof fromClaim === 'string'
      ? [fromClaim]
      : [];
  const fallback = Array.isArray((current as any).roles)
    ? (current as any).roles
    : [];
  // Merge with access token roles
  return Array.from(new Set([...fromIdToken, ...fallback, ...accessTokenRoles.value]));
});

const roleLabel = computed(() =>
  roleList.value.length ? roleList.value.join(', ') : 'guest',
);

// Staff is determined by role OR by having write:devices permission
const isStaff = computed(() => 
  roleList.value.includes('staff') || 
  accessTokenPermissions.value.includes('write:devices')
);
const isStudent = computed(() => roleList.value.includes('student'));
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">Campus Loans</div>
      <nav class="nav" v-if="!isLoading">
        <RouterLink to="/" class="nav-link">Devices</RouterLink>
        <RouterLink
          v-if="isAuthenticated"
          to="/my-reservations"
          class="nav-link"
        >
          {{ isStaff ? 'Student Reservations' : 'My Reservations' }}
        </RouterLink>
      </nav>
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

.nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 1.5rem;
}

.nav-link {
  color: #e5e7eb;
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.nav-link.router-link-active,
.nav-link.router-link-exact-active {
  background: rgba(59, 130, 246, 0.3);
  color: #fff;
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
