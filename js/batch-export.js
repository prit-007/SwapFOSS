// Batch export engine — loads posts, verifies PIN, renders cards, bundles ZIP.
import JSZip from "jszip";
import * as htmlToImage from "html-to-image";
import { buildSlides, deepCardHTML, slideFilename, isDeepDive } from "./deep-cards.js";

export const PIN = "swapfoss2026";

export const PRESETS = {
  linkedin: { width: 1080, height: 1350, label: "LinkedIn" },
  instagram: { width: 1080, height: 1080, label: "Instagram" },
  twitter: { width: 1200, height: 675, label: "Twitter / X" },
};

export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

// Film-grain noise layer (fully percent-encoded so it survives inline styles).
const NOISE_URI = "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27300%27%20height=%27300%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.85%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3CfeColorMatrix%20type=%27saturate%27%20values=%270%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E";

function typeScale(preset) {
  const k = Math.min(1, Math.max(0.62, preset.height / 1350));
  return {
    h1: Math.round(80 * k),
    sub: Math.round(26 * k),
    wm: Math.round(320 * k),
    cta: Math.max(15, Math.round(19 * k)),
  };
}

function hlLastWord(text, c1, c2, hl) {
  if (hl && hl.word && text.includes(hl.word)) {
    const style = hl.color
      ? `color:${hl.color};-webkit-text-fill-color:${hl.color};`
      : `background:linear-gradient(135deg,${c1},${c2});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;`;
    return text.replace(hl.word, (m) => `<span style="${style}">${m}</span>`);
  }
  const i = text.lastIndexOf(" ");
  if (i < 0) return text;
  const grad = `background:linear-gradient(135deg,${c1},${c2});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;`;
  return `${text.slice(0, i)} <span style="${grad}">${text.slice(i + 1)}</span>`;
}

export function introCardHTML(post, preset, lightTheme, totalSlides, tools) {
  const s = typeScale(preset);
  const bg = lightTheme ? "#ffffff" : "#0f172a";
  const text = lightTheme ? "#0F1115" : "#F5F3ED";
  const muted = lightTheme ? "rgba(15,17,21,0.62)" : "rgba(255,255,255,0.60)";
  const faint = lightTheme ? "rgba(15,17,21,0.42)" : "rgba(255,255,255,0.42)";
  const gridLine = lightTheme ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.025)";
  const stroke = lightTheme ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)";
  const mesh = lightTheme
    ? "radial-gradient(circle at 15% 50%, rgba(99,102,241,0.10), transparent 50%), radial-gradient(circle at 85% 30%, rgba(239,68,68,0.08), transparent 50%)"
    : "radial-gradient(circle at 15% 50%, rgba(99,102,241,0.24), transparent 50%), radial-gradient(circle at 85% 30%, rgba(239,68,68,0.20), transparent 50%), radial-gradient(circle at 50% 90%, rgba(16,185,129,0.14), transparent 45%)";
  const vignette = lightTheme
    ? "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.10) 100%)"
    : "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)";
  const grid = `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`;
  const chipColor = lightTheme ? "#D13A3F" : "#FF8A8E";
  const chip = `font-family:var(--font-mono);font-size:16px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;color:${chipColor};background:rgba(255,90,95,0.10);border:1px solid rgba(255,90,95,0.45);padding:11px 24px;border-radius:999px;white-space:nowrap;flex-shrink:0;`;
  const pillText = lightTheme ? "#5B616D" : "#d1d5db";
  const pillBg = lightTheme ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.05)";
  const pillBorder = lightTheme ? "rgba(0,0,0,0.10)" : "rgba(255,255,255,0.10)";
  const swipeColor = lightTheme ? "rgba(15,17,21,0.72)" : "rgba(255,255,255,0.8)";
  const swipeLine = lightTheme ? "rgba(15,17,21,0.35)" : "rgba(255,255,255,0.5)";
  const introBody = Array.isArray(post.intro.pills) && post.intro.pills.length
    ? `<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px;">${post.intro.pills.map(p => `<span style="font-family:var(--font-mono);font-size:16px;color:${pillText};background:${pillBg};border:1px solid ${pillBorder};padding:9px 18px;border-radius:999px;white-space:nowrap;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);">✓ ${p}</span>`).join("")}</div>`
    : `<p style="font-family:var(--font-body);font-size:${s.sub}px;color:${muted};max-width:34ch;margin:0;line-height:1.5;">${post.intro.subhead}</p>`;
  const icons = (tools || []).slice(0, 4).map((t, i) => {
    const pos = [
      "top:11%;left:7%;transform:rotate(-8deg);",
      "top:17%;right:9%;transform:rotate(5deg);",
      "bottom:21%;left:11%;transform:rotate(12deg);",
      "bottom:14%;right:7%;transform:rotate(-6deg);",
    ][i];
    return `<img src="${t.logo}" alt="" style="position:absolute;${pos}width:76px;height:76px;object-fit:contain;filter:blur(1.5px) drop-shadow(0 16px 32px rgba(0,0,0,0.5));opacity:0.65;z-index:1;" />`;
  }).join("");
  return `
    <div class="export-card intro" style="--cat-color:linear-gradient(90deg,#FF5A5F,#FFC857); background-color:${bg}; background-image:${mesh}; color:${text}; width:${preset.width}px; height:${preset.height}px; position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; text-align:center; padding:64px;">
      <div style="position:absolute;inset:0;background-image:${grid};background-size:40px 40px;pointer-events:none;z-index:0;"></div>
      <div style="position:absolute;inset:0;background:url('${NOISE_URI}');opacity:${lightTheme ? 0.08 : 0.14};mix-blend-mode:overlay;pointer-events:none;z-index:1;"></div>
      <div style="position:absolute;inset:0;background:${vignette};pointer-events:none;z-index:1;"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-display);font-size:${s.wm}px;font-weight:700;color:transparent;-webkit-text-stroke:2px ${stroke};z-index:0;pointer-events:none;letter-spacing:-0.04em;white-space:nowrap;">FOSS</div>
      ${icons}
      <div style="position:absolute;top:56px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center;z-index:3;font-family:var(--font-display);font-weight:700;font-size:24px;letter-spacing:-0.02em;color:${text}">
        <span>Swap<span style="color:#FF5A5F">FOSS</span></span>
        <span style="font-family:var(--font-mono);font-size:16px;font-weight:500;letter-spacing:0.14em;color:${faint};white-space:nowrap;flex-shrink:0;">01 / ${String(totalSlides).padStart(2, "0")}</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:28px;position:relative;z-index:2;margin-top:auto;margin-bottom:auto;max-width:760px;">
        <span style="${chip}">${post.intro.eyebrow}</span>
        <h1 style="font-family:var(--font-display);font-weight:700;font-size:${s.h1}px;line-height:1.08;margin:0;max-width:15ch;color:${text};letter-spacing:-0.025em;">${hlLastWord(post.intro.headline, "#FF5A5F", "#FFC857", post.intro.hl)}</h1>
        ${introBody}
      </div>
      <div style="position:absolute;bottom:48px;left:0;right:0;z-index:3;display:flex;align-items:center;justify-content:center;gap:12px;font-family:var(--font-mono);font-size:17px;letter-spacing:0.32em;text-transform:uppercase;color:${swipeColor};"><span style="display:block;width:40px;height:2px;background:linear-gradient(90deg,transparent,${swipeLine});"></span>Swipe →<span style="display:block;width:40px;height:2px;background:linear-gradient(-90deg,transparent,${swipeLine});"></span></div>
    </div>
  `;
}

export function outroCardHTML(post, preset, lightTheme, totalSlides) {
  const s = typeScale(preset);
  const bg = lightTheme ? "#ffffff" : "#0f172a";
  const text = lightTheme ? "#0F1115" : "#F5F3ED";
  const muted = lightTheme ? "rgba(15,17,21,0.62)" : "rgba(255,255,255,0.60)";
  const faint = lightTheme ? "rgba(15,17,21,0.42)" : "rgba(255,255,255,0.42)";
  const gridLine = lightTheme ? "rgba(0,0,0,0.035)" : "rgba(255,255,255,0.025)";
  const stroke = lightTheme ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)";
  const mesh = lightTheme
    ? "radial-gradient(circle at 80% 60%, rgba(99,102,241,0.10), transparent 50%), radial-gradient(circle at 20% 30%, rgba(59,130,246,0.08), transparent 50%)"
    : "radial-gradient(circle at 80% 60%, rgba(99,102,241,0.24), transparent 50%), radial-gradient(circle at 20% 30%, rgba(59,130,246,0.20), transparent 50%), radial-gradient(circle at 50% 10%, rgba(168,85,247,0.14), transparent 45%)";
  const vignette = lightTheme
    ? "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.10) 100%)"
    : "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)";
  const grid = `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`;
  const dots = [0, 1, 2].map(i =>
    `<span style="width:9px;height:9px;border-radius:50%;background:${i === 2 ? "#4EA8DE" : (lightTheme ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.18)")}"></span>`
  ).join("");
  return `
    <div class="export-card outro" style="--cat-color:linear-gradient(90deg,#4EA8DE,#B983FF); background-color:${bg}; background-image:${mesh}; color:${text}; width:${preset.width}px; height:${preset.height}px; position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; text-align:center; padding:64px;">
      <div style="position:absolute;inset:0;background-image:${grid};background-size:40px 40px;pointer-events:none;z-index:0;"></div>
      <div style="position:absolute;inset:0;background:url('${NOISE_URI}');opacity:${lightTheme ? 0.08 : 0.14};mix-blend-mode:overlay;pointer-events:none;z-index:1;"></div>
      <div style="position:absolute;inset:0;background:${vignette};pointer-events:none;z-index:1;"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-display);font-size:${s.wm}px;font-weight:700;color:transparent;-webkit-text-stroke:2px ${stroke};z-index:0;pointer-events:none;letter-spacing:-0.04em;white-space:nowrap;">SWAP</div>
      <div style="position:absolute;top:56px;left:64px;right:64px;display:flex;justify-content:space-between;align-items:center;z-index:3;font-family:var(--font-display);font-weight:700;font-size:24px;letter-spacing:-0.02em;color:${text}">
        <span>Swap<span style="color:#4EA8DE">FOSS</span></span>
        <span style="font-family:var(--font-mono);font-size:16px;font-weight:500;letter-spacing:0.14em;color:${faint};white-space:nowrap;flex-shrink:0;">${String(totalSlides).padStart(2, "0")} / ${String(totalSlides).padStart(2, "0")}</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:28px;position:relative;z-index:2;margin-top:auto;margin-bottom:auto;max-width:760px;">
        <h1 style="font-family:var(--font-display);font-weight:700;font-size:${s.h1}px;line-height:1.08;margin:0;max-width:15ch;color:${text};letter-spacing:-0.025em;">${hlLastWord(post.outro.headline, "#4EA8DE", "#B983FF")}</h1>
        <p style="font-family:var(--font-body);font-size:${s.sub}px;color:${muted};max-width:34ch;margin:0;line-height:1.5;">${post.outro.subhead}</p>
        <div style="margin-top:8px;padding:20px 44px;border-radius:999px;font-family:var(--font-display);font-size:${s.cta}px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ffffff;background:linear-gradient(135deg,#4EA8DE,#B983FF);box-shadow:0 12px 40px rgba(78,168,222,0.35);white-space:nowrap;">Follow for more swaps →</div>
        <span style="font-family:var(--font-mono);font-size:16px;letter-spacing:0.1em;color:${faint};">github.com/prit-007/SwapFOSS</span>
      </div>
      <div style="position:absolute;bottom:48px;left:0;right:0;z-index:3;display:flex;justify-content:center;gap:9px;">${dots}</div>
    </div>
  `;
}

export function toolCardHTML(tool, cat, preset, lightTheme) {
  const hasLogo = !!tool.logo;
  const hasScreenshot = !!tool.screenshot;
  const hasFeatures = tool.features && tool.features.length > 0;
  const hasSetupSteps = tool.setupSteps && tool.setupSteps.length > 0;
  const isPortrait = tool.screenshotType === "portrait";
  const frameClass = isPortrait ? "device-frame portrait" : "device-frame landscape";
  const bg = lightTheme ? "#ffffff" : "#171A20";
  const text = lightTheme ? "#0F1115" : "#F5F3ED";
  const muted = lightTheme ? "#5B616D" : "#9AA0AC";
  const faint = lightTheme ? "#9AA0AC" : "#5B616D";
  const border = lightTheme ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const borderStrong = lightTheme ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";
  const pillBg = lightTheme ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.08)";
  const chromeBg = lightTheme ? "#E8E8E8" : "#2A2F38";
  const chromeDot = lightTheme ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.2)";
  const screenshotBg = lightTheme ? "#F0F0F0" : "#1E222A";
  const setupColor = lightTheme ? "#374151" : "#d1d5db";
  return `
    <div class="export-card" style="--cat-color:${cat.color}; background:${bg}; color:${text}; width:${preset.width}px; height:${preset.height}px;">
      <div class="export-top" style="position:relative;">
        <span class="tag" style="position:absolute;top:0;right:0;white-space:nowrap;background:${lightTheme ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'};border-color:${border};color:${muted};font-size:13px;padding:5px 14px;">${cat.label}</span>
        ${hasLogo ? `<img class="export-logo" src="${tool.logo}" alt="${tool.name} logo" />` : ""}
        <div class="export-top-text">
          <span class="tool-name" style="color:${cat.color}">${tool.name}</span>
          <span class="swap-line" style="color:${muted}"><span class="strike" style="color:${faint}">${tool.insteadOf}</span> → ${tool.name}</span>
        </div>
      </div>
      <div class="${frameClass}">
        <div class="chrome-bar" style="background:${chromeBg}">
          <span style="background:${chromeDot}"></span><span style="background:${chromeDot}"></span><span style="background:${chromeDot}"></span>
        </div>
        <div class="screenshot-area ${hasScreenshot ? "" : "no-screenshot"}" style="background:${screenshotBg};overflow:hidden;">
          ${hasScreenshot ? `<img src="${tool.screenshot}" alt="${tool.name} screenshot" style="width:100%;height:100%;object-fit:cover;object-position:top left;display:block;" />` : tool.name}
        </div>
      </div>
      <div class="export-bottom">
        <p class="export-hook" style="color:${text}">${tool.hook}</p>
        ${hasFeatures ? `
        <div class="export-features">
          ${tool.features.map(f => `<span class="export-feature-pill" style="white-space:nowrap;flex-shrink:0;background:${pillBg};border-color:${borderStrong};color:${lightTheme ? text : '#F5F3ED'};font-weight:500;">${f}</span>`).join("")}
        </div>
        ` : ""}
        ${hasSetupSteps ? `
        <div class="export-setup">
          <span class="export-setup-label" style="color:${muted}">How to use:</span>
          <ol style="color:${setupColor};font-size:17px;line-height:1.7;">
            ${tool.setupSteps.map(s => `<li>${s}</li>`).join("")}
          </ol>
        </div>
        ` : ""}
        <div class="export-footer" style="border-color:${border}">
          <span class="meta" style="color:${lightTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'}">${tool.link.replace(/^https?:\/\//, "")}</span>
          <span class="meta" style="color:${lightTheme ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'}">SwapFOSS</span>
        </div>
      </div>
    </div>
  `;
}

async function capturePNG(element) {
  const dataUrl = await htmlToImage.toPng(element, { pixelRatio: 2 });
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function downloadPostZIP(postId, presetKey, lightTheme, progressCallback, postData) {
  const preset = PRESETS[presetKey] || PRESETS.linkedin;
  const [manifest, categories] = await Promise.all([
    loadJSON("data/posts-manifest.json"),
    loadJSON("data/categories.json"),
  ]);
  const post = postData || (await loadJSON(`data/posts/${postId}.json`));

  const tools = await Promise.all(
    post.tools.map(id => loadJSON(`data/tools/${id}.json`))
  );

  const slides = buildSlides(post);
  const total = slides.length;
  let step = 0;
  const zip = new JSZip();
  const folder = zip.folder(postId);

  const renderSlide = async (html, filename) => {
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
    container.innerHTML = html;
    document.body.appendChild(container);
    const blob = await capturePNG(container.firstElementChild);
    container.remove();
    folder.file(filename, blob);
  };

  for (const slide of slides) {
    step++;
    let html;
    if (slide.type === "intro") {
      if (progressCallback) progressCallback(step, total, "Rendering intro");
      html = introCardHTML(post, preset, lightTheme, total, tools);
    } else if (slide.type === "outro") {
      if (progressCallback) progressCallback(step, total, "Rendering outro");
      html = outroCardHTML(post, preset, lightTheme, total);
    } else if (slide.type === "deep") {
      const tool = tools[0];
      if (progressCallback) progressCallback(step, total, `Rendering ${tool.name} — ${slide.part}`);
      html = deepCardHTML(slide.part, tool, categories[tool.category], {
        index: step,
        total,
        light: lightTheme,
      });
    } else {
      const tool = tools.find(t => t.id === slide.tool);
      if (progressCallback) progressCallback(step, total, `Rendering ${tool.name}`);
      html = toolCardHTML(tool, categories[tool.category], preset, lightTheme);
    }
    await renderSlide(html, slideFilename(slide, step, total));
  }

  // Generate ZIP
  if (progressCallback) progressCallback(total, total, "Packaging ZIP");
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${postId}.zip`;
  a.click();
  URL.revokeObjectURL(url);

  return { success: true, fileCount: total };
}

export function generateCaption(post, tools) {
  if (isDeepDive(post) && tools.length === 1) {
    const t = tools[0];
    const points = (t.benefits && t.benefits.length ? t.benefits : t.bullets) || [];
    return `${post.intro.headline}\n\nDeep dive: ${t.name} — ${t.hook}\n${points.map(b => `\n✓ ${b}`).join("")}\n\nAll free. All open-source. No subscriptions. No tracking.`;
  }
  const toolNames = tools.map(t => t.name);
  const insteadOf = tools.map(t => t.insteadOf).filter(Boolean);
  const uniqueInsteadOf = [...new Set(insteadOf.flatMap(s => s.split(" / ")))];
  const replacements =
    uniqueInsteadOf.length <= 2
      ? uniqueInsteadOf.join(" and ")
      : uniqueInsteadOf.slice(0, -1).join(", ") + ", and " + uniqueInsteadOf[uniqueInsteadOf.length - 1];
  return `${post.intro.headline}\n\n${toolNames.length} tools that replace ${replacements}.\n${tools.map(t => `\n• ${t.name} — ${t.hook}`).join("")}\n\nAll free. All open-source. No subscriptions. No tracking.`;
}

// Expose the export helpers for console debugging and automated tests.
Object.assign(window, {
  loadJSON,
  PIN,
  PRESETS,
  introCardHTML,
  outroCardHTML,
  toolCardHTML,
  downloadPostZIP,
  generateCaption,
});
