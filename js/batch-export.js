// Batch export engine — loads posts, verifies PIN, renders cards, bundles ZIP.

const PIN = "swapfoss2026";

const PRESETS = {
  linkedin: { width: 1080, height: 1350, label: "LinkedIn" },
  instagram: { width: 1080, height: 1080, label: "Instagram" },
  twitter: { width: 1200, height: 675, label: "Twitter / X" },
};

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function introCardHTML(post, preset, lightTheme) {
  const bg = lightTheme ? "#ffffff" : "#0f172a";
  const text = lightTheme ? "#0F1115" : "#F5F3ED";
  const muted = lightTheme ? "#5B616D" : "rgba(255,255,255,0.55)";
  const faint = lightTheme ? "#9AA0AC" : "rgba(255,255,255,0.45)";
  const gridLine = lightTheme ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.02)";
  const watermarkColor = lightTheme ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.025)";
  const mesh = lightTheme
    ? "radial-gradient(circle at 15% 50%, rgba(99,102,241,0.08), transparent 50%), radial-gradient(circle at 85% 30%, rgba(239,68,68,0.06), transparent 50%)"
    : "radial-gradient(circle at 15% 50%, rgba(99,102,241,0.18), transparent 50%), radial-gradient(circle at 85% 30%, rgba(239,68,68,0.15), transparent 50%), radial-gradient(circle at 50% 90%, rgba(16,185,129,0.10), transparent 45%)";
  const grid = `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`;
  return `
    <div class="export-card intro" style="--cat-color:#FF5A5F; background-color:${bg}; background-image:${mesh}; color:${text}; width:${preset.width}px; height:${preset.height}px; position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; text-align:center; padding:64px;">
      <div style="position:absolute;inset:0;background-image:${grid};background-size:40px 40px;pointer-events:none;z-index:0;"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-display);font-size:280px;font-weight:800;color:${watermarkColor};z-index:0;pointer-events:none;letter-spacing:-0.04em;white-space:nowrap;">FOSS</div>
      <div style="position:absolute;top:64px;left:64px;z-index:2;font-family:var(--font-display);font-weight:700;font-size:22px;letter-spacing:-0.02em;color:${text}">Swap<span style="color:#FF5A5F">FOSS</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:24px;position:relative;z-index:2;margin-top:auto;margin-bottom:auto;max-width:700px;">
        <span style="font-size:16px;color:${faint};font-family:var(--font-body);font-weight:500;letter-spacing:0.08em;text-transform:uppercase;">${post.intro.eyebrow}</span>
        <h1 style="font-family:var(--font-display);font-weight:700;font-size:52px;line-height:1.1;margin:0;max-width:15ch;color:${text};">${post.intro.headline}</h1>
        <p style="font-size:20px;color:${muted};max-width:30ch;margin:0;line-height:1.5;">${post.intro.subhead}</p>
      </div>
    </div>
  `;
}

function outroCardHTML(post, preset, lightTheme) {
  const bg = lightTheme ? "#ffffff" : "#0f172a";
  const text = lightTheme ? "#0F1115" : "#F5F3ED";
  const muted = lightTheme ? "#5B616D" : "rgba(255,255,255,0.55)";
  const gridLine = lightTheme ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.02)";
  const watermarkColor = lightTheme ? "rgba(0,0,0,0.03)" : "rgba(255,255,255,0.025)";
  const mesh = lightTheme
    ? "radial-gradient(circle at 80% 60%, rgba(99,102,241,0.08), transparent 50%), radial-gradient(circle at 20% 30%, rgba(59,130,246,0.06), transparent 50%)"
    : "radial-gradient(circle at 80% 60%, rgba(99,102,241,0.18), transparent 50%), radial-gradient(circle at 20% 30%, rgba(59,130,246,0.15), transparent 50%), radial-gradient(circle at 50% 10%, rgba(168,85,247,0.10), transparent 45%)";
  const grid = `linear-gradient(to right, ${gridLine} 1px, transparent 1px), linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`;
  const border = lightTheme ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.15)";
  return `
    <div class="export-card outro" style="--cat-color:#4EA8DE; background-color:${bg}; background-image:${mesh}; color:${text}; width:${preset.width}px; height:${preset.height}px; position:relative; overflow:hidden; display:flex; flex-direction:column; align-items:center; text-align:center; padding:64px;">
      <div style="position:absolute;inset:0;background-image:${grid};background-size:40px 40px;pointer-events:none;z-index:0;"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:var(--font-display);font-size:280px;font-weight:800;color:${watermarkColor};z-index:0;pointer-events:none;letter-spacing:-0.04em;white-space:nowrap;">SWAP</div>
      <div style="position:absolute;top:64px;left:64px;z-index:2;font-family:var(--font-display);font-weight:700;font-size:22px;letter-spacing:-0.02em;color:${text}">Swap<span style="color:#4EA8DE">FOSS</span></div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:24px;position:relative;z-index:2;margin-top:auto;margin-bottom:auto;max-width:700px;">
        <h1 style="font-family:var(--font-display);font-weight:700;font-size:52px;line-height:1.1;margin:0;max-width:15ch;color:${text};">${post.outro.headline}</h1>
        <p style="font-size:20px;color:${muted};max-width:30ch;margin:0;line-height:1.5;">${post.outro.subhead}</p>
        <div style="margin-top:8px;padding:16px 36px;border-radius:999px;border:1px solid ${border};font-family:var(--font-body);font-size:16px;font-weight:600;color:${text};background:${lightTheme ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'};">Follow for more swaps</div>
      </div>
    </div>
  `;
}

function toolCardHTML(tool, cat, preset, lightTheme) {
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
        <span class="tag" style="position:absolute;top:0;right:0;background:${lightTheme ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)'};border-color:${border};color:${muted};font-size:13px;padding:5px 14px;">${cat.label}</span>
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
          ${tool.features.map(f => `<span class="export-feature-pill" style="background:${pillBg};border-color:${borderStrong};color:${lightTheme ? text : '#F5F3ED'};font-weight:600;">${f}</span>`).join("")}
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

async function downloadPostZIP(postId, presetKey, lightTheme, progressCallback) {
  const preset = PRESETS[presetKey] || PRESETS.linkedin;
  const [manifest, categories, post] = await Promise.all([
    loadJSON("data/posts-manifest.json"),
    loadJSON("data/categories.json"),
    loadJSON(`data/posts/${postId}.json`),
  ]);

  const tools = await Promise.all(
    post.tools.map(id => loadJSON(`data/tools/${id}.json`))
  );

  const total = 2 + tools.length;
  let step = 0;
  const zip = new JSZip();
  const folder = zip.folder(postId);

  // Render intro
  step++;
  if (progressCallback) progressCallback(step, total, "Rendering intro");
  const introContainer = document.createElement("div");
  introContainer.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  introContainer.innerHTML = introCardHTML(post, preset, lightTheme);
  document.body.appendChild(introContainer);
  const introBlob = await capturePNG(introContainer.firstElementChild);
  introContainer.remove();
  folder.file("01-intro.png", introBlob);

  // Render tool cards
  for (let i = 0; i < tools.length; i++) {
    step++;
    if (progressCallback) progressCallback(step, total, `Rendering ${tools[i].name}`);
    const cat = categories[tools[i].category];
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
    container.innerHTML = toolCardHTML(tools[i], cat, preset, lightTheme);
    document.body.appendChild(container);
    const blob = await capturePNG(container.firstElementChild);
    container.remove();
    const num = String(i + 2).padStart(2, "0");
    folder.file(`${num}-${tools[i].id}.png`, blob);
  }

  // Render outro
  step++;
  if (progressCallback) progressCallback(step, total, "Rendering outro");
  const outroContainer = document.createElement("div");
  outroContainer.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  outroContainer.innerHTML = outroCardHTML(post, preset, lightTheme);
  document.body.appendChild(outroContainer);
  const outroBlob = await capturePNG(outroContainer.firstElementChild);
  outroContainer.remove();
  folder.file(`${String(total).padStart(2, "0")}-outro.png`, outroBlob);

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

function generateCaption(post, tools) {
  const toolNames = tools.map(t => t.name);
  const insteadOf = tools.map(t => t.insteadOf).filter(Boolean);
  const uniqueInsteadOf = [...new Set(insteadOf.flatMap(s => s.split(" / ")))];
  const replacements =
    uniqueInsteadOf.length <= 2
      ? uniqueInsteadOf.join(" and ")
      : uniqueInsteadOf.slice(0, -1).join(", ") + ", and " + uniqueInsteadOf[uniqueInsteadOf.length - 1];
  return `${post.intro.headline}\n\n${toolNames.length} tools that replace ${replacements}.\n${tools.map(t => `\n• ${t.name} — ${t.hook}`).join("")}\n\nAll free. All open-source. No subscriptions. No tracking.`;
}
