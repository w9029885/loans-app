import { initializeAppInsights } from '@/config/appInsights';

export type Telemetry = {
  trackPageView: (name: string, uri?: string) => void;
  trackEvent: (name: string, properties?: Record<string, any>) => void;
  trackException: (exception: Error, properties?: Record<string, any>) => void;
  trackDependency: (
    name: string,
    data: string,
    durationMs: number,
    success: boolean,
    resultCode?: number,
    properties?: Record<string, any>
  ) => void;
  trackMetric: (name: string, value: number, properties?: Record<string, any>) => void;
};

const noop: Telemetry = {
  trackPageView() {},
  trackEvent() {},
  trackException() {},
  trackDependency() {},
  trackMetric() {},
};

/**
 * Lightweight wrapper around Application Insights for components and services.
 */
export function useTelemetry(): Telemetry {
  const insights = initializeAppInsights();
  if (!insights) return noop;

  return {
    trackPageView(name: string, uri?: string) {
      insights.trackPageView({ name, uri });
    },
    trackEvent(name: string, properties?: Record<string, any>) {
      insights.trackEvent({ name, properties });
    },
    trackException(exception: Error, properties?: Record<string, any>) {
      insights.trackException({ exception, properties });
    },
    trackDependency(
      name: string,
      data: string,
      durationMs: number,
      success: boolean,
      resultCode?: number,
      properties?: Record<string, any>
    ) {
      insights.trackDependencyData({
        id: `${name}-${Date.now()}`,
        name,
        data,
        duration: durationMs,
        success,
        responseCode: resultCode ?? 0,
        type: 'Fetch',
        properties,
      });
    },
    trackMetric(name: string, value: number, properties?: Record<string, any>) {
      insights.trackMetric({ name, average: value }, properties);
    },
  };
}
