// Standalone single-card page: reads ?tool=<id> from the URL, renders the
// export-sized card, and lets the user download it as a PNG via html-to-image.

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function exportCardHTML(tool, cat) {
  const hasLogo = !!tool.logo;
  const hasScreenshot = !!tool.screenshot;
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
  const toolId = params.get("tool");
  const [categories, tool] = await Promise.all([
    loadJSON("data/categories.json"),
    loadJSON(`data/tools/${toolId}.json`),
  ]);
  const cat = categories[tool.category];

  document.getElementById("stage").innerHTML = exportCardHTML(tool, cat);

  document.getElementById("download-btn").addEventListener("click", async () => {
    const target = document.getElementById("export-target");
    const dataUrl = await htmlToImage.toPng(target, { pixelRatio: 1 });
    const link = document.createElement("a");
    link.download = `swapfoss-${tool.id}.png`;
    link.href = dataUrl;
    link.click();
  });
}

document.addEventListener("DOMContentLoaded", init);
