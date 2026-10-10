import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadJSON, resolveDataPath } from "./api";
import {
  toolSchema,
  categoriesSchema,
  postSchema,
  toolManifestSchema,
} from "./validation";
import { loadCategories, loadTools, loadPosts } from "./catalog";

const validTool = {
  id: "jellyfin",
  name: "Jellyfin",
  category: "media",
  insteadOf: "Plex",
  hook: "Your own server",
  bullets: ["a", "b"],
  features: ["Self-hosted"],
  setupSteps: ["Install"],
  details: "Long text",
  setup: "Self-hosted",
  difficulty: "medium",
  link: "https://jellyfin.org",
  repo: "https://github.com/jellyfin/jellyfin",
  logo: "assets/logos/jellyfin.svg",
  screenshot: "assets/screenshots/jellyfin.png",
  screenshotType: "landscape",
};

describe("loadJSON", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns parsed JSON on a successful response", async () => {
    const spy = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ hi: 1 }) });
    vi.stubGlobal("fetch", spy);
    await expect(loadJSON<{ hi: number }>("data/x.json")).resolves.toEqual({ hi: 1 });
    expect(spy).toHaveBeenCalledWith(resolveDataPath("data/x.json"));
  });

  it("throws with the path when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(loadJSON("data/missing.json")).rejects.toThrow("data/missing.json");
  });
});

describe("resolveDataPath", () => {
  it("anchors relative paths to the deploy base", () => {
    expect(resolveDataPath("data/manifest.json")).toBe(
      `${import.meta.env.BASE_URL}data/manifest.json`,
    );
  });

  it("does not double the base when given an absolute path", () => {
    expect(resolveDataPath("/data/manifest.json")).toBe(
      `${import.meta.env.BASE_URL}data/manifest.json`,
    );
  });
});

describe("validation schemas", () => {
  it("accepts a complete tool", () => {
    expect(toolSchema.parse(validTool).id).toBe("jellyfin");
  });

  it("rejects a tool with an unknown difficulty", () => {
    expect(() => toolSchema.parse({ ...validTool, difficulty: "impossible" })).toThrow();
  });

  it("rejects a tool missing a required field", () => {
    const { name, ...rest } = validTool;
    expect(() => toolSchema.parse(rest)).toThrow();
    void name;
  });

  it("accepts categories keyed by id", () => {
    const cats = categoriesSchema.parse({ media: { label: "Media", color: "#fff" } });
    expect(cats.media.label).toBe("Media");
  });

  it("requires a post to reference at least one tool", () => {
    const base = {
      id: "post-001",
      title: "T",
      intro: { eyebrow: "e", headline: "h", subhead: "s" },
      outro: { headline: "h", subhead: "s" },
    };
    expect(() => postSchema.parse({ ...base, tools: [] })).toThrow();
    expect(postSchema.parse({ ...base, tools: ["jellyfin"] }).tools).toEqual(["jellyfin"]);
  });

  it("allows a deep-dive format but rejects unknown formats", () => {
    const post = {
      id: "post-006",
      title: "T",
      intro: { eyebrow: "e", headline: "h", subhead: "s" },
      tools: ["jellyfin"],
      outro: { headline: "h", subhead: "s" },
    };
    expect(postSchema.parse({ ...post, format: "deep-dive" }).format).toBe("deep-dive");
    expect(() => postSchema.parse({ ...post, format: "carousel" })).toThrow();
  });

  it("validates the tool manifest shape", () => {
    expect(toolManifestSchema.parse({ tools: ["a", "b"] }).tools).toHaveLength(2);
    expect(() => toolManifestSchema.parse({ tools: "a" })).toThrow();
  });
});

describe("catalog loaders", () => {
  beforeEach(() => {
    const responses: Record<string, unknown> = {
      [resolveDataPath("data/manifest.json")]: { tools: ["jellyfin", "streamio"] },
      [resolveDataPath("data/categories.json")]: { media: { label: "Media", color: "#FF5A5F" } },
      [resolveDataPath("data/tools/jellyfin.json")]: validTool,
      [resolveDataPath("data/tools/streamio.json")]: { ...validTool, id: "streamio", name: "Stremio" },
      [resolveDataPath("data/posts-manifest.json")]: { posts: ["post-001"] },
      [resolveDataPath("data/posts/post-001.json")]: {
        id: "post-001",
        title: "T",
        intro: { eyebrow: "e", headline: "h", subhead: "s" },
        tools: ["jellyfin"],
        outro: { headline: "h", subhead: "s" },
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) =>
        Promise.resolve({
          ok: path in responses,
          json: async () => responses[path],
        }),
      ),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads and validates categories", async () => {
    const cats = await loadCategories();
    expect(cats.media.color).toBe("#FF5A5F");
  });

  it("loads every tool listed in the manifest, in order", async () => {
    const tools = await loadTools();
    expect(tools.map((t) => t.id)).toEqual(["jellyfin", "streamio"]);
  });

  it("loads every post listed in the posts manifest", async () => {
    const posts = await loadPosts();
    expect(posts.map((p) => p.id)).toEqual(["post-001"]);
  });

  it("throws when the manifest lists a missing tool", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((path: string) =>
        Promise.resolve({ ok: !path.includes("ghost"), json: async () => ({ tools: ["ghost"] }) }),
      ),
    );
    await expect(loadTools()).rejects.toThrow();
  });
});
