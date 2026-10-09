// Usage: node scripts/generate-carousel.mjs post-001
// Requires: npm install -D playwright  (then: npx playwright install chromium)
// Build and serve the site first: npm run build && npm run serve
// Then run this script against that server (defaults to http://localhost:3111).

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { buildSlides } from "../js/deep-cards.js";

const POST_ID = process.argv[2];
if (!POST_ID) {
  console.error("Usage: node scripts/generate-carousel.mjs <post-id>");
  process.exit(1);
}

const BASE_URL = process.env.SWAPFOSS_URL || "http://localhost:3111";
const OUT_DIR = path.resolve("output", POST_ID);

async function shootSlide(page, url, outPath) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector('body[data-ready="true"]');
  const el = await page.$("#export-target");
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
  const pad = n => String(n).padStart(2, "0");

  if (postData.format === "deep-dive") {
    // Deep dives always render the fixed 6-slide carousel: intro + 4 deep parts + outro.
    const slides = buildSlides(postData);

    // Intro
    await shootSlide(
      page,
      `${BASE_URL}/slide.html?post=${POST_ID}&type=intro`,
      path.join(OUT_DIR, `${pad(slideNum++)}-intro.png`)
    );

    // Deep body slides (hero, features, benefits, setup)
    for (const part of slides.filter(s => s.type === "deep").map(s => s.part)) {
      await shootSlide(
        page,
        `${BASE_URL}/slide.html?post=${POST_ID}&type=deep&part=${part}`,
        path.join(OUT_DIR, `${pad(slideNum++)}-${part}.png`)
      );
    }

    // Outro
    await shootSlide(
      page,
      `${BASE_URL}/slide.html?post=${POST_ID}&type=outro`,
      path.join(OUT_DIR, `${pad(slideNum++)}-outro.png`)
    );
  } else {
    // Intro
    await shootSlide(
      page,
      `${BASE_URL}/slide.html?post=${POST_ID}&type=intro`,
      path.join(OUT_DIR, `${pad(slideNum++)}-intro.png`)
    );

    // One slide per tool, in the order listed in the post
    for (const toolId of postData.tools) {
      await shootSlide(
        page,
        `${BASE_URL}/slide.html?post=${POST_ID}&type=tool&tool=${toolId}`,
        path.join(OUT_DIR, `${pad(slideNum++)}-${toolId}.png`)
      );
    }

    // Outro
    await shootSlide(
      page,
      `${BASE_URL}/slide.html?post=${POST_ID}&type=outro`,
      path.join(OUT_DIR, `${pad(slideNum++)}-outro.png`)
    );
  }

  await browser.close();
  console.log(`\nDone. ${slideNum - 1} slides in ${OUT_DIR}`);
}

main();
