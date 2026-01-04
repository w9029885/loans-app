import { createRouter, createWebHistory } from 'vue-router';
import ListInventory from '@/views/ListInventory.vue';
import MyReservations from '@/views/MyReservations.vue';
import StaffReservations from '@/views/StaffReservations.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: ListInventory },
    { path: '/my-reservations', name: 'myReservations', component: MyReservations },
    { path: '/staff/reservations', name: 'staffReservations', component: StaffReservations },
  ],
});

export default router;
