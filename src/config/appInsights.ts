import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { appConfig } from './appConfig';

let appInsights: ApplicationInsights | null = null;

/**
 * Initialize (or return existing) Application Insights instance.
 * Only runs when a connection string is provided.
 */
export function initializeAppInsights(): ApplicationInsights | null {
  if (appInsights) return appInsights;

  // Unit tests should not initialize real telemetry.
  // This avoids requiring secrets in CI and prevents the SDK from throwing in jsdom.
  if (import.meta.env.MODE === 'test') {
    return null;
  }

  if (!appConfig.appInsightsConnectionString) {
    console.warn('App Insights connection string not configured');
    return null;
  }

  try {
    appInsights = new ApplicationInsights({
      config: {
        connectionString: appConfig.appInsightsConnectionString,
        enableAutoRouteTracking: true,
        disableFetchTracking: false,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
        // Exclude Auth0 domains from correlation headers to avoid CORS issues
        correlationHeaderExcludedDomains: [
          '*.auth0.com',
          'auth-lab-ao01.uk.auth0.com',
        ],
      },
    });

    appInsights.loadAppInsights();
    console.log('App Insights initialized');
    return appInsights;
  } catch (err) {
    console.warn('App Insights failed to initialize', err);
    appInsights = null;
    return null;
  }
}

export function getAppInsights(): ApplicationInsights | null {
  return appInsights;
}
