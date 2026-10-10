import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

vi.mock("@/data/catalog", () => ({
  loadCategories: vi.fn(),
  loadTools: vi.fn(),
  loadPopularity: vi.fn(),
}));

import { loadCategories, loadPopularity, loadTools } from "@/data/catalog";
import { sortTools, useCatalogStore } from "./catalog";
import type { Popularity, Tool } from "@/types";

const mockLoadCategories = vi.mocked(loadCategories);
const mockLoadTools = vi.mocked(loadTools);
const mockLoadPopularity = vi.mocked(loadPopularity);

const tools: Tool[] = [
  {
    id: "jellyfin",
    name: "Jellyfin",
    category: "media",
    insteadOf: "Plex",
    hook: "Your own media server",
    features: ["Self-hosted"],
    setup: "Self-hosted",
    difficulty: "medium",
    link: "https://jellyfin.org",
    repo: "https://github.com/jellyfin/jellyfin",
  },
  {
    id: "bitwarden",
    name: "Bitwarden",
    category: "security",
    insteadOf: "1Password",
    hook: "Open-source password manager",
    features: ["Cross-platform"],
    setup: "Cloud or self-hosted",
    difficulty: "easy",
    link: "https://bitwarden.com",
    repo: "https://github.com/bitwarden",
  },
];

const categories = {
  media: { label: "Media & Streaming", color: "#FF5A5F" },
  security: { label: "Security & Privacy", color: "#2DD4BF" },
};

const emptyPopularity: Popularity = { tools: {} };

describe("catalog store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockLoadCategories.mockReset();
    mockLoadTools.mockReset();
    mockLoadPopularity.mockReset();
    mockLoadPopularity.mockResolvedValue(emptyPopularity);
  });

  it("loads tools and categories", async () => {
    mockLoadCategories.mockResolvedValue(categories);
    mockLoadTools.mockResolvedValue(tools);
    const catalog = useCatalogStore();
    await catalog.load();
    expect(catalog.tools).toHaveLength(2);
    expect(catalog.categories.media.label).toBe("Media & Streaming");
    expect(catalog.loading).toBe(false);
    expect(catalog.error).toBeNull();
  });

  it("captures an error message when loading fails", async () => {
    mockLoadCategories.mockRejectedValue(new Error("boom"));
    mockLoadTools.mockResolvedValue([]);
    const catalog = useCatalogStore();
    await catalog.load();
    expect(catalog.error).toBeTruthy();
    expect(catalog.loading).toBe(false);
  });

  it("filters tools by category", async () => {
    mockLoadCategories.mockResolvedValue(categories);
    mockLoadTools.mockResolvedValue(tools);
    const catalog = useCatalogStore();
    await catalog.load();
    expect(catalog.byCategory("media").map((t) => t.id)).toEqual(["jellyfin"]);
    expect(catalog.byCategory("all")).toHaveLength(2);
  });

  it("counts tools per category and overall", async () => {
    mockLoadCategories.mockResolvedValue(categories);
    mockLoadTools.mockResolvedValue(tools);
    const catalog = useCatalogStore();
    await catalog.load();
    expect(catalog.countFor("media")).toBe(1);
    expect(catalog.countFor("all")).toBe(2);
  });

  it("searches name, alternative, hook, features and setup", async () => {
    mockLoadCategories.mockResolvedValue(categories);
    mockLoadTools.mockResolvedValue(tools);
    const catalog = useCatalogStore();
    await catalog.load();
    expect(catalog.matches("bitwarden").map((t) => t.id)).toEqual(["bitwarden"]);
    expect(catalog.matches("1password").map((t) => t.id)).toEqual(["bitwarden"]);
    expect(catalog.matches("media server").map((t) => t.id)).toEqual(["jellyfin"]);
    expect(catalog.matches("")).toHaveLength(2);
  });

  it("filters by category and query together", async () => {
    mockLoadCategories.mockResolvedValue(categories);
    mockLoadTools.mockResolvedValue(tools);
    const catalog = useCatalogStore();
    await catalog.load();
    expect(catalog.query({ category: "security", q: "jellyfin" })).toEqual([]);
    expect(catalog.query({ category: "security", q: "password" }).map((t) => t.id)).toEqual([
      "bitwarden",
    ]);
  });

  it("merges star counts from popularity data", async () => {
    mockLoadCategories.mockResolvedValue(categories);
    mockLoadTools.mockResolvedValue(tools);
    mockLoadPopularity.mockResolvedValue({
      tools: {
        jellyfin: { repo: "jellyfin/jellyfin", host: "github", stars: 100 },
        bitwarden: { repo: "bitwarden/clients", host: "github", stars: null },
      },
    });
    const catalog = useCatalogStore();
    await catalog.load();
    expect(catalog.tools.find((t) => t.id === "jellyfin")?.stars).toBe(100);
    expect(catalog.tools.find((t) => t.id === "bitwarden")?.stars).toBeNull();
    expect(catalog.totalStars).toBe(100);
  });

  it("sorts by popularity, name, and difficulty", async () => {
    mockLoadCategories.mockResolvedValue(categories);
    mockLoadTools.mockResolvedValue(tools);
    mockLoadPopularity.mockResolvedValue({
      tools: {
        jellyfin: { repo: "jellyfin/jellyfin", host: "github", stars: 10 },
        bitwarden: { repo: "bitwarden/clients", host: "github", stars: 999 },
      },
    });
    const catalog = useCatalogStore();
    await catalog.load();
    expect(catalog.query({ category: "all", q: "", sort: "popular" }).map((t) => t.id)).toEqual([
      "bitwarden",
      "jellyfin",
    ]);
    expect(catalog.query({ category: "all", q: "", sort: "az" }).map((t) => t.id)).toEqual([
      "bitwarden",
      "jellyfin",
    ]);
    expect(catalog.query({ category: "all", q: "", sort: "za" }).map((t) => t.id)).toEqual([
      "jellyfin",
      "bitwarden",
    ]);
    expect(catalog.query({ category: "all", q: "", sort: "difficulty" }).map((t) => t.id)).toEqual([
      "bitwarden",
      "jellyfin",
    ]);
  });

  it("sortTools keeps featured order and puts unknown stars last", () => {
    const a: Tool = { ...tools[0], id: "a", name: "Alpha", stars: null };
    const b: Tool = { ...tools[0], id: "b", name: "Beta", stars: 5 };
    const c: Tool = { ...tools[0], id: "c", name: "Gamma", stars: 50 };
    expect(sortTools([a, b, c], "featured").map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(sortTools([a, b, c], "popular").map((t) => t.id)).toEqual(["c", "b", "a"]);
    expect(sortTools([a, b, c], "az").map((t) => t.id)).toEqual(["a", "b", "c"]);
  });
});
