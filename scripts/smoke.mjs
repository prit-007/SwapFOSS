// End-to-end smoke test against the built site.
// Usage: npm run serve (dist on :3111) in one shell, then: node scripts/smoke.mjs
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.SWAPFOSS_URL || "http://localhost:3111";
const OUT_DIR = "/tmp/opencode/smoke";
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
let failures = 0;

function check(name, cond, detail = "") {
  results.push(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) failures++;
}

function watch(page, label, errors) {
  page.on("pageerror", (e) => errors.push(`[${label}] ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
      errors.push(`[${label}] console: ${m.text()}`);
    }
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !r.url().includes("favicon")) {
      errors.push(`[${label}] HTTP ${r.status()} ${r.url()}`);
    }
  });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
const errors = [];

const visibleCount = (page) =>
  page.locator(".swap-card").evaluateAll((els) => els.filter((e) => e.style.display !== "none").length);

// ── index.html: cards, filters, search, deep links, a11y ─────
{
  const page = await ctx.newPage();
  watch(page, "index", errors);
  await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".swap-card");
  check("index: 24 tool cards", (await page.locator(".swap-card").count()) === 24);
  check("index: 8 filter buttons", (await page.locator("#filters .filter-btn").count()) === 8);

  // Skip link is the first tab stop
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement.className);
  check("index: skip link first tab stop", focused === "skip-link", focused);
  await page.evaluate(() => document.activeElement.blur());

  // a11y + social meta
  check("index: aria-current on Browse", (await page.locator('.site-nav a[aria-current="location"]').count()) === 1);
  check("index: og:image meta", (await page.locator('meta[property="og:image"]').count()) === 1);
  check("index: twitter:card meta", (await page.locator('meta[name="twitter:card"]').count()) === 1);

  // Filter click → visible subset + shareable URL
  await page.click('[data-filter="security"]');
  const visible = await visibleCount(page);
  check("index: security filter shows 3", visible === 3, `got ${visible}`);
  check("index: filter reflected in URL", page.url().includes("category=security"), page.url());
  await page.click('[data-filter="cloud"]');
  const cloudVis = await visibleCount(page);
  check("index: cloud filter shows 3", cloudVis === 3, `got ${cloudVis}`);
  await page.click('[data-filter="all"]');
  check("index: all filter clears URL", !page.url().includes("category="), page.url());

  // Search: narrows to 1, updates count, empty state + clear
  await page.fill("#tool-search", "bitwarden");
  const searched = await visibleCount(page);
  check("index: search narrows to 1", searched === 1, `got ${searched}`);
  const countText = await page.locator("#result-count").textContent();
  check("index: result count announced", countText === "1 of 24 tools", countText);
  check("index: search reflected in URL", page.url().includes("q=bitwarden"), page.url());

  await page.fill("#tool-search", "zzzzzz");
  check("index: empty state shown", await page.locator("#empty-state").isVisible());
  const emptyTitle = await page.locator("#empty-title").textContent();
  check("index: empty state quotes query", emptyTitle.includes("zzzzzz"), emptyTitle);
  await page.click("#clear-filters");
  check("index: clear restores 24 cards", (await visibleCount(page)) === 24);
  check("index: clear cleans URL", !page.url().includes("q=") && !page.url().includes("category="), page.url());

  // Share button → html-to-image render → fallback menu (focus lands on close)
  await page.click('.swap-card [data-export]');
  await page.waitForSelector("#share-overlay", { timeout: 30000 });
  check("index: share menu opened after PNG render", true);
  check("index: share menu is a dialog", (await page.locator('#share-overlay[role="dialog"][aria-modal="true"]').count()) === 1);
  const focusedEl = await page.evaluate(() => document.activeElement.id);
  check("index: share menu focuses close", focusedEl === "share-menu-close", focusedEl);
  await page.keyboard.press("Escape");
  check("index: Escape closes share menu", (await page.locator("#share-overlay").count()) === 0);

  await page.screenshot({ path: `${OUT_DIR}/index.png`, fullPage: false });
  await page.close();
}

// ── index deep link (?category=) applies on load ─────────────
{
  const page = await ctx.newPage();
  watch(page, "deeplink", errors);
  await page.goto(`${BASE}/index.html?category=media`, { waitUntil: "networkidle" });
  await page.waitForSelector(".swap-card");
  const active = await page.locator('[data-filter="media"]').evaluate((el) => el.classList.contains("active"));
  check("deep link: ?category= activates filter", active);
  const vis = await visibleCount(page);
  check("deep link: subset shown", vis > 0 && vis < 24, `${vis} visible`);
  await page.close();
}

// ── index: load-error recovery (aborted fetch → Retry) ───────
{
  const page = await ctx.newPage();
  watch(page, "error", errors);
  await page.route("**/data/manifest.json", (r) => r.abort());
  await page.goto(`${BASE}/index.html`);
  await page.waitForSelector(".load-error", { timeout: 10000 });
  check("index: load-error card on failed fetch", true);
  check("index: error card has Retry", (await page.locator(".load-error-retry").count()) === 1);
  await page.unroute("**/data/manifest.json");
  await page.click(".load-error-retry");
  await page.waitForSelector(".swap-card", { timeout: 15000 });
  check("index: Retry recovers to full grid", (await page.locator(".swap-card").count()) === 24);
  await page.close();
}

// ── batch.html: bulk bar + PIN recall + real ZIP download ────
{
  const page = await ctx.newPage();
  watch(page, "batch", errors);
  await page.goto(`${BASE}/batch.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".batch-post-card");
  check("batch: 8 post cards", (await page.locator(".batch-post-card").count()) === 8);
  check("batch: aria-current on Batch export", (await page.locator('.site-nav a[aria-current="page"]').count()) === 1);
  const deepBadge = await page.locator('.batch-post-card[data-post="post-006"] .batch-post-count').textContent();
  check("batch: deep-dive badge", deepBadge.includes("Deep dive") && deepBadge.includes("6 slides"), deepBadge);
  const swapBadge = await page.locator('.batch-post-card[data-post="post-004"] .batch-post-count').textContent();
  check("batch: swap badge unchanged", swapBadge.includes("tool"), swapBadge);

  // Apply-to-all preset
  check("batch: bulk bar visible", await page.locator("#bulk-bar").isVisible());
  await page.selectOption("#bulk-preset", "instagram");
  const presets = await page.locator(".batch-post-card .batch-select").evaluateAll((els) => els.map((e) => e.value));
  check("batch: bulk preset applied to all", presets.every((v) => v === "instagram"), presets.join(","));

  // Apply-to-all theme
  await page.click("#bulk-theme");
  const themed = await page.locator(".batch-theme-toggle[data-theme]").evaluateAll((els) =>
    els.every((e) => e.classList.contains("active") && e.getAttribute("aria-pressed") === "true")
  );
  check("batch: bulk theme applied to all", themed);

  // Session PIN recall
  await page.check("#bulk-pin-remember");
  const pins = await page.locator(".batch-pin-input").evaluateAll((els) => els.map((e) => e.value));
  check("batch: PIN filled for session", pins.every((v) => v === "swapfoss2026"), pins.join(","));

  // Reset bulk state before the download test
  await page.uncheck("#bulk-pin-remember");
  await page.click("#bulk-theme");
  await page.selectOption("#bulk-preset", "linkedin");

  await page.fill("#pin-post-004", "wrong");
  await page.click('.batch-download-btn[data-post="post-004"]');
  await page.waitForSelector(".batch-pin-error", { timeout: 5000 }).catch(() => {});
  check(
    "batch: wrong PIN rejected",
    (await page.locator(".batch-pin-error").count()) > 0
  );

  await page.fill("#pin-post-004", "swapfoss2026");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 180000 }),
    page.click('.batch-download-btn[data-post="post-004"]'),
  ]);
  const zipPath = `${OUT_DIR}/post-004.zip`;
  await download.saveAs(zipPath);
  check("batch: ZIP downloaded", fs.statSync(zipPath).size > 100000,
    `${(fs.statSync(zipPath).size / 1024).toFixed(0)} KB`);

  // Deep-dive post ZIP: intro + hero + features + benefits + setup + outro
  await page.fill("#pin-post-006", "swapfoss2026");
  const [deepDl] = await Promise.all([
    page.waitForEvent("download", { timeout: 180000 }),
    page.click('.batch-download-btn[data-post="post-006"]'),
  ]);
  const deepZipPath = `${OUT_DIR}/post-006.zip`;
  await deepDl.saveAs(deepZipPath);
  check("batch: deep ZIP downloaded", fs.statSync(deepZipPath).size > 100000,
    `${(fs.statSync(deepZipPath).size / 1024).toFixed(0)} KB`);
  const JSZip = (await import("jszip")).default;
  const deepZip = await JSZip.loadAsync(fs.readFileSync(deepZipPath));
  const deepNames = Object.keys(deepZip.files).filter(n => !deepZip.files[n].dir).sort();
  check("batch: deep ZIP has 6 slides", deepNames.length === 6, deepNames.join(","));
  check("batch: deep ZIP parts", deepNames.some(n => n.includes("hero")) && deepNames.some(n => n.includes("benefits")) && deepNames.some(n => n.includes("setup")), deepNames.join(","));
  await page.close();
}

// ── batch: load-error recovery ───────────────────────────────
{
  const page = await ctx.newPage();
  watch(page, "batch-error", errors);
  await page.route("**/data/posts-manifest.json", (r) => r.abort());
  await page.goto(`${BASE}/batch.html`);
  await page.waitForSelector(".load-error", { timeout: 10000 });
  check("batch: load-error card on failed fetch", true);
  await page.close();
}

// ── slide.html (intro/tool/outro + prev/next nav) ────────────
{
  const page = await ctx.newPage();
  watch(page, "slide", errors);

  await page.goto(`${BASE}/slide.html?post=post-004&type=intro`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  check("slide intro: 3 stat pills", (await page.locator(".stat-pill").count()) === 3);
  const eyebrow = await page.locator(".eyebrow").textContent();
  check("slide intro: eyebrow", eyebrow === "Free your feed", eyebrow);
  const hl = await page.locator('h1 span[style*="color:#FF0000"]').textContent().catch(() => null);
  check("slide intro: YouTube highlight red", hl === "YouTube", String(hl));
  check("slide intro: back link", (await page.locator("#toolbar-back").count()) === 1);
  check("slide intro: prev disabled at start", await page.locator("#prev-btn").isDisabled());
  check("slide intro: next enabled", !(await page.locator("#next-btn").isDisabled()));
  await page.screenshot({ path: `${OUT_DIR}/slide-intro.png` });

  // Arrow key advances intro → first tool
  await page.keyboard.press("ArrowRight");
  await page.waitForURL(/type=tool/, { timeout: 15000 });
  await page.waitForSelector('body[data-ready="true"]');
  check("slide: arrow key advances to tool", page.url().includes("type=tool"), page.url());
  check("slide tool: prev enabled", !(await page.locator("#prev-btn").isDisabled()));

  // Click next → advances (tool → next tool or outro)
  await page.click("#next-btn");
  await page.waitForFunction(() => document.body.dataset.ready === "true", { timeout: 15000 });
  const advanced = /type=(tool|outro)/.test(page.url());
  check("slide: next button advances", advanced, page.url());

  // Navigate to a known tool slide
  await page.goto(`${BASE}/slide.html?post=post-005&type=tool&tool=bitwarden`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  const name = await page.locator(".tool-name").first().textContent();
  check("slide tool: Bitwarden card", name === "Bitwarden", name);

  await page.goto(`${BASE}/slide.html?post=post-005&type=outro`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  check("slide outro: CTA present", (await page.locator(".outro-cta").count()) === 1);
  check("slide outro: next disabled at end", await page.locator("#next-btn").isDisabled());
  await page.keyboard.press("ArrowLeft");
  await page.waitForURL(/type=tool/, { timeout: 15000 });
  check("slide outro: arrow key goes back", page.url().includes("type=tool"));
  await page.close();
}

// ── slide.html deep-dive post (single app → 6 slides) ────────
{
  const page = await ctx.newPage();
  watch(page, "slide-deep", errors);

  await page.goto(`${BASE}/slide.html?post=post-006&type=intro`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  const deepEyebrow = await page.locator(".eyebrow").textContent();
  check("deep intro: eyebrow", deepEyebrow === "Deep dive — Umbrel", deepEyebrow);
  const counter = (await page.locator(".slide-counter").textContent()).replace(/\s/g, "");
  check("deep intro: counter 01 / 06", counter === "01/06", counter);

  await page.keyboard.press("ArrowRight");
  await page.waitForURL(/type=deep/, { timeout: 15000 });
  await page.waitForSelector('body[data-ready="true"]');
  const heroName = await page.locator(".deep-hero-name").textContent();
  check("deep hero: Umbrel rendered", heroName === "Umbrel", heroName);
  check("deep hero: export target present", (await page.locator("#export-target").count()) === 1);
  const kicker = await page.locator(".deep-kicker").textContent();
  check("deep hero: Deep dive kicker", kicker === "Deep dive", kicker);
  await page.screenshot({ path: `${OUT_DIR}/deep-hero.png` });

  await page.goto(`${BASE}/slide.html?post=post-006&type=deep&part=features`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  const fTitle = await page.locator(".deep-title").textContent();
  check("deep features: title", fTitle === "Everything Umbrel does", fTitle);
  check("deep features: bullets", (await page.locator(".deep-list li").count()) >= 3);
  check("deep features: pills", (await page.locator(".deep-pill").count()) >= 3);
  await page.screenshot({ path: `${OUT_DIR}/deep-features.png` });

  await page.goto(`${BASE}/slide.html?post=post-006&type=deep&part=benefits`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  const bTitle = await page.locator(".deep-title").textContent();
  check("deep benefits: title", bTitle === "Why Umbrel is worth it", bTitle);
  check("deep benefits: 4 items", (await page.locator(".deep-benefits li").count()) === 4);
  await page.screenshot({ path: `${OUT_DIR}/deep-benefits.png` });

  await page.goto(`${BASE}/slide.html?post=post-006&type=deep&part=setup`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  check("deep setup: steps", (await page.locator(".deep-steps li").count()) === 4);
  check("deep setup: meta chips", (await page.locator(".deep-meta .deep-pill").count()) === 2);
  await page.screenshot({ path: `${OUT_DIR}/deep-setup.png` });

  await page.goto(`${BASE}/slide.html?post=post-006&type=outro`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  check("deep outro: final slide, next disabled", await page.locator("#next-btn").isDisabled());
  const outroCounter = (await page.locator(".deep-counter, .slide-counter").first().textContent()).replace(/\s/g, "");
  check("deep outro: counter 06 / 06", outroCounter === "06/06", outroCounter);
  await page.keyboard.press("ArrowLeft");
  await page.waitForURL(/part=setup/, { timeout: 15000 });
  check("deep outro: arrow back to setup", page.url().includes("part=setup"));
  await page.close();
}

// ── card.html: back link + Saved flash ───────────────────────
{
  const page = await ctx.newPage();
  watch(page, "card", errors);
  await page.goto(`${BASE}/card.html?tool=bitwarden`, { waitUntil: "networkidle" });
  await page.waitForSelector("#export-target");
  const name = await page.locator(".tool-name").textContent();
  check("card: Bitwarden rendered", name === "Bitwarden", name);
  const logoOk = await page
    .locator(".export-logo")
    .evaluate((img) => img.complete && img.naturalWidth > 0);
  check("card: logo loaded", logoOk);
  check("card: back link", (await page.locator("#toolbar-back").count()) === 1);

  const [dl] = await Promise.all([
    page.waitForEvent("download", { timeout: 60000 }),
    page.click("#download-btn"),
  ]);
  check("card: PNG downloaded", dl.suggestedFilename().includes("bitwarden"), dl.suggestedFilename());
  const btnText = await page.locator("#download-btn").textContent();
  check("card: Saved flash after download", btnText.includes("Saved"), btnText);
  await page.close();
}

// ── create.html: pills + hl fields, validation ───────────────
{
  const page = await ctx.newPage();
  watch(page, "create", errors);
  await page.goto(`${BASE}/create.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".create-tool-group");
  const groups = await page.locator(".create-tool-group").count();
  check("create: tool groups rendered", groups >= 6, `${groups} groups`);
  check("create: pills field present", (await page.locator("#f-pills").count()) === 1);
  check("create: highlight fields present", (await page.locator("#f-hl-word").count()) === 1 && (await page.locator("#f-hl-color").count()) === 1);
  check("create: aria-current on Create", (await page.locator('.site-nav a[aria-current="page"]').count()) === 1);

  // Fill a valid post with pills + matching highlight word
  await page.fill("#f-title", "Smoke test post");
  await page.fill("#f-eyebrow", "Testing");
  await page.fill("#f-headline", "Keep your passwords secure");
  await page.fill("#f-subhead", "A supporting sentence");
  await page.fill("#f-pills", "No Account, Open Source");
  await page.fill("#f-hl-word", "secure");
  await page.fill("#f-outro-headline", "Swap today");
  await page.fill("#f-outro-subhead", "Start now");
  await page.locator("#tool-groups input[type=checkbox]").first().check();

  const json = await page.locator("#json-preview").textContent();
  check("create: pills exported to JSON", json.includes('"pills"') && json.includes("No Account"), "");
  check("create: hl exported to JSON", json.includes('"hl"') && json.includes('"secure"'), "");
  check("create: valid JSON (no error block)", !(await page.locator("#json-preview").evaluate((el) => el.classList.contains("create-invalid") || el.classList.contains("create-json-invalid"))));
  check("create: preview pills visible", await page.locator("#p-pills").isVisible());

  // Highlight word missing from headline → flagged invalid
  await page.fill("#f-hl-word", "unicorn");
  const flagged = await page.locator("#json-preview").evaluate((el) => el.classList.contains("create-json-invalid"));
  check("create: hl mismatch flagged", flagged);

  // Deep-dive mode: single-app selection, format in JSON, slide strip
  await page.fill("#f-hl-word", "secure");
  await page.click("#format-deep");
  const deepActive = await page.locator("#format-deep").evaluate(el => el.classList.contains("active") && el.getAttribute("aria-pressed") === "true");
  check("create: deep mode activates", deepActive);
  const boxes = page.locator("#tool-groups input[type=checkbox]");
  await boxes.nth(5).check();
  const checkedCount = await boxes.evaluateAll(els => els.filter(e => e.checked).length);
  check("create: deep mode single-select", checkedCount === 1, `${checkedCount} checked`);
  const deepJson = await page.locator("#json-preview").textContent();
  check("create: deep format exported", deepJson.includes('"deep-dive"'), "");
  check("create: slide strip visible", await page.locator("#preview-slides").isVisible());
  const chipCount = await page.locator("#preview-slides .create-slide-chip").count();
  check("create: 6 slide chips", chipCount === 6, `${chipCount} chips`);
  const invalidJson = await page.locator("#json-preview").evaluate((el) => el.classList.contains("create-json-invalid"));
  check("create: deep post valid JSON", !invalidJson);
  await page.close();
}

// ── assets: favicon, og image, 404 page ──────────────────────
{
  const fav = await ctx.request.get(`${BASE}/favicon.svg`);
  check("favicon: served 200", fav.status() === 200, String(fav.status()));
  const og = await ctx.request.get(`${BASE}/assets/og-image.png`);
  check("og image: served 200", og.status() === 200 && (await og.body()).length > 50000, `${(await og.body()).length} bytes`);
  const nf = await ctx.request.get(`${BASE}/404.html`);
  const nfBody = await nf.text();
  check("404 page: served 200", nf.status() === 200 && nfBody.includes("404"));
  check("404 page: links to site", nfBody.includes("SwapFOSS"));
}

await browser.close();

console.log("\n" + results.join("\n"));
if (errors.length) {
  console.log("\nPage errors:");
  for (const e of [...new Set(errors)]) console.log("  " + e);
  failures += new Set(errors).size;
}
console.log(`\n${failures === 0 ? "✓ SMOKE PASS" : `✗ ${failures} failure(s)`}\n`);
process.exit(failures === 0 ? 0 : 1);
