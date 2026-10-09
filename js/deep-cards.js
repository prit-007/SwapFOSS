// Deep-dive (single-app) post engine — slide list + export card renderers.
// Shared by slide.html and the batch ZIP exporter so both stay perfectly in sync.
// Every slide is derived from the tool's own data, so any app in the catalog
// can get a deep-dive post without extra authoring.

export const DEEP_PARTS = ["hero", "features", "benefits", "setup"];

export function isDeepDive(post) {
  return post.format === "deep-dive";
}

// Ordered slide descriptors for a post: intro → content → outro.
export function buildSlides(post) {
  if (isDeepDive(post)) {
    const tool = post.tools[0];
    return [
      { type: "intro" },
      ...DEEP_PARTS.map((part) => ({ type: "deep", part, tool })),
      { type: "outro" },
    ];
  }
  return [
    { type: "intro" },
    ...post.tools.map((id) => ({ type: "tool", tool: id })),
    { type: "outro" },
  ];
}

export function slideFilename(slide, index, total) {
  const n = String(index).padStart(2, "0");
  if (slide.type === "intro") return `${n}-intro.png`;
  if (slide.type === "outro") return `${n}-outro.png`;
  if (slide.type === "deep") return `${n}-${slide.tool}-${slide.part}.png`;
  return `${n}-${slide.tool}.png`;
}

function host(link) {
  return (link || "").replace(/^https?:\/\//, "");
}

const DIFFICULTY_LABEL = {
  easy: "Easy setup",
  medium: "Medium setup",
  hard: "Advanced setup",
};

function kickerFor(part) {
  return { hero: "Deep dive", features: "Features", benefits: "Benefits", setup: "Setup" }[part];
}

function deepBodyHTML(part, tool) {
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
          <span class="deep-hero-swap"><span class="strike">${tool.insteadOf}</span> → ${name}</span>
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
    const bullets = tool.bullets && tool.bullets.length ? tool.bullets : [tool.hook];
    const pills = tool.features && tool.features.length ? tool.features : [];
    return `
      <div class="deep-body">
        <h2 class="deep-title">Everything ${name} does</h2>
        <ul class="deep-list">
          ${bullets.map((b) => `<li><span class="deep-mark">✓</span><span>${b}</span></li>`).join("")}
        </ul>
        ${pills.length ? `<div class="deep-pills">${pills.map((f) => `<span class="deep-pill">${f}</span>`).join("")}</div>` : ""}
      </div>
    `;
  }
  if (part === "benefits") {
    const benefits =
      tool.benefits && tool.benefits.length ? tool.benefits : tool.bullets && tool.bullets.length ? tool.bullets : [tool.hook];
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
  // setup
  const steps =
    tool.setupSteps && tool.setupSteps.length
      ? tool.setupSteps
      : [`Follow the install guide at ${host(tool.link)}`, `${tool.setup} — ${DIFFICULTY_LABEL[tool.difficulty] || "setup"}`];
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

// Renders one deep-dive slide as an .export-card (1080×1350 dark by default;
// pass light:true for the batch exporter's light theme).
export function deepCardHTML(part, tool, cat, { index, total, light = false } = {}) {
  const counter = `${String(index).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
  return `
    <div class="export-card deep deep-${part}" id="export-target" ${light ? 'data-theme="light"' : ""} style="--cat-color:${cat.color}">
      <div class="deep-topbar">
        <span class="deep-kicker">${kickerFor(part)}</span>
        <span class="deep-counter">${counter}</span>
      </div>
      ${deepBodyHTML(part, tool)}
      <div class="export-footer">
        <span class="meta">${host(tool.link)}</span>
        <span class="meta">SwapFOSS</span>
      </div>
    </div>
  `;
}
