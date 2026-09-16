// Share utility — renders a tool card as PNG and shares via Web Share API
// with a custom share menu fallback for desktop browsers.

function exportCardHTML(tool, cat) {
  const hasLogo = !!tool.logo;
  const hasScreenshot = !!tool.screenshot;
  const hasFeatures = tool.features && tool.features.length > 0;
  const hasSetupSteps = tool.setupSteps && tool.setupSteps.length > 0;
  const isPortrait = tool.screenshotType === "portrait";
  const frameClass = isPortrait ? "device-frame portrait" : "device-frame landscape";
  return `
    <div class="export-card" style="--cat-color:${cat.color}">
      <div class="export-top">
        <span class="tag tag-corner">${cat.label}</span>
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

function shareMenuHTML() {
  return `
    <div class="share-overlay" id="share-overlay">
      <div class="share-menu">
        <div class="share-menu-header">
          <span class="share-menu-title">Share card</span>
          <button class="share-menu-close" id="share-menu-close">✕</button>
        </div>
        <div class="share-menu-body">
          <div class="share-menu-preview" id="share-menu-preview"></div>
          <div class="share-menu-platforms">
            <button class="share-platform" data-platform="whatsapp">
              <span class="share-platform-icon">💬</span> WhatsApp
            </button>
            <button class="share-platform" data-platform="twitter">
              <span class="share-platform-icon">🐦</span> Twitter / X
            </button>
            <button class="share-platform" data-platform="linkedin">
              <span class="share-platform-icon">💼</span> LinkedIn
            </button>
            <button class="share-platform" data-platform="email">
              <span class="share-platform-icon">✉️</span> Email
            </button>
            <button class="share-platform" data-platform="copy">
              <span class="share-platform-icon">🔗</span> Copy link
            </button>
            <button class="share-platform" data-platform="download">
              <span class="share-platform-icon">⬇️</span> Download PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function renderCardAsPNG(toolId) {
  const tools = window.SWAPFOSS_TOOLS;
  const categories = window.SWAPFOSS_CATEGORIES;
  const tool = tools.find(t => t.id === toolId);
  if (!tool) throw new Error(`Tool not found: ${toolId}`);
  const cat = categories[tool.category];

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = exportCardHTML(tool, cat);
  document.body.appendChild(container);

  const target = container.firstElementChild;
  const dataUrl = await htmlToImage.toPng(target, { pixelRatio: 2 });
  container.remove();

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return { blob, dataUrl, file: new File([blob], `swapfoss-${tool.id}.png`, { type: "image/png" }) };
}

function openShareMenu(toolId, dataUrl) {
  const existing = document.getElementById("share-overlay");
  if (existing) existing.remove();

  const wrapper = document.createElement("div");
  wrapper.innerHTML = shareMenuHTML();
  document.body.appendChild(wrapper.firstElementChild);

  const overlay = document.getElementById("share-overlay");
  const preview = document.getElementById("share-menu-preview");
  preview.innerHTML = `<img src="${dataUrl}" alt="Card preview" />`;

  const close = () => overlay.remove();
  document.getElementById("share-menu-close").addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", function esc(ev) {
    if (ev.key === "Escape") { close(); document.removeEventListener("keydown", esc); }
  });

  overlay.querySelectorAll("[data-platform]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const platform = btn.dataset.platform;
      const tool = window.SWAPFOSS_TOOLS.find(t => t.id === toolId);
      const shareUrl = `${location.origin}${location.pathname}`;
      const shareText = `Check out ${tool.name} — a free, open-source alternative to ${tool.insteadOf}`;

      if (platform === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`, "_blank");
      } else if (platform === "twitter") {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
      } else if (platform === "linkedin") {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank");
      } else if (platform === "email") {
        window.open(`mailto:?subject=${encodeURIComponent(`FOSS Swap: ${tool.name}`)}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`, "_blank");
      } else if (platform === "copy") {
        await navigator.clipboard.writeText(shareText + "\n" + shareUrl);
        btn.innerHTML = `<span class="share-platform-icon">✅</span> Copied!`;
        setTimeout(close, 1000);
        return;
      } else if (platform === "download") {
        const url = URL.createObjectURL(await (await fetch(dataUrl)).blob());
        const a = document.createElement("a");
        a.href = url;
        a.download = `swapfoss-${toolId}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
      close();
    });
  });
}

async function shareCard(toolId) {
  const { blob, dataUrl, file } = await renderCardAsPNG(toolId);

  // Try native Web Share API first (works on mobile + some desktop)
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `SwapFOSS — ${toolId}`,
        text: `Check out this free open-source alternative`,
      });
      return { shared: true };
    } catch (err) {
      if (err.name === "AbortError") return { shared: false, reason: "cancelled" }
    }
  }

  // Fallback: show custom share menu
  openShareMenu(toolId, dataUrl);
  return { shared: false, reason: "menu" };
}
