import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { createAppRouter } from "./router";
import reveal from "./directives/reveal";
import "../css/fonts.css";
import "../css/styles.css";
import "./styles/main.css";

const app = createApp(App);
app.use(createPinia());
app.use(createAppRouter());
app.directive("reveal", reveal);
app.mount("#app");
