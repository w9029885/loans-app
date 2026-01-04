import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { appConfig } from './appConfig';

let appInsights: ApplicationInsights | null = null;

/**
 * Initialize (or return existing) Application Insights instance.
 * Only runs when a connection string is provided.
 */
export function initializeAppInsights(): ApplicationInsights | null {
  if (appInsights) return appInsights;

  if (!appConfig.appInsightsConnectionString) {
    console.warn('App Insights connection string not configured');
    return null;
  }

  appInsights = new ApplicationInsights({
    config: {
      connectionString: appConfig.appInsightsConnectionString,
      enableAutoRouteTracking: true,
      disableFetchTracking: false,
      enableCorsCorrelation: true,
      enableRequestHeaderTracking: true,
      enableResponseHeaderTracking: true,
    },
  });

  appInsights.loadAppInsights();
  console.log('App Insights initialized');
  return appInsights;
}

export function getAppInsights(): ApplicationInsights | null {
  return appInsights;
}
