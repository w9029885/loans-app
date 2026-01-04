/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_AUTH0_DOMAIN?: string;
  readonly VITE_AUTH0_CLIENT_ID?: string;
  readonly VITE_AUTH0_AUDIENCE?: string;
  readonly VITE_AUTH0_ROLES_CLAIM?: string;
  readonly VITE_INVENTORY_SERVICE?: string;
  readonly VITE_INVENTORY_BASE_URL?: string;
  readonly VITE_USE_SEED_DATA?: string;
  readonly VITE_APPINSIGHTS_CONNECTION_STRING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
