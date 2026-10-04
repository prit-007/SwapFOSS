// End-to-end smoke test against the built site.
// Usage: npm run serve (dist on :8080) in one shell, then: node scripts/smoke.mjs
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
    if (m.type() === "error") errors.push(`[${label}] console: ${m.text()}`);
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

// ── index.html ───────────────────────────────────────────────
{
  const page = await ctx.newPage();
  watch(page, "index", errors);
  await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".swap-card");
  check("index: 21 tool cards", (await page.locator(".swap-card").count()) === 21);
  check("index: 7 filter buttons", (await page.locator(".filter-btn").count()) === 7);

  await page.click('[data-filter="security"]');
  const visible = await page
    .locator(".swap-card")
    .evaluateAll((els) => els.filter((e) => e.style.display !== "none").length);
  check("index: security filter shows 3", visible === 3, `got ${visible}`);
  await page.click('[data-filter="all"]');

  // Share button → html-to-image render → fallback menu
  await page.click('.swap-card [data-export]');
  await page.waitForSelector("#share-overlay", { timeout: 30000 });
  check("index: share menu opened after PNG render", true);
  await page.click("#share-menu-close");
  await page.screenshot({ path: `${OUT_DIR}/index.png`, fullPage: false });
  await page.close();
}

// ── batch.html + real ZIP download ───────────────────────────
{
  const page = await ctx.newPage();
  watch(page, "batch", errors);
  await page.goto(`${BASE}/batch.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".batch-post-card");
  check("batch: 5 post cards", (await page.locator(".batch-post-card").count()) === 5);

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
  await page.close();
}

// ── slide.html (intro/tool/outro) ────────────────────────────
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
  await page.screenshot({ path: `${OUT_DIR}/slide-intro.png` });

  await page.goto(`${BASE}/slide.html?post=post-005&type=tool&tool=bitwarden`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  const name = await page.locator(".tool-name").first().textContent();
  check("slide tool: Bitwarden card", name === "Bitwarden", name);

  await page.goto(`${BASE}/slide.html?post=post-005&type=outro`, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  check("slide outro: CTA present", (await page.locator(".outro-cta").count()) === 1);
  await page.close();
}

// ── card.html ────────────────────────────────────────────────
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
  await page.close();
}

// ── create.html ──────────────────────────────────────────────
{
  const page = await ctx.newPage();
  watch(page, "create", errors);
  await page.goto(`${BASE}/create.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".create-tool-group");
  const groups = await page.locator(".create-tool-group").count();
  check("create: tool groups rendered", groups >= 6, `${groups} groups`);
  await page.close();
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
