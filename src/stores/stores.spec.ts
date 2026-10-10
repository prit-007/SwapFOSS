import { describe, it, expect, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useDraftsStore } from "./drafts";
import { useBatchStore, PIN } from "./batch";
import type { Post } from "@/types";

const post = (id: string, title = "T"): Post => ({
  id,
  title,
  intro: { eyebrow: "e", headline: "h", subhead: "s" },
  tools: ["jellyfin"],
  outro: { headline: "h", subhead: "s" },
});

describe("drafts store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("starts empty and can load persisted drafts", () => {
    const drafts = useDraftsStore();
    expect(drafts.drafts).toEqual([]);
    localStorage.setItem("swapfoss-drafts", JSON.stringify([post("post-004")]));
    drafts.load();
    expect(drafts.drafts.map((d) => d.id)).toEqual(["post-004"]);
  });

  it("saves a new draft and persists it to localStorage", () => {
    const drafts = useDraftsStore();
    drafts.save(post("post-004"));
    expect(drafts.drafts).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("swapfoss-drafts")!)[0].id).toBe("post-004");
  });

  it("updates an existing draft in place by id", () => {
    const drafts = useDraftsStore();
    drafts.save(post("post-004", "first"));
    drafts.save(post("post-004", "second"));
    expect(drafts.drafts).toHaveLength(1);
    expect(drafts.drafts[0].title).toBe("second");
  });

  it("removes a draft and persists the removal", () => {
    const drafts = useDraftsStore();
    drafts.save(post("post-004"));
    drafts.save(post("post-005"));
    drafts.remove("post-004");
    expect(drafts.drafts.map((d) => d.id)).toEqual(["post-005"]);
    expect(JSON.parse(localStorage.getItem("swapfoss-drafts")!)).toHaveLength(1);
  });

  it("suggests the smallest unused post id", () => {
    const drafts = useDraftsStore();
    expect(drafts.nextId(["post-001", "post-003"])).toBe("post-002");
    drafts.save(post("post-002"));
    expect(drafts.nextId(["post-001", "post-003"])).toBe("post-004");
  });

  it("ignores corrupt localStorage without throwing", () => {
    localStorage.setItem("swapfoss-drafts", "{not json");
    const drafts = useDraftsStore();
    expect(() => drafts.load()).not.toThrow();
    expect(drafts.drafts).toEqual([]);
  });
});

describe("batch store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    sessionStorage.clear();
  });

  it("exposes the shared PIN", () => {
    expect(PIN).toBe("swapfoss2026");
  });

  it("defaults preset to linkedin and theme to off", () => {
    const batch = useBatchStore();
    expect(batch.presetFor("post-001")).toBe("linkedin");
    expect(batch.themeFor("post-001")).toBe(false);
  });

  it("tracks per-post preset and theme", () => {
    const batch = useBatchStore();
    batch.setPreset("post-001", "instagram");
    batch.toggleTheme("post-001");
    expect(batch.presetFor("post-001")).toBe("instagram");
    expect(batch.themeFor("post-001")).toBe(true);
    batch.toggleTheme("post-001");
    expect(batch.themeFor("post-001")).toBe(false);
  });

  it("applies a bulk preset and bulk theme to every listed post", () => {
    const batch = useBatchStore();
    const ids = ["post-001", "post-002"];
    batch.setBulkPreset("twitter", ids);
    batch.setBulkTheme(true, ids);
    expect(ids.map((id) => batch.presetFor(id))).toEqual(["twitter", "twitter"]);
    expect(ids.map((id) => batch.themeFor(id))).toEqual([true, true]);
    expect(batch.bulkPreset).toBe("twitter");
    expect(batch.bulkTheme).toBe(true);
  });

  it("persists and restores the session PIN preference", () => {
    const batch = useBatchStore();
    batch.setPinRemember(true);
    expect(sessionStorage.getItem("swapfoss-fill-pin")).toBe("1");
    const fresh = createPinia();
    setActivePinia(fresh);
    const restored = useBatchStore();
    restored.restorePinRemember();
    expect(restored.pinRemember).toBe(true);
  });
});
