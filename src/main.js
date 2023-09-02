import { createApp } from 'vue'
import 'vue3-confirm-dialog/style';
import Vue3ConfirmDialog from 'vue3-confirm-dialog';
import App from './App.vue'

const app = createApp(App);
app.use(Vue3ConfirmDialog);
app.component('vue3-confirm-dialog', Vue3ConfirmDialog.default);
app.mount('#app')
