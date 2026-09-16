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
  return `
    <div class="export-card" id="export-target" style="--cat-color:${cat.color}">
      <div>
        <div class="export-top-row">
          ${hasLogo ? `<img class="export-logo" src="${tool.logo}" alt="${tool.name} logo" />` : ""}
          <span class="tag">${cat.label}</span>
        </div>
        ${hasScreenshot ? `<div class="export-screenshot"><img src="${tool.screenshot}" alt="${tool.name} screenshot" /></div>` : ""}
        <div style="margin-top:32px;">
          <div class="swap-from">${tool.insteadOf}</div>
          <div class="swap-arrow" style="margin:8px 0;">↓</div>
          <div class="swap-to">${tool.name}</div>
        </div>
        <p class="hook" style="margin-top:28px;">${tool.hook}</p>
      </div>
      <div>
        <ul class="bullets">
          ${tool.bullets.map(b => `<li>${b}</li>`).join("")}
        </ul>
        <div class="card-footer" style="margin-top:32px;">
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
