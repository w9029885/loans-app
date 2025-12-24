export interface AppConfig {
  apiBaseUrl: string;
  auth0: {
    domain: string;
    clientId: string;
    audience?: string;
    rolesClaim?: string;
  };
}

export function loadAppConfig(): AppConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  const apiBaseUrl = env.VITE_API_BASE_URL || '/';
  const domain = env.VITE_AUTH0_DOMAIN || '';
  const clientId = env.VITE_AUTH0_CLIENT_ID || '';
  const audience = env.VITE_AUTH0_AUDIENCE || undefined;
  const rolesClaim = env.VITE_AUTH0_ROLES_CLAIM || undefined;

  return {
    apiBaseUrl,
    auth0: { domain, clientId, audience, rolesClaim },
  };
}

export const appConfig = loadAppConfig();

export function buildAuth0Options(cfg: AppConfig) {
  return {
    domain: cfg.auth0.domain,
    clientId: cfg.auth0.clientId,
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: cfg.auth0.audience,
      scope: 'openid profile email read:devices write:devices',
    },
    cacheLocation: 'localstorage' as const,
    useRefreshTokens: true,
  };
}
