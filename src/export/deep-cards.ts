import type { Category, Post, Tool } from "@/types";
import { type Preset, PRESETS } from "./presets";
import { iconSvg } from "./icon";

/** The fixed body slides of a deep-dive carousel (between intro and outro). */
export const DEEP_PARTS = ["hero", "features", "benefits", "setup"] as const;
export type DeepPart = (typeof DEEP_PARTS)[number];

export type PostSlide =
  | { type: "intro" }
  | { type: "tool"; tool: string }
  | { type: "deep"; part: DeepPart; tool: string }
  | { type: "outro" };

export function isDeepDive(post: Post): boolean {
  return post.format === "deep-dive";
}

/** Ordered slide descriptors for a post: intro → content → outro. */
export function buildSlides(post: Post): PostSlide[] {
  if (isDeepDive(post)) {
    const tool = post.tools[0];
    return [
      { type: "intro" },
      ...DEEP_PARTS.map((part): PostSlide => ({ type: "deep", part, tool })),
      { type: "outro" },
    ];
  }
  return [
    { type: "intro" },
    ...post.tools.map((id): PostSlide => ({ type: "tool", tool: id })),
    { type: "outro" },
  ];
}

export function slideFilename(slide: PostSlide, index: number, total: number): string {
  const n = String(index).padStart(2, "0");
  void total;
  if (slide.type === "intro") return `${n}-intro.png`;
  if (slide.type === "outro") return `${n}-outro.png`;
  if (slide.type === "deep") return `${n}-${slide.tool}-${slide.part}.png`;
  return `${n}-${slide.tool}.png`;
}

function host(link: string): string {
  return (link || "").replace(/^https?:\/\//, "");
}

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: "Easy setup",
  medium: "Medium setup",
  hard: "Advanced setup",
};

function kickerFor(part: DeepPart): string {
  return { hero: "Deep dive", features: "Features", benefits: "Benefits", setup: "Setup" }[part];
}

function deepBodyHTML(part: DeepPart, tool: Tool): string {
  const name = tool.name;
  if (part === "hero") {
    const hasLogo = !!tool.logo;
    const hasScreenshot = !!tool.screenshot;
    const isPortrait = tool.screenshotType === "portrait";
    return `
      <div class="deep-hero-head">
        ${hasLogo ? `<img class="deep-hero-logo" src="${tool.logo}" alt="${name} logo" />` : ""}
        <div class="deep-hero-text">
          <span class="deep-hero-name">${name}</span>
          <span class="deep-hero-swap"><span class="strike">${tool.insteadOf}</span> ${iconSvg("arrow-right-01", { size: 16 })} ${name}</span>
        </div>
      </div>
      <p class="deep-hero-hook">${tool.hook}</p>
      <div class="device-frame ${isPortrait ? "portrait" : "landscape"}">
        <div class="chrome-bar"><span></span><span></span><span></span></div>
        <div class="screenshot-area ${hasScreenshot ? "" : "no-screenshot"}">
          ${hasScreenshot ? `<img src="${tool.screenshot}" alt="${name} screenshot" />` : name}
        </div>
      </div>
    `;
  }
  if (part === "features") {
    const bullets = tool.bullets?.length ? tool.bullets : [tool.hook];
    const pills = tool.features?.length ? tool.features : [];
    return `
      <div class="deep-body">
        <h2 class="deep-title">Everything ${name} does</h2>
        <ul class="deep-list">
          ${bullets.map((b) => `<li><span class="deep-mark">${iconSvg("tick-04", { size: 22, stroke: 2 })}</span><span>${b}</span></li>`).join("")}
        </ul>
        ${pills.length ? `<div class="deep-pills">${pills.map((f) => `<span class="deep-pill">${f}</span>`).join("")}</div>` : ""}
      </div>
    `;
  }
  if (part === "benefits") {
    const benefits = tool.benefits?.length ? tool.benefits : tool.bullets?.length ? tool.bullets : [tool.hook];
    return `
      <div class="deep-body">
        <h2 class="deep-title">Why ${name} is worth it</h2>
        <ul class="deep-list deep-benefits">
          ${benefits
            .map((b, i) => `<li><span class="deep-num">${String(i + 1).padStart(2, "0")}</span><span>${b}</span></li>`)
            .join("")}
        </ul>
      </div>
    `;
  }
  const steps = tool.setupSteps?.length
    ? tool.setupSteps
    : [
        `Follow the install guide at ${host(tool.link)}`,
        `${tool.setup} — ${DIFFICULTY_LABEL[tool.difficulty] || "setup"}`,
      ];
  return `
    <div class="deep-body">
      <h2 class="deep-title">Set up ${name} in ${steps.length} steps</h2>
      <ul class="deep-list deep-steps">
        ${steps.map((s, i) => `<li><span class="deep-num">${i + 1}</span><span>${s}</span></li>`).join("")}
      </ul>
      <div class="deep-meta">
        <span class="deep-pill">${tool.setup}</span>
        ${DIFFICULTY_LABEL[tool.difficulty] ? `<span class="deep-pill">${DIFFICULTY_LABEL[tool.difficulty]}</span>` : ""}
      </div>
    </div>
  `;
}

export interface DeepCardOptions {
  index: number;
  total: number;
  preset?: Preset;
  light?: boolean;
}

const NOISE_URI =
  "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27300%27%20height=%27300%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.85%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3CfeColorMatrix%20type=%27saturate%27%20values=%270%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E";

/**
 * Renders one deep-dive slide as an .export-card. Every slide is derived from
 * the tool's own data, so any catalog app can get a deep-dive post.
 */
export function deepCardHTML(
  part: DeepPart,
  tool: Tool,
  cat: Category | undefined,
  { index, total, preset = PRESETS.linkedin, light = false }: DeepCardOptions,
): string {
  const counter = `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  const bg = light ? "#ffffff" : "#0f172a";
  const text = light ? "#0F1115" : "#F5F3ED";
  const catColor = cat?.color ?? "#FF5A5F";
  const mesh = light
    ? `radial-gradient(circle at 85% 15%, ${catColor}15, transparent 50%), radial-gradient(circle at 15% 85%, rgba(99,102,241,0.06), transparent 50%)`
    : `radial-gradient(circle at 85% 15%, ${catColor}25, transparent 55%), radial-gradient(circle at 15% 85%, rgba(99,102,241,0.14), transparent 50%)`;
  const gridLine = light ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.02)";
  const grid = `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`;
  return `
    <div class="export-card deep deep-${part}" data-theme="${light ? "light" : "dark"}" style="--cat-color:${catColor}; background-color:${bg}; background-image:${mesh}; color:${text}; width:${preset.width}px; height:${preset.height}px; position:relative; overflow:hidden;">
      <div style="position:absolute;inset:0;background-image:${grid};background-size:40px 40px;pointer-events:none;z-index:0;"></div>
      <div style="position:absolute;inset:0;background:url('${NOISE_URI}');opacity:${light ? 0.06 : 0.12};mix-blend-mode:overlay;pointer-events:none;z-index:1;"></div>
      <div class="deep-topbar" style="position:relative;z-index:2;">
        <span class="deep-kicker" style="background:${catColor}20;border:1px solid ${catColor}40;color:${light ? catColor : '#fff'};font-weight:600;">${kickerFor(part)}</span>
        <span class="deep-counter">${counter}</span>
      </div>
      <div style="position:relative;z-index:2;display:flex;flex-direction:column;flex:1;min-height:0;">
        ${deepBodyHTML(part, tool)}
      </div>
      <div class="export-footer" style="position:relative;z-index:2;">
        <span class="meta">${host(tool.link)}</span>
        <span class="meta" style="display:inline-flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;border-radius:50%;background:${catColor};"></span>SwapFOSS</span>
      </div>
    </div>
  `;
}
