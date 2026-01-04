import { createApp } from 'vue';
import { createAuth0 } from '@auth0/auth0-vue';
import App from './App.vue';
import router from './router';
import { appConfig, buildAuth0Options } from './config/appConfig';
import { buildInventoryUses, INVENTORY_KEY } from './config/appServices';
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

const auth0Plugin = createAuth0(buildAuth0Options(appConfig));
app.use(auth0Plugin);

// Optionally provide config for injection
app.provide('appConfig', appConfig);

app.use(router);

// Provide bound inventory use cases to the app's DI container
const authTokenProvider = async (): Promise<string | null> => {
	try {
		const anyApp = app as any;
		const auth0 = anyApp.config?.globalProperties?.$auth0;
		if (!auth0) return null;
		return await auth0.getAccessTokenSilently();
	} catch {
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

app.mount('#app');
