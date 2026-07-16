import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import 'leaflet/dist/leaflet.css'   // ← AGREGA ESTA LÍNEA
import './style.css'

createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')