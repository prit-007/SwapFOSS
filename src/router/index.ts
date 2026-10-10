import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type Router,
} from "vue-router";
import SiteLayout from "@/components/layout/SiteLayout.vue";
import BrowseView from "@/views/BrowseView.vue";
import BatchView from "@/views/BatchView.vue";
import CreateView from "@/views/CreateView.vue";
import CardView from "@/views/CardView.vue";
import SlideView from "@/views/SlideView.vue";
import NotFoundView from "@/views/NotFoundView.vue";

export const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: SiteLayout,
    children: [
      { path: "", name: "home", component: BrowseView },
      { path: "batch", name: "batch", component: BatchView },
      { path: "create", name: "create", component: CreateView },
    ],
  },
  { path: "/card", name: "card", component: CardView },
  { path: "/slide", name: "slide", component: SlideView },
  { path: "/:pathMatch(.*)*", name: "not-found", component: NotFoundView },
];

export function createAppRouter(): Router {
  return createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior: () => ({ top: 0 }),
  });
}

export default createAppRouter();
