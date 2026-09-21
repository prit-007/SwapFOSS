async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function introHTML(post, toolLogos) {
  const iconImages = toolLogos.slice(0, 4).map(t =>
    t.logo ? `<img class="intro-float-icon" src="${t.logo}" alt="${t.name}" />` : ""
  ).join("");
  return `
    <div class="export-card intro" id="export-target">
      <div class="watermark-bg">FOSS</div>
      <div class="intro-float-icons">${iconImages}</div>
      <div class="brandmark" style="position:absolute;top:64px;left:64px;">Swap<span>FOSS</span></div>
      <div class="intro-content">
        <span class="eyebrow">${post.intro.eyebrow}</span>
        <h1>${post.intro.headline}</h1>
        <p>${post.intro.subhead}</p>
      </div>
    </div>
  `;
}

function outroHTML(post) {
  return `
    <div class="export-card outro" id="export-target">
      <div class="watermark-bg">SWAP</div>
      <div class="brandmark" style="position:absolute;top:64px;left:64px;">Swap<span>FOSS</span></div>
      <div class="outro-content">
        <h1>${post.outro.headline}</h1>
        <p>${post.outro.subhead}</p>
        <div class="outro-cta">Follow for more swaps</div>
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

async function init() {
  const params = new URLSearchParams(location.search);
  const postId = params.get("post");
  const type = params.get("type"); // intro | tool | outro
  const toolId = params.get("tool");

  const post = await loadJSON(`data/posts/${postId}.json`);
  const stage = document.getElementById("stage");

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

  // Download button
  const toolbar = document.createElement("div");
  toolbar.id = "toolbar";
  toolbar.style.cssText = "position:fixed;top:24px;left:24px;z-index:100;display:flex;gap:12px;align-items:center;";
  toolbar.innerHTML = `
    <button id="download-btn" style="font-family:var(--font-body);font-weight:600;font-size:14px;background:#F5F3ED;color:#0F1115;border:none;padding:10px 18px;border-radius:8px;cursor:pointer;">Download PNG</button>
    <span style="color:rgba(255,255,255,0.35);font-size:13px;">1080×1350 — ready for posting</span>
  `;
  document.body.appendChild(toolbar);

  document.getElementById("download-btn").addEventListener("click", async () => {
    const target = document.getElementById("export-target");
    const btn = document.getElementById("download-btn");
    btn.textContent = "Rendering…";
    btn.disabled = true;
    const dataUrl = await htmlToImage.toPng(target, { pixelRatio: 2 });
    const link = document.createElement("a");
    const name = type ? `${postId}-${type}` : toolId;
    link.download = `swapfoss-${name}.png`;
    link.href = dataUrl;
    link.click();
    btn.textContent = "Download PNG";
    btn.disabled = false;
  });

  document.body.dataset.ready = "true";
}

document.addEventListener("DOMContentLoaded", init);
