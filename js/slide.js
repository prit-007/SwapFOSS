import * as htmlToImage from "html-to-image";
import { icon, mountIcons } from "./icons.js";
import { DEEP_PARTS, buildSlides, deepCardHTML } from "./deep-cards.js";

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function hlLastWord(text, cls, hl) {
  if (hl && hl.word && text.includes(hl.word)) {
    const style = hl.color ? ` style="color:${hl.color};-webkit-text-fill-color:${hl.color};"` : "";
    const attrs = `${hl.color ? "" : ` class="${cls}"`}${style}`;
    return text.replace(hl.word, (m) => `<span${attrs}>${m}</span>`);
  }
  const i = text.lastIndexOf(" ");
  if (i < 0) return text;
  return `${text.slice(0, i)} <span class="${cls}">${text.slice(i + 1)}</span>`;
}

function introHTML(post, toolLogos, total) {
  const iconImages = toolLogos.slice(0, 4).map(t =>
    t.logo ? `<img class="intro-float-icon" src="${t.logo}" alt="${t.name}" />` : ""
  ).join("");
  const pills = Array.isArray(post.intro.pills) ? post.intro.pills : [];
  const body = pills.length
    ? `<div class="intro-stats-row">${pills.map((p) => `<span class="stat-pill">✓ ${p}</span>`).join("")}</div>`
    : `<p>${post.intro.subhead}</p>`;
  return `
    <div class="export-card intro" id="export-target">
      <div class="watermark-bg">FOSS</div>
      <div class="card-grid"></div>
      <div class="card-noise"></div>
      <div class="card-vignette"></div>
      <div class="intro-float-icons">${iconImages}</div>
      <div class="card-topbar">
        <div class="brandmark">Swap<span>FOSS</span></div>
        <span class="slide-counter">01 / ${String(total).padStart(2, "0")}</span>
      </div>
      <div class="intro-content">
        <span class="eyebrow">${post.intro.eyebrow}</span>
        <h1>${hlLastWord(post.intro.headline, "hl", post.intro.hl)}</h1>
        ${body}
      </div>
      <div class="swipe-hint">Swipe →</div>
    </div>
  `;
}

function outroHTML(post, total) {
  return `
    <div class="export-card outro" id="export-target">
      <div class="watermark-bg">SWAP</div>
      <div class="card-grid"></div>
      <div class="card-noise"></div>
      <div class="card-vignette"></div>
      <div class="card-topbar">
        <div class="brandmark">Swap<span>FOSS</span></div>
        <span class="slide-counter">${String(total).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>
      </div>
      <div class="outro-content">
        <h1>${hlLastWord(post.outro.headline, "hl-blue")}</h1>
        <p>${post.outro.subhead}</p>
        <div class="outro-cta">Follow for more swaps →</div>
        <span class="outro-url">github.com/prit-007/SwapFOSS</span>
      </div>
      <div class="outro-dots">
        <span class="outro-dot"></span>
        <span class="outro-dot"></span>
        <span class="outro-dot active"></span>
      </div>
    </div>
  `;
}

function toolHTML(tool, cat) {
  const hasLogo = !!tool.logo;
  const hasScreenshot = !!tool.screenshot;
  const hasFeatures = tool.features && tool.features.length > 0;
  const hasSetupSteps = tool.setupSteps && tool.setupSteps.length > 0;
  const isPortrait = tool.screenshotType === "portrait";
  const frameClass = isPortrait ? "device-frame portrait" : "device-frame landscape";
  return `
    <div class="export-card" id="export-target" style="--cat-color:${cat.color}">
      <div class="export-top" style="position:relative;">
        <span class="tag" style="position:absolute;top:0;right:0;white-space:nowrap;">${cat.label}</span>
        ${hasLogo ? `<img class="export-logo" src="${tool.logo}" alt="${tool.name} logo" />` : ""}
        <div class="export-top-text">
          <span class="tool-name">${tool.name}</span>
          <span class="swap-line"><span class="strike">${tool.insteadOf}</span> → ${tool.name}</span>
        </div>
      </div>
      <div class="${frameClass}">
        <div class="chrome-bar">
          <span></span><span></span><span></span>
        </div>
        <div class="screenshot-area ${hasScreenshot ? "" : "no-screenshot"}">
          ${hasScreenshot ? `<img src="${tool.screenshot}" alt="${tool.name} screenshot" />` : tool.name}
        </div>
      </div>
      <div class="export-bottom">
        <p class="export-hook">${tool.hook}</p>
        ${hasFeatures ? `
        <div class="export-features">
          ${tool.features.map(f => `<span class="export-feature-pill">${f}</span>`).join("")}
        </div>
        ` : ""}
        ${hasSetupSteps ? `
        <div class="export-setup">
          <span class="export-setup-label">How to use:</span>
          <ol>
            ${tool.setupSteps.map(s => `<li>${s}</li>`).join("")}
          </ol>
        </div>
        ` : ""}
        <div class="export-footer">
          <span class="meta">${tool.link.replace(/^https?:\/\//, "")}</span>
          <span class="meta">SwapFOSS</span>
        </div>
      </div>
    </div>
  `;
}

function showLoadError(container, what) {
  container.innerHTML = `
    <div class="load-error load-error-stage" role="alert">
      <span class="load-error-icon" aria-hidden="true">${icon("alert-01", 20)}</span>
      <p class="load-error-title">Couldn't load ${what}</p>
      <p class="load-error-text">The slide data didn't respond. Check your connection and try again.</p>
      <button class="load-error-retry" type="button">${icon("refresh-01")} Retry</button>
    </div>`;
  container.querySelector(".load-error-retry").addEventListener("click", () => location.reload());
}

async function init() {
  mountIcons();
  const params = new URLSearchParams(location.search);
  const postId = params.get("post");
  const type = params.get("type"); // intro | tool | deep | outro
  const toolId = params.get("tool");
  const deepPart = DEEP_PARTS.includes(params.get("part")) ? params.get("part") : "hero";

  const stage = document.getElementById("stage");
  let post;
  let slides = [];
  try {
    post = await loadJSON(`data/posts/${postId}.json`);
    slides = buildSlides(post);
    const total = slides.length;
    if (type === "intro") {
      const allTools = await Promise.all(
        post.tools.map(id => loadJSON(`data/tools/${id}.json`))
      );
      stage.innerHTML = introHTML(post, allTools, total);
    } else if (type === "outro") {
      stage.innerHTML = outroHTML(post, total);
    } else if (type === "deep") {
      const categories = await loadJSON("data/categories.json");
      const tool = await loadJSON(`data/tools/${post.tools[0]}.json`);
      const index = slides.findIndex(s => s.type === "deep" && s.part === deepPart) + 1;
      stage.innerHTML = deepCardHTML(deepPart, tool, categories[tool.category], { index, total });
    } else {
      const categories = await loadJSON("data/categories.json");
      const tool = await loadJSON(`data/tools/${toolId}.json`);
      stage.innerHTML = toolHTML(tool, categories[tool.category]);
    }
  } catch (err) {
    showLoadError(stage, "slide");
    return;
  }

  const isCurrent = (s) => {
    if (type === "intro") return s.type === "intro";
    if (type === "outro") return s.type === "outro";
    if (type === "deep") return s.type === "deep" && s.part === deepPart;
    return s.type === "tool" && s.tool === toolId;
  };
  const idx = slides.findIndex(isCurrent);
  const prev = idx > 0 ? slides[idx - 1] : null;
  const next = idx >= 0 && idx < slides.length - 1 ? slides[idx + 1] : null;
  const slideURL = (s) => {
    const p = new URLSearchParams({ post: postId, type: s.type });
    if (s.tool && s.type !== "deep") p.set("tool", s.tool);
    if (s.type === "deep") p.set("part", s.part);
    return `${location.pathname}?${p.toString()}`;
  };

  // Toolbar: back + prev/next + download (never inside the export target)
  const toolbar = document.createElement("div");
  toolbar.id = "toolbar";
  toolbar.className = "fixed top-6 left-6 right-6 z-[100] flex items-center gap-2.5 flex-wrap";
  const navBtn = (id, label, enabled) =>
    `<button id="${id}" ${enabled ? "" : "disabled"} class="inline-flex items-center gap-1.5 font-semibold text-sm font-[family-name:var(--font-body)] bg-transparent text-white/70 border border-white/20 px-4 py-[9px] rounded-lg ${enabled ? "cursor-pointer" : "cursor-default opacity-35"}">${label}</button>`;
  toolbar.innerHTML = `
    <a id="toolbar-back" href="index.html" class="inline-flex items-center gap-1.5 font-semibold text-sm font-[family-name:var(--font-body)] text-white/55 no-underline px-1.5 py-2.5">${icon("arrow-left-01")} Home</a>
    ${navBtn("prev-btn", `${icon("arrow-left-01")} Prev`, !!prev)}
    ${navBtn("next-btn", `Next ${icon("arrow-right-01")}`, !!next)}
    <button id="download-btn" class="inline-flex items-center gap-1.5 font-semibold text-sm font-[family-name:var(--font-body)] bg-[#F5F3ED] text-[#0F1115] border-0 px-[18px] py-2.5 rounded-lg cursor-pointer">${icon("download-01")} Download PNG</button>
    <span class="text-[13px] text-white/35">1080×1350 — ready for posting</span>
  `;
  document.body.appendChild(toolbar);

  if (prev) document.getElementById("prev-btn").addEventListener("click", () => { location.href = slideURL(prev); });
  if (next) document.getElementById("next-btn").addEventListener("click", () => { location.href = slideURL(next); });
  document.addEventListener("keydown", (ev) => {
    if (ev.target && ev.target.matches && ev.target.matches("input, textarea, select")) return;
    if (ev.key === "ArrowRight" && next) location.href = slideURL(next);
    else if (ev.key === "ArrowLeft" && prev) location.href = slideURL(prev);
  });

  document.getElementById("download-btn").addEventListener("click", async () => {
    const target = document.getElementById("export-target");
    const btn = document.getElementById("download-btn");
    btn.innerHTML = `${icon("refresh-01")} Rendering…`;
    btn.disabled = true;
    try {
      const dataUrl = await htmlToImage.toPng(target, { pixelRatio: 2 });
      const link = document.createElement("a");
      const name = type === "deep" ? `${postId}-${deepPart}` : type ? `${postId}-${type}` : toolId;
      link.download = `swapfoss-${name}.png`;
      link.href = dataUrl;
      link.click();
      btn.innerHTML = `${icon("tick-04")} Saved`;
    } catch (err) {
      btn.innerHTML = `${icon("cancel-01")} Failed — retry`;
    } finally {
      setTimeout(() => {
        btn.innerHTML = `${icon("download-01")} Download PNG`;
        btn.disabled = false;
      }, 1600);
    }
  });

  document.body.dataset.ready = "true";
}

document.addEventListener("DOMContentLoaded", init);
