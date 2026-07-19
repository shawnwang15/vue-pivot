import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import SuperstoreDemo from './demos/SuperstoreDemo.vue'
import VirtualPocDemo from './demos/VirtualPocDemo.vue'
import InteractionDemo from './demos/InteractionDemo.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: SuperstoreDemo },
    { path: '/poc', component: VirtualPocDemo },
    { path: '/interaction', component: InteractionDemo },
  ],
})

createApp(App).use(router).mount('#app')
