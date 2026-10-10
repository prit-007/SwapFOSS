import { defineStore } from "pinia";
import { loadCategories, loadPopularity, loadTools } from "@/data/catalog";
import type { Categories, Difficulty, PopularityEntry, Tool } from "@/types";

export type SortKey = "featured" | "popular" | "az" | "za" | "difficulty";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "popular", label: "Most popular" },
  { key: "az", label: "Name (A–Z)" },
  { key: "za", label: "Name (Z–A)" },
  { key: "difficulty", label: "Easiest first" },
];

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

export function isSortKey(value: unknown): value is SortKey {
  return SORT_OPTIONS.some((o) => o.key === value);
}

/** Sort a copy of the tool list. "featured" keeps the curated manifest order. */
export function sortTools(tools: Tool[], sort: SortKey): Tool[] {
  const copy = [...tools];
  switch (sort) {
    case "popular":
      return copy.sort(
        (a, b) => (b.stars ?? -1) - (a.stars ?? -1) || a.name.localeCompare(b.name),
      );
    case "az":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "za":
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case "difficulty":
      return copy.sort(
        (a, b) =>
          DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
          a.name.localeCompare(b.name),
      );
    default:
      return copy;
  }
}

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
    popularity: {} as Record<string, PopularityEntry>,
    loading: false,
    error: null as string | null,
  }),
  getters: {
    categoryIds: (s): string[] => Object.keys(s.categories),
    byCategory: (s) => (category: string): Tool[] =>
      category === "all" ? s.tools : s.tools.filter((t) => t.category === category),
    countFor: (s) => (category: string): number =>
      category === "all" ? s.tools.length : s.tools.filter((t) => t.category === category).length,
    /** Total stars across all tools that have a GitHub repo. */
    totalStars: (s): number =>
      s.tools.reduce((sum, t) => sum + (t.stars ?? 0), 0),
    matches: (s) => (q: string): Tool[] => {
      const query = q.trim().toLowerCase();
      if (!query) return s.tools;
      return s.tools.filter((t) => haystack(t).includes(query));
    },
    query:
      (s) =>
      ({ category, q, sort = "featured" }: { category: string; q: string; sort?: SortKey }): Tool[] => {
        const query = q.trim().toLowerCase();
        const filtered = s.tools.filter((t) => {
          const matchCat = category === "all" || t.category === category;
          const matchQ = !query || haystack(t).includes(query);
          return matchCat && matchQ;
        });
        return sortTools(filtered, sort);
      },
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = null;
      try {
        const [categories, tools, popularity] = await Promise.all([
          loadCategories(),
          loadTools(),
          loadPopularity(),
        ]);
        this.categories = categories;
        this.popularity = popularity?.tools ?? {};
        this.tools = tools.map((t) => ({
          ...t,
          stars: this.popularity[t.id]?.stars ?? null,
        }));
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      } finally {
        this.loading = false;
      }
    },
  },
});
