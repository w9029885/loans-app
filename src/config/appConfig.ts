export interface AppConfig {
  apiBaseUrl: string;
  auth0: {
    domain: string;
    clientId: string;
    audience?: string;
    rolesClaim?: string;
  };
  appInsightsConnectionString?: string;
}

export function loadAppConfig(): AppConfig {
  const env = import.meta.env as Record<string, string | undefined>;
  const apiBaseUrl = env.VITE_API_BASE_URL || '/';
  const domain = env.VITE_AUTH0_DOMAIN || '';
  const clientId = env.VITE_AUTH0_CLIENT_ID || '';
  const audience = env.VITE_AUTH0_AUDIENCE || undefined;
  const rolesClaim = env.VITE_AUTH0_ROLES_CLAIM || undefined;
  const appInsightsConnectionString = env.VITE_APPINSIGHTS_CONNECTION_STRING || undefined;

  return {
    apiBaseUrl,
    auth0: { domain, clientId, audience, rolesClaim },
    appInsightsConnectionString,
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
      scope: 'openid profile email',
    },
    cacheLocation: 'localstorage' as const,
  };
}
