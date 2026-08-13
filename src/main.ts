import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@mdi/font/css/materialdesignicons.min.css'
import 'material-inspired-component-library/dist/micl.css'
import 'material-inspired-component-library/dist/micl'
import './styles/global.css'
import './styles/app.css'

createApp(App).use(createPinia()).use(router).mount('#app')
