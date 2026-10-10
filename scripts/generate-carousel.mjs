// Usage: node scripts/generate-carousel.mjs post-001
// Requires: npm install -D playwright  (then: npx playwright install chromium)
// Build and serve the site first: npm run build && npm run preview
// Then run this script against that server (defaults to http://localhost:4173/SwapFOSS).

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const POST_ID = process.argv[2];
if (!POST_ID) {
  console.error("Usage: node scripts/generate-carousel.mjs <post-id>");
  process.exit(1);
}

const BASE_URL = process.env.SWAPFOSS_URL || "http://localhost:4173/SwapFOSS";
const OUT_DIR = path.resolve("output", POST_ID);

// Mirrors DEEP_PARTS in src/export/deep-cards.ts (Node can't import the TS module).
const DEEP_PARTS = ["hero", "features", "benefits", "setup"];

async function shootSlide(page, url, outPath) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector("#stage .export-card");
  const el = await page.$("#stage .export-card");
  await el.screenshot({ path: outPath });
  console.log("Saved", outPath);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const postData = JSON.parse(
    fs.readFileSync(path.resolve("public/data/posts", `${POST_ID}.json`), "utf-8")
  );

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1500 } });

  let slideNum = 1;
  const pad = (n) => String(n).padStart(2, "0");
  const isDeep = postData.format === "deep-dive";

  // Intro
  await shootSlide(
    page,
    `${BASE_URL}/slide?post=${POST_ID}&type=intro`,
    path.join(OUT_DIR, `${pad(slideNum++)}-intro.png`)
  );

  if (isDeep) {
    // Deep dives always render the fixed 6-slide carousel: intro + 4 deep parts + outro.
    for (const part of DEEP_PARTS) {
      await shootSlide(
        page,
        `${BASE_URL}/slide?post=${POST_ID}&type=deep&part=${part}`,
        path.join(OUT_DIR, `${pad(slideNum++)}-${part}.png`)
      );
    }
  } else {
    // One slide per tool, in the order listed in the post
    for (const toolId of postData.tools) {
      await shootSlide(
        page,
        `${BASE_URL}/slide?post=${POST_ID}&type=tool&tool=${toolId}`,
        path.join(OUT_DIR, `${pad(slideNum++)}-${toolId}.png`)
      );
    }
  }

  // Outro
  await shootSlide(
    page,
    `${BASE_URL}/slide?post=${POST_ID}&type=outro`,
    path.join(OUT_DIR, `${pad(slideNum++)}-outro.png`)
  );

  await browser.close();
  console.log(`\nDone. ${slideNum - 1} slides in ${OUT_DIR}`);
}

main();
