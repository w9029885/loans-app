import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { buildInventoryUses, INVENTORY_KEY } from './config/appServices';

const app = createApp(App);

app.use(router);

// Provide bound inventory use cases to the app's DI container
app.provide(INVENTORY_KEY, buildInventoryUses());

app.mount('#app');
