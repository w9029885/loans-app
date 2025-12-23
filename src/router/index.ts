import { createRouter, createWebHistory } from 'vue-router';
import ListInventory from '@/views/ListInventory.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: ListInventory },
  ],
});

export default router;
