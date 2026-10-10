import { describe, it, expect } from "vitest";
import { PRESETS, typeScale } from "./presets";
import { highlightHtml } from "./highlight";
import { generateCaption } from "./caption";
import type { Post, Tool } from "@/types";

describe("PRESETS", () => {
  it("exposes the three platform presets with pixel sizes", () => {
    expect(Object.keys(PRESETS).sort()).toEqual(["instagram", "linkedin", "twitter"]);
    expect(PRESETS.linkedin).toEqual({ width: 1080, height: 1350, label: "LinkedIn" });
    expect(PRESETS.instagram).toEqual({ width: 1080, height: 1080, label: "Instagram" });
    expect(PRESETS.twitter).toEqual({ width: 1200, height: 675, label: "Twitter / X" });
  });

  it("has no entry for an unknown key", () => {
    expect((PRESETS as Record<string, unknown>).nope).toBeUndefined();
  });
});

describe("typeScale", () => {
  it("is 1:1 for a 1350-tall preset", () => {
    expect(typeScale(PRESETS.linkedin)).toEqual({ h1: 80, sub: 26, wm: 320, cta: 19 });
  });

  it("scales down for instagram (1080)", () => {
    expect(typeScale(PRESETS.instagram)).toEqual({ h1: 64, sub: 21, wm: 256, cta: 15 });
  });

  it("clamps the scale to a 0.62 floor", () => {
    expect(typeScale(PRESETS.twitter)).toEqual({ h1: 50, sub: 16, wm: 198, cta: 15 });
  });
});

describe("highlightHtml", () => {
  const gradient =
    "background:linear-gradient(135deg,#FF5A5F,#FFC857);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;";

  it("wraps an explicit highlight word with a custom colour", () => {
    expect(highlightHtml("Own your media", "#FF5A5F", "#FFC857", { word: "media", color: "#6BCB77" })).toBe(
      'Own your <span style="color:#6BCB77;-webkit-text-fill-color:#6BCB77;">media</span>',
    );
  });

  it("wraps an explicit highlight word with the gradient when no colour is set", () => {
    expect(highlightHtml("Own your media", "#FF5A5F", "#FFC857", { word: "media" })).toBe(
      `Own your <span style="${gradient}">media</span>`,
    );
  });

  it("falls back to the last word with the gradient", () => {
    expect(highlightHtml("Own your media", "#FF5A5F", "#FFC857")).toBe(
      `Own your <span style="${gradient}">media</span>`,
    );
  });

  it("returns the text unchanged when there is no space and no highlight", () => {
    expect(highlightHtml("Media", "#FF5A5F", "#FFC857")).toBe("Media");
  });

  it("ignores a highlight word that is not present", () => {
    expect(highlightHtml("Own your media", "#FF5A5F", "#FFC857", { word: "cloud" })).toBe(
      `Own your <span style="${gradient}">media</span>`,
    );
  });
});

describe("generateCaption", () => {
  const tools = [
    { id: "jellyfin", name: "Jellyfin", insteadOf: "Plex / Netflix", hook: "Your own media server" },
    { id: "streamio", name: "Stremio", insteadOf: "Netflix", hook: "Stream everything" },
  ] as Tool[];

  const post = {
    id: "post-001",
    title: "Media",
    intro: { eyebrow: "Free", headline: "Own your media", subhead: "x" },
    tools: ["jellyfin", "streamio"],
    outro: { headline: "y", subhead: "z" },
  } as Post;

  it("builds the caption with headline, replacements, and per-tool hooks", () => {
    const caption = generateCaption(post, tools);
    expect(caption).toContain("Own your media");
    expect(caption).toContain("2 tools that replace Plex and Netflix.");
    expect(caption).toContain("• Jellyfin — Your own media server");
    expect(caption).toContain("• Stremio — Stream everything");
    expect(caption).toContain("All free. All open-source. No subscriptions. No tracking.");
  });

  it("joins two unique replacements with 'and'", () => {
    const one = [{ id: "a", name: "A", insteadOf: "Netflix", hook: "h" }] as Tool[];
    const p = { ...post, tools: ["a"] };
    expect(generateCaption(p, one)).toContain("1 tools that replace Netflix.");
  });
});
