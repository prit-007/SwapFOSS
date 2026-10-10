import { defineStore } from "pinia";
import { loadCategories, loadTools } from "@/data/catalog";
import type { Categories, Tool } from "@/types";

function haystack(tool: Tool): string {
  return [
    tool.name,
    tool.insteadOf,
    tool.hook,
    tool.setup,
    tool.details || "",
    ...(tool.features || []),
  ]
    .join(" ")
    .toLowerCase();
}

export const useCatalogStore = defineStore("catalog", {
  state: () => ({
    tools: [] as Tool[],
    categories: {} as Categories,
    loading: false,
    error: null as string | null,
  }),
  getters: {
    categoryIds: (s): string[] => Object.keys(s.categories),
    byCategory: (s) => (category: string): Tool[] =>
      category === "all" ? s.tools : s.tools.filter((t) => t.category === category),
    countFor: (s) => (category: string): number =>
      category === "all" ? s.tools.length : s.tools.filter((t) => t.category === category).length,
    matches: (s) => (q: string): Tool[] => {
      const query = q.trim().toLowerCase();
      if (!query) return s.tools;
      return s.tools.filter((t) => haystack(t).includes(query));
    },
    query: (s) => ({ category, q }: { category: string; q: string }): Tool[] => {
      const query = q.trim().toLowerCase();
      return s.tools.filter((t) => {
        const matchCat = category === "all" || t.category === category;
        const matchQ = !query || haystack(t).includes(query);
        return matchCat && matchQ;
      });
    },
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = null;
      try {
        const [categories, tools] = await Promise.all([loadCategories(), loadTools()]);
        this.categories = categories;
        this.tools = tools;
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.loading = false;
      }
    },
  },
});
