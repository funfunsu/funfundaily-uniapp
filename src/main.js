import {
	createSSRApp
} from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
export function createApp() {
	const app = createSSRApp(App);
	// Pinia 必须在任何 store 被使用前注册，理财计划等模块依赖此装配。
	app.use(createPinia());
	app.config.globalProperties.$myGlobalVar = {
		needRefreshTask: false,
		userInfo: null
	};
	return {
		app,
	};
}
