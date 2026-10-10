import { describe, it, expect } from "vitest";
import {
  DEEP_PARTS,
  isDeepDive,
  buildSlides,
  slideFilename,
  deepCardHTML,
} from "./deep-cards";
import { PRESETS } from "./presets";
import type { Category, Post, Tool } from "@/types";

const tool: Tool = {
  id: "umbrel",
  name: "Umbrel",
  category: "cloud",
  insteadOf: "Complicated self-hosting",
  hook: "A beautiful home server for everyone.",
  bullets: ["App store", "One-click install"],
  features: ["App store", "No terminal"],
  benefits: ["Self-hosting without the PhD", "Your data never leaves the house"],
  setupSteps: ["Flash umbrelOS", "Open umbrel.local"],
  setup: "Self-hosted",
  difficulty: "easy",
  link: "https://getumbrel.com",
  repo: "https://github.com/getumbrel/umbrel",
  logo: "assets/logos/umbrel.svg",
  screenshot: "assets/screenshots/umbrel.jpg",
  screenshotType: "landscape",
};

const cat: Category = { label: "Cloud & Self-Hosted", color: "#F472B6" };

const deepPost: Post = {
  id: "post-006",
  title: "Umbrel: self-hosting for normal people",
  format: "deep-dive",
  intro: { eyebrow: "Deep dive — Umbrel", headline: "h", subhead: "s" },
  tools: ["umbrel"],
  outro: { headline: "h", subhead: "s" },
};

const carouselPost: Post = {
  id: "post-001",
  title: "Swap Netflix for Jellyfin",
  intro: { eyebrow: "e", headline: "h", subhead: "s" },
  tools: ["jellyfin", "freetube"],
  outro: { headline: "h", subhead: "s" },
};

describe("isDeepDive", () => {
  it("detects the deep-dive format", () => {
    expect(isDeepDive(deepPost)).toBe(true);
    expect(isDeepDive(carouselPost)).toBe(false);
  });
});

describe("buildSlides", () => {
  it("expands a deep-dive post into the fixed 6-slide carousel", () => {
    const slides = buildSlides(deepPost);
    expect(slides).toHaveLength(6);
    expect(slides[0]).toEqual({ type: "intro" });
    expect(slides[5]).toEqual({ type: "outro" });
    expect(slides.slice(1, 5)).toEqual(DEEP_PARTS.map((part) => ({ type: "deep", part, tool: "umbrel" })));
  });

  it("expands a carousel post into intro + one slide per tool + outro", () => {
    const slides = buildSlides(carouselPost);
    expect(slides).toEqual([
      { type: "intro" },
      { type: "tool", tool: "jellyfin" },
      { type: "tool", tool: "freetube" },
      { type: "outro" },
    ]);
  });
});

describe("slideFilename", () => {
  it("names deep slides by tool and part", () => {
    expect(slideFilename({ type: "deep", part: "features", tool: "umbrel" }, 3, 6)).toBe(
      "03-umbrel-features.png",
    );
    expect(slideFilename({ type: "tool", tool: "jellyfin" }, 2, 4)).toBe("02-jellyfin.png");
    expect(slideFilename({ type: "intro" }, 1, 6)).toBe("01-intro.png");
  });
});

describe("deepCardHTML", () => {
  const render = (part: "hero" | "features" | "benefits" | "setup", opts = {}) =>
    deepCardHTML(part, tool, cat, { index: 2, total: 6, preset: PRESETS.linkedin, ...opts });

  it("renders the card shell with a counter and category color", () => {
    const html = render("hero");
    expect(html).toContain("export-card deep");
    expect(html).toContain("deep-hero");
    expect(html).toContain("02 / 06");
    expect(html).toContain("#F472B6");
    expect(html).toContain(`${PRESETS.linkedin.width}px`);
  });

  it("renders the hero slide with logo, swap line, hook, and screenshot", () => {
    const html = render("hero");
    expect(html).toContain("assets/logos/umbrel.svg");
    expect(html).toContain("Complicated self-hosting");
    expect(html).toContain("A beautiful home server for everyone.");
    expect(html).toContain("assets/screenshots/umbrel.jpg");
    expect(html).toContain("device-frame landscape");
  });

  it("renders features from bullets plus feature pills", () => {
    const html = render("features");
    expect(html).toContain("Everything Umbrel does");
    expect(html).toContain("App store");
    expect(html).toContain("One-click install");
    expect(html).toContain("deep-pill");
  });

  it("numbers the benefits list", () => {
    const html = render("benefits");
    expect(html).toContain("Why Umbrel is worth it");
    expect(html).toContain("deep-num");
    expect(html).toContain("01");
    expect(html).toContain("Your data never leaves the house");
  });

  it("falls back to bullets when benefits are missing", () => {
    const noBenefits = { ...tool, benefits: undefined };
    const html = deepCardHTML("benefits", noBenefits, cat, { index: 1, total: 6, preset: PRESETS.linkedin });
    expect(html).toContain("App store");
  });

  it("renders setup steps and difficulty meta pills", () => {
    const html = render("setup");
    expect(html).toContain("Set up Umbrel in 2 steps");
    expect(html).toContain("Flash umbrelOS");
    expect(html).toContain("Easy setup");
    expect(html).toContain("Self-hosted");
  });

  it("marks the light theme used by the batch exporter", () => {
    expect(render("hero", { light: true })).toContain('data-theme="light"');
    expect(render("hero", { light: false })).not.toContain('data-theme="light"');
  });
});
