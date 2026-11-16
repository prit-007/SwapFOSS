import type { Category, Post, Tool } from "@/types";
import { typeScale, type Preset } from "./presets";
import { iconSvg } from "./icon";
import { formatStars } from "@/utils/formatStars";

const NOISE_URI =
  "data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%27300%27%20height=%27300%27%3E%3Cfilter%20id=%27n%27%3E%3CfeTurbulence%20type=%27fractalNoise%27%20baseFrequency=%270.85%27%20numOctaves=%274%27%20stitchTiles=%27stitch%27/%3E%3CfeColorMatrix%20type=%27saturate%27%20values=%270%27/%3E%3C/filter%3E%3Crect%20width=%27100%25%27%20height=%27100%25%27%20filter=%27url(%23n)%27/%3E%3C/svg%3E";

function hlLastWord(
  text: string,
  c1: string,
  c2: string,
  hl?: { word: string; color?: string },
): string {
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

export function introCardHTML(
  post: Post,
  preset: Preset,
  lightTheme: boolean,
  totalSlides: number,
  tools: Tool[],
): string {
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
  const introBody =
    Array.isArray(post.intro.pills) && post.intro.pills.length
      ? `<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px;">${post.intro.pills
          .map(
            (p) =>
              `<span style="display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:16px;color:${pillText};background:${pillBg};border:1px solid ${pillBorder};padding:9px 18px;border-radius:999px;white-space:nowrap;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);">${iconSvg("tick-04", { size: 17, color: pillText })}${p}</span>`,
          )
          .join("")}</div>`
      : `<p style="font-family:var(--font-body);font-size:${s.sub}px;color:${muted};max-width:34ch;margin:0;line-height:1.5;">${post.intro.subhead}</p>`;
  const icons = (tools || [])
    .slice(0, 4)
    .map((t, i) => {
      const pos = [
        "top:11%;left:7%;transform:rotate(-8deg);",
        "top:17%;right:9%;transform:rotate(5deg);",
        "bottom:21%;left:11%;transform:rotate(12deg);",
        "bottom:14%;right:7%;transform:rotate(-6deg);",
      ][i];
      return `<img src="${t.logo}" alt="" style="position:absolute;${pos}width:76px;height:76px;object-fit:contain;filter:blur(1.5px) drop-shadow(0 16px 32px rgba(0,0,0,0.5));opacity:0.65;z-index:1;" />`;
    })
    .join("");
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
      <div style="position:absolute;bottom:48px;left:0;right:0;z-index:3;display:flex;align-items:center;justify-content:center;gap:12px;font-family:var(--font-mono);font-size:17px;letter-spacing:0.32em;text-transform:uppercase;color:${swipeColor};"><span style="display:block;width:40px;height:2px;background:linear-gradient(90deg,transparent,${swipeLine});"></span>Swipe ${iconSvg("arrow-right-01", { size: 18, color: swipeColor })}<span style="display:block;width:40px;height:2px;background:linear-gradient(-90deg,transparent,${swipeLine});"></span></div>
    </div>
  `;
}

export function outroCardHTML(
  post: Post,
  preset: Preset,
  lightTheme: boolean,
  totalSlides: number,
): string {
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
  const dots = [0, 1, 2]
    .map(
      (i) =>
        `<span style="width:9px;height:9px;border-radius:50%;background:${i === 2 ? "#4EA8DE" : lightTheme ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.18)"}"></span>`,
    )
    .join("");
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
        <div style="display:inline-flex;align-items:center;gap:10px;margin-top:8px;padding:20px 44px;border-radius:999px;font-family:var(--font-display);font-size:${s.cta}px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ffffff;background:linear-gradient(135deg,#4EA8DE,#B983FF);box-shadow:0 12px 40px rgba(78,168,222,0.35);white-space:nowrap;">Follow for more swaps ${iconSvg("arrow-right-01", { size: s.cta, color: "#ffffff", stroke: 2 })}</div>
        <span style="font-family:var(--font-mono);font-size:16px;letter-spacing:0.1em;color:${faint};">github.com/prit-007/SwapFOSS</span>
      </div>
      <div style="position:absolute;bottom:48px;left:0;right:0;z-index:3;display:flex;justify-content:center;gap:9px;">${dots}</div>
    </div>
  `;
}

function formatTagShort(tag: string): string {
  switch (tag) {
    case "self-hosted":
      return "Self-Hosted";
    case "install-and-use":
      return "Install & Use";
    case "plug-and-play":
      return "Plug & Play";
    case "offline-first":
      return "Offline-First";
    case "e2e-encrypted":
      return "E2E Encrypted";
    case "local-first":
      return "Local-First";
    case "p2p":
      return "P2P";
    default:
      return tag;
  }
}

export function toolCardHTML(
  tool: Tool,
  cat: Category,
  preset: Preset,
  lightTheme: boolean,
  slideInfo?: { index: number; total: number },
): string {
  const hasLogo = !!tool.logo;
  const hasScreenshot = !!tool.screenshot;
  const hasFeatures = !!tool.features && tool.features.length > 0;
  const hasSetupSteps = !!tool.setupSteps && tool.setupSteps.length > 0;
  const isPortrait = tool.screenshotType === "portrait";
  const frameClass = isPortrait ? "device-frame portrait" : "device-frame landscape";
  const bg = lightTheme ? "#ffffff" : "#0f172a";
  const text = lightTheme ? "#0F1115" : "#F5F3ED";
  const muted = lightTheme ? "#5B616D" : "#9AA0AC";
  const faint = lightTheme ? "rgba(15,17,21,0.45)" : "rgba(255,255,255,0.42)";
  const border = lightTheme ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)";
  const borderStrong = lightTheme ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.14)";
  const pillBg = lightTheme ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.07)";
  const chromeBg = lightTheme ? "#E2E8F0" : "#242933";
  const chromeDot = lightTheme ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.22)";
  const screenshotBg = lightTheme ? "#F1F5F9" : "#181D26";
  const setupColor = lightTheme ? "#334155" : "#d1d5db";

  const mesh = lightTheme
    ? `radial-gradient(circle at 85% 15%, ${cat.color}15, transparent 50%), radial-gradient(circle at 15% 85%, rgba(99,102,241,0.06), transparent 50%)`
    : `radial-gradient(circle at 85% 15%, ${cat.color}25, transparent 55%), radial-gradient(circle at 15% 85%, rgba(99,102,241,0.14), transparent 50%)`;
  const gridLine = lightTheme ? "rgba(0,0,0,0.025)" : "rgba(255,255,255,0.02)";
  const grid = `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`;

  const slideCounterHTML = slideInfo
    ? `<span style="font-family:var(--font-mono);font-size:15px;font-weight:600;letter-spacing:0.12em;color:${faint};white-space:nowrap;padding:4px 10px;border-radius:999px;background:${pillBg};border:1px solid ${border};">${String(slideInfo.index).padStart(2, "0")} / ${String(slideInfo.total).padStart(2, "0")}</span>`
    : "";

  const tagLabel = tool.tags && tool.tags[0] ? formatTagShort(tool.tags[0]) : null;
  const tagIconName = tool.tags && tool.tags[0] === "self-hosted" ? "server-01" : tool.tags && tool.tags[0] === "plug-and-play" ? "plug-01" : "download-01";
  const tagBadgeHTML = tagLabel
    ? `<span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--font-mono);font-size:12px;font-weight:500;padding:5px 12px;border-radius:999px;background:${pillBg};border:1px solid ${border};color:${muted};white-space:nowrap;">${iconSvg(tagIconName, { size: 12, color: muted })}${tagLabel}</span>`
    : "";

  const starsBadgeHTML = tool.stars && tool.stars > 0
    ? `<span style="display:inline-flex;align-items:center;gap:4px;font-family:var(--font-mono);font-size:12px;font-weight:600;padding:5px 10px;border-radius:999px;background:rgba(234,179,8,0.10);border:1px solid rgba(234,179,8,0.25);color:#EAB308;white-space:nowrap;">★ ${formatStars(tool.stars)}</span>`
    : "";

  return `
    <div class="export-card" style="--cat-color:${cat.color}; background-color:${bg}; background-image:${mesh}; color:${text}; width:${preset.width}px; height:${preset.height}px; position:relative; overflow:hidden;">
      <div style="position:absolute;inset:0;background-image:${grid};background-size:40px 40px;pointer-events:none;z-index:0;"></div>
      <div style="position:absolute;inset:0;background:url('${NOISE_URI}');opacity:${lightTheme ? 0.06 : 0.12};mix-blend-mode:overlay;pointer-events:none;z-index:1;"></div>
      <div class="export-top" style="position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:18px;">
          ${hasLogo ? `<img class="export-logo" src="${tool.logo}" alt="${tool.name} logo" style="box-shadow:0 8px 24px rgba(0,0,0,0.25);border:1px solid ${border};" />` : ""}
          <div class="export-top-text">
            <span class="tool-name" style="color:${cat.color}">${tool.name}</span>
            <span class="swap-line" style="color:${muted}"><span class="strike" style="color:${faint}">${tool.insteadOf}</span> ${iconSvg("arrow-right-01", { size: 17, color: muted })} ${tool.name}</span>
          </div>
        </div>
        <div class="export-top-badges" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          ${starsBadgeHTML}
          ${tagBadgeHTML}
          <span class="tag" style="white-space:nowrap;background:${cat.color}18;border:1px solid ${cat.color}45;color:${lightTheme ? cat.color : '#fff'};font-weight:600;font-size:13px;padding:5px 14px;border-radius:999px;">${cat.label}</span>
          ${slideCounterHTML}
        </div>
      </div>
      <div class="${frameClass}" style="position:relative;z-index:2;box-shadow:0 24px 60px rgba(0,0,0,0.45), 0 0 40px ${cat.color}18;border:1px solid ${borderStrong};">
        <div class="chrome-bar" style="background:${chromeBg}">
          <span style="background:${chromeDot}"></span><span style="background:${chromeDot}"></span><span style="background:${chromeDot}"></span>
        </div>
        <div class="screenshot-area ${hasScreenshot ? "" : "no-screenshot"}" style="background:${screenshotBg};overflow:hidden;">
          ${hasScreenshot ? `<img src="${tool.screenshot}" alt="${tool.name} screenshot" style="width:100%;height:100%;object-fit:cover;object-position:top left;display:block;" />` : tool.name}
        </div>
      </div>
      <div class="export-bottom" style="position:relative;z-index:2;margin-top:28px;">
        <p class="export-hook" style="color:${text}">${tool.hook}</p>
        ${
          hasFeatures
            ? `
        <div class="export-features" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
          ${tool
            .features!.map(
              (f) =>
                `<span class="export-feature-pill" style="white-space:nowrap;flex-shrink:0;background:${pillBg};border:1px solid ${borderStrong};color:${lightTheme ? text : "#F5F3ED"};font-weight:500;padding:6px 14px;border-radius:9999px;font-size:13px;">${f}</span>`,
            )
            .join("")}
        </div>
        `
            : ""
        }
        ${
          hasSetupSteps
            ? `
        <div class="export-setup">
          <span class="export-setup-label" style="color:${muted}">How to use:</span>
          <ol style="color:${setupColor};font-size:17px;line-height:1.7;">
            ${tool.setupSteps!.map((s) => `<li>${s}</li>`).join("")}
          </ol>
        </div>
        `
            : ""
        }
        <div class="export-footer" style="border-color:${border};margin-top:14px;padding-top:14px;">
          <span class="meta" style="color:${lightTheme ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)"};">${tool.link.replace(/^https?:\/\//, "")}</span>
          <span class="meta" style="color:${lightTheme ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)"};display:inline-flex;align-items:center;gap:6px;"><span style="width:7px;height:7px;border-radius:50%;background:${cat.color};"></span>SwapFOSS</span>
        </div>
      </div>
    </div>
  `;
}
