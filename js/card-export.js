// Standalone single-card page: reads ?tool=<id> from the URL, renders the
// export-sized card, and lets the user download it as a PNG via html-to-image.

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function exportCardHTML(tool, cat) {
  return `
    <div class="export-card" id="export-target" style="--cat-color:${cat.color}">
      <div>
        <span class="tag">${cat.label}</span>
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
