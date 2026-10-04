import * as htmlToImage from "html-to-image";

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

function introHTML(post, toolLogos) {
  const iconImages = toolLogos.slice(0, 4).map(t =>
    t.logo ? `<img class="intro-float-icon" src="${t.logo}" alt="${t.name}" />` : ""
  ).join("");
  const total = post.tools.length + 2;
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

function outroHTML(post) {
  const total = post.tools.length + 2;
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
      <span class="load-error-icon" aria-hidden="true">!</span>
      <p class="load-error-title">Couldn't load ${what}</p>
      <p class="load-error-text">The slide data didn't respond. Check your connection and try again.</p>
      <button class="load-error-retry" type="button">Retry</button>
    </div>`;
  container.querySelector(".load-error-retry").addEventListener("click", () => location.reload());
}

async function init() {
  const params = new URLSearchParams(location.search);
  const postId = params.get("post");
  const type = params.get("type"); // intro | tool | outro
  const toolId = params.get("tool");

  const stage = document.getElementById("stage");
  let post;
  try {
    post = await loadJSON(`data/posts/${postId}.json`);
    if (type === "intro") {
      const allTools = await Promise.all(
        post.tools.map(id => loadJSON(`data/tools/${id}.json`))
      );
      stage.innerHTML = introHTML(post, allTools);
    } else if (type === "outro") {
      stage.innerHTML = outroHTML(post);
    } else {
      const categories = await loadJSON("data/categories.json");
      const tool = await loadJSON(`data/tools/${toolId}.json`);
      stage.innerHTML = toolHTML(tool, categories[tool.category]);
    }
  } catch (err) {
    showLoadError(stage, "slide");
    return;
  }

  // Slide list for prev/next navigation
  const slides = [
    { type: "intro" },
    ...post.tools.map(id => ({ type: "tool", tool: id })),
    { type: "outro" },
  ];
  const isCurrent = (s) => {
    if (type === "intro") return s.type === "intro";
    if (type === "outro") return s.type === "outro";
    return s.type === "tool" && s.tool === toolId;
  };
  const idx = slides.findIndex(isCurrent);
  const prev = idx > 0 ? slides[idx - 1] : null;
  const next = idx >= 0 && idx < slides.length - 1 ? slides[idx + 1] : null;
  const slideURL = (s) => {
    const p = new URLSearchParams({ post: postId, type: s.type });
    if (s.tool) p.set("tool", s.tool);
    return `${location.pathname}?${p.toString()}`;
  };

  // Toolbar: back + prev/next + download (never inside the export target)
  const toolbar = document.createElement("div");
  toolbar.id = "toolbar";
  toolbar.style.cssText = "position:fixed;top:24px;left:24px;right:24px;z-index:100;display:flex;gap:10px;align-items:center;flex-wrap:wrap;";
  const navBtn = (id, label, enabled) =>
    `<button id="${id}" ${enabled ? "" : "disabled"} style="font-family:var(--font-body);font-weight:600;font-size:14px;background:transparent;color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.2);padding:9px 16px;border-radius:8px;cursor:${enabled ? "pointer" : "default"};opacity:${enabled ? 1 : 0.35};">${label}</button>`;
  toolbar.innerHTML = `
    <a id="toolbar-back" href="index.html" style="font-family:var(--font-body);font-weight:600;font-size:14px;color:rgba(255,255,255,0.55);text-decoration:none;padding:10px 6px;">← Home</a>
    ${navBtn("prev-btn", "← Prev", !!prev)}
    ${navBtn("next-btn", "Next →", !!next)}
    <button id="download-btn" style="font-family:var(--font-body);font-weight:600;font-size:14px;background:#F5F3ED;color:#0F1115;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;">Download PNG</button>
    <span style="color:rgba(255,255,255,0.35);font-size:13px;">1080×1350 — ready for posting</span>
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
    btn.textContent = "Rendering…";
    btn.disabled = true;
    try {
      const dataUrl = await htmlToImage.toPng(target, { pixelRatio: 2 });
      const link = document.createElement("a");
      const name = type ? `${postId}-${type}` : toolId;
      link.download = `swapfoss-${name}.png`;
      link.href = dataUrl;
      link.click();
      btn.textContent = "Saved ✓";
    } catch (err) {
      btn.textContent = "Failed — retry";
    } finally {
      setTimeout(() => {
        btn.textContent = "Download PNG";
        btn.disabled = false;
      }, 1600);
    }
  });

  document.body.dataset.ready = "true";
}

document.addEventListener("DOMContentLoaded", init);
