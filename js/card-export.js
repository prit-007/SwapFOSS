// Standalone single-card page: reads ?tool=<id> from the URL, renders the
// export-sized card, and lets the user download it as a PNG via html-to-image.
import * as htmlToImage from "html-to-image";
import { icon, mountIcons } from "./icons.js";

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function exportCardHTML(tool, cat) {
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

function showLoadError(container, what) {
  container.innerHTML = `
    <div class="load-error load-error-stage" role="alert">
      <span class="load-error-icon" aria-hidden="true">${icon("alert-01", 20)}</span>
      <p class="load-error-title">Couldn't load ${what}</p>
      <p class="load-error-text">The card data didn't respond. Check your connection and try again.</p>
      <button class="load-error-retry" type="button">${icon("refresh-01")} Retry</button>
    </div>`;
  container.querySelector(".load-error-retry").addEventListener("click", () => location.reload());
}

async function init() {
  mountIcons();
  const params = new URLSearchParams(location.search);
  const toolId = params.get("tool");
  const stage = document.getElementById("stage");
  let cat;
  let tool;
  try {
    const categories = await loadJSON("data/categories.json");
    tool = await loadJSON(`data/tools/${toolId}.json`);
    cat = categories[tool.category];
  } catch (err) {
    showLoadError(stage, "card");
    return;
  }

  stage.innerHTML = exportCardHTML(tool, cat);

  document.getElementById("download-btn").addEventListener("click", async () => {
    const target = document.getElementById("export-target");
    const btn = document.getElementById("download-btn");
    btn.innerHTML = `${icon("refresh-01")} Rendering…`;
    btn.disabled = true;
    try {
      const dataUrl = await htmlToImage.toPng(target, { pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `swapfoss-${tool.id}.png`;
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
}

document.addEventListener("DOMContentLoaded", init);
