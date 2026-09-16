async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function introHTML(post) {
  return `
    <div class="export-card intro" id="export-target" style="--cat-color:#FF5A5F">
      <div class="brandmark">Swap<span>FOSS</span></div>
      <span class="eyebrow">${post.intro.eyebrow}</span>
      <h1>${post.intro.headline}</h1>
      <p>${post.intro.subhead}</p>
    </div>
  `;
}

function outroHTML(post) {
  return `
    <div class="export-card outro" id="export-target" style="--cat-color:#4EA8DE">
      <div class="brandmark">Swap<span>FOSS</span></div>
      <h1>${post.outro.headline}</h1>
      <p>${post.outro.subhead}</p>
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
      <div class="export-top">
        ${hasLogo ? `<img class="export-logo" src="${tool.logo}" alt="${tool.name} logo" />` : ""}
        <div class="export-top-text">
          <span class="tag">${cat.label}</span>
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
    stage.innerHTML = introHTML(post);
  } else if (type === "outro") {
    stage.innerHTML = outroHTML(post);
  } else {
    const categories = await loadJSON("data/categories.json");
    const tool = await loadJSON(`data/tools/${toolId}.json`);
    stage.innerHTML = toolHTML(tool, categories[tool.category]);
  }

  document.body.dataset.ready = "true"; // signal for the screenshot script
}

document.addEventListener("DOMContentLoaded", init);
