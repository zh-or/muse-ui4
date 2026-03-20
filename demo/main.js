
import {createApp} from 'vue';
import MuseUI from '../src';
import App from './App.vue';

Vue.use(MuseUI);

const app = new createApp(App);

app.$mount('#app');
