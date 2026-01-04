import { createApp } from 'vue';
import { createAuth0 } from '@auth0/auth0-vue';
import App from './App.vue';
import router from './router';
import { appConfig, buildAuth0Options } from './config/appConfig';
import { buildInventoryUses, INVENTORY_KEY, buildReservationUses, RESERVATION_KEY } from './config/appServices';
import { initializeAppInsights } from './config/appInsights';
import { useTelemetry } from './composables/useTelemetry';

const app = createApp(App);

initializeAppInsights();
const telemetry = useTelemetry();

router.afterEach((to) => {
	const name =
		typeof to.name === 'string'
			? to.name
			: to.name?.toString() || to.path || window.location.pathname;
	telemetry.trackPageView(name, to.fullPath || window.location.pathname);
});

// Set up router BEFORE auth0 so callback handling works
app.use(router);

// Create and use Auth0 plugin
const auth0Options = buildAuth0Options(appConfig);
console.log('Auth0 config:', { domain: auth0Options.domain, clientId: auth0Options.clientId, redirectUri: auth0Options.authorizationParams.redirect_uri });
const auth0Plugin = createAuth0(auth0Options);
app.use(auth0Plugin);

// Optionally provide config for injection
app.provide('appConfig', appConfig);

// Provide bound inventory use cases to the app's DI container
const authTokenProvider = async (): Promise<string | null> => {
	try {
		const anyApp = app as any;
		const auth0 = anyApp.config?.globalProperties?.$auth0;
		if (!auth0) {
			console.log('[AuthTokenProvider] Auth0 not available');
			return null;
		}
		if (!auth0.isAuthenticated?.value) {
			console.log('[AuthTokenProvider] User not authenticated');
			return null;
		}
		console.log('[AuthTokenProvider] Requesting token for audience:', appConfig.auth0.audience);
		// Try to get token silently, with consent handling
		const token = await auth0.getAccessTokenSilently({
			authorizationParams: {
				audience: appConfig.auth0.audience,
				scope: 'openid profile email',
			},
		});
		console.log('[AuthTokenProvider] Token acquired, length:', token?.length);
		return token;
	} catch (err: any) {
		// If consent is required, we can't get the token silently
		// The user will need to re-login
		console.error('[AuthTokenProvider] Token acquisition failed:', err?.error || err?.message, err);
		return null;
	}
};

// Prefer explicit inventory base URL; fall back to API base URL; otherwise undefined
const inventoryBaseUrl =
	(import.meta.env.VITE_INVENTORY_BASE_URL as string | undefined) ||
	appConfig.apiBaseUrl ||
	undefined;

app.provide(
	INVENTORY_KEY,
	buildInventoryUses({
		apiBaseUrl: inventoryBaseUrl,
		authTokenProvider,
	}),
);

// Prefer explicit reservation base URL; fall back to API base URL; otherwise undefined
const reservationBaseUrl =
	(import.meta.env.VITE_RESERVATION_BASE_URL as string | undefined) ||
	appConfig.apiBaseUrl ||
	undefined;

app.provide(
	RESERVATION_KEY,
	buildReservationUses({
		apiBaseUrl: reservationBaseUrl,
		authTokenProvider,
	}),
);

app.mount('#app');
