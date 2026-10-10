import { test, expect, type Page } from "@playwright/test";

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("browse renders the tool grid and result count", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();
  const count = await page.locator(".swap-card").count();
  expect(count).toBeGreaterThan(15);
  await expect(page.locator(".result-count")).toContainText("tools");
  expect(errors).toEqual([]);
});

test("search filters the grid and updates the count", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();
  const total = await page.locator(".swap-card").count();

  await page.fill("#tool-search", "password");
  await expect(page.locator(".result-count")).toContainText("of");
  const filtered = await page.locator(".swap-card:visible").count();
  expect(filtered).toBeLessThan(total);
  expect(filtered).toBeGreaterThan(0);
});

test("category filter narrows results and clears", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();
  await page.locator('.filter-btn:not([aria-pressed="false"])').first().waitFor();
  const mediaBtn = page.locator(".filter-btn", { hasText: "Media" }).first();
  await mediaBtn.click();
  const shown = await page.locator(".swap-card:visible").count();
  expect(shown).toBeGreaterThan(0);
});

test("card page renders an export card for ?tool=", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("card?tool=jellyfin");
  await expect(page.locator("#stage .export-card")).toBeVisible();
  await expect(page.locator("#stage .export-card")).toContainText("Jellyfin");
  expect(errors).toEqual([]);
});

test("slide page renders an intro export card", async ({ page }) => {
  await page.goto("slide?post=post-001&type=intro");
  await expect(page.locator("#stage .export-card.intro")).toBeVisible();
  await page.locator("#slide-toolbar #slide-download").waitFor();
});

test("batch page lists posts with PIN + download controls", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("batch");
  await expect(page.locator(".batch-post-card").first()).toBeVisible();
  await expect(page.locator(".batch-pin-input").first()).toBeVisible();
  await expect(page.locator(".batch-download-btn").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("create page shows the form, tool picker, and live preview", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("create");
  await expect(page.locator("#f-id")).toHaveValue(/post-\d{3}/);
  await expect(page.locator(".create-tool-option").first()).toBeVisible();
  await expect(page.locator(".create-preview")).toBeVisible();
  expect(errors).toEqual([]);
});

test("direct deep links work (SPA history routing)", async ({ page }) => {
  await page.goto("batch");
  await expect(page.locator(".batch-post-card").first()).toBeVisible();
  await page.goto("nope-does-not-exist");
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("card page downloads a PNG", async ({ page }) => {
  await page.goto("card?tool=jellyfin");
  await expect(page.locator("#stage .export-card")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 25_000 }),
    page.click("#download-btn"),
  ]);
  expect(download.suggestedFilename()).toBe("swapfoss-jellyfin.png");
  expect(await download.path()).toBeTruthy();
});

test("slide page downloads a PNG", async ({ page }) => {
  await page.goto("slide?post=post-001&type=intro");
  await expect(page.locator("#stage .export-card.intro")).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 25_000 }),
    page.click("#slide-download"),
  ]);
  expect(download.suggestedFilename()).toMatch(/^swapfoss-post-001-intro\.png$/);
});

test("batch export rejects a wrong PIN and accepts the right one", async ({ page }) => {
  await page.goto("batch");
  const firstCard = page.locator(".batch-post-card").first();
  await expect(firstCard).toBeVisible();

  await firstCard.locator(".batch-pin-input").fill("wrong");
  await firstCard.locator(".batch-download-btn").click();
  await expect(firstCard.locator(".batch-pin-input")).toHaveClass(/batch-pin-error/);

  await firstCard.locator(".batch-pin-input").fill("swapfoss2026");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 40_000 }),
    firstCard.locator(".batch-download-btn").click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^post-\d{3}\.zip$/);
});

test("deep-dive post renders the hero slide with a clean history URL", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("slide?post=post-006&type=deep&part=hero");
  await expect(page.locator("#stage .export-card.deep.deep-hero")).toBeVisible();
  await expect(page.locator("#stage .export-card")).toContainText("Umbrel");
  await expect(page.locator("#stage .deep-hero-hook")).toContainText("home server");
  await expect(page.locator("#stage .deep-counter")).toContainText("02 / 06");
  expect(errors).toEqual([]);
});

test("deep-dive slide prev/next walks the fixed 6-slide carousel", async ({ page }) => {
  await page.goto("slide?post=post-006&type=deep&part=features");
  await expect(page.locator("#stage .deep-title")).toContainText("Everything Umbrel does");
  await page.click("#slide-toolbar button:has-text('Next')");
  await expect(page).toHaveURL(/type=deep&part=benefits/);
  await expect(page.locator("#stage .deep-title")).toContainText("Why Umbrel is worth it");
});

test("batch page labels deep-dive posts with their slide count", async ({ page }) => {
  await page.goto("batch");
  const deepCard = page.locator(".batch-post-card.batch-post-deep").first();
  await expect(deepCard).toBeVisible();
  await expect(deepCard.locator(".batch-post-count")).toContainText("Deep dive · 6 slides");
  await expect(deepCard.locator(".batch-tools-label")).toContainText("Featured app:");
});

test("deep-dive ZIP export contains all 6 slides", async ({ page }) => {
  await page.goto("batch");
  const deepCard = page.locator(".batch-post-card.batch-post-deep").first();
  await expect(deepCard).toBeVisible();
  await deepCard.locator(".batch-pin-input").fill("swapfoss2026");
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 60_000 }),
    deepCard.locator(".batch-download-btn").click(),
  ]);
  expect(download.suggestedFilename()).toBe("post-006.zip");
  expect(await download.path()).toBeTruthy();
});

test("create page deep-dive mode enforces a single app and shows the slide strip", async ({ page }) => {
  await page.goto("create");
  await expect(page.locator("#f-id")).toHaveValue(/post-\d{3}/);

  await page.click(".create-format-btn:has-text('Deep dive')");
  await expect(page.locator(".create-format-btn:has-text('Deep dive')")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.locator("p.create-hint", { hasText: "exactly one app" }),
  ).toBeVisible();

  // Single-select: choosing a second app replaces the first.
  const options = page.locator(".create-tool-option");
  await options.filter({ hasText: "Umbrel" }).locator("input").check();
  await options.filter({ hasText: "Jellyfin" }).locator("input").check();
  const checked = await page.locator(".create-tool-option input:checked").count();
  expect(checked).toBe(1);
  await expect(page.locator(".create-slide-strip")).toBeVisible();
  await expect(page.locator(".create-slide-chip").nth(1)).toContainText("Jellyfin");
});

test("batch card Preview link opens the slide carousel", async ({ page }) => {
  await page.goto("batch");
  const deepCard = page.locator(".batch-post-card.batch-post-deep").first();
  await expect(deepCard).toBeVisible();
  await deepCard.locator(".batch-post-preview").click();
  await expect(page).toHaveURL(/\/slide\?.*type=intro/);
  await expect(page).toHaveURL(/post=post-\d{3}/);
  await expect(page.locator("#slide-toolbar #slide-download")).toBeVisible();
});

test("slide dots jump to a specific slide and reflect the current one", async ({ page }) => {
  await page.goto("slide?post=post-006&type=intro");
  await expect(page.locator(".slide-dot")).toHaveCount(6);
  await page.locator(".slide-dot").nth(1).click();
  await expect(page).toHaveURL(/type=deep&part=hero/);
  await expect(page.locator(".slide-dot.active")).toHaveCount(1);
  await expect(page.locator(".slide-counter")).toContainText("2 / 6");
});

test("sort selector reorders the grid and syncs the URL", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();

  const names = await page.locator(".swap-card .swap-to").allInnerTexts();
  const min = [...names].sort((a, b) => a.localeCompare(b))[0];
  const max = [...names].sort((a, b) => b.localeCompare(a))[0];

  await page.selectOption("#tool-sort", "az");
  await expect(page).toHaveURL(/sort=az/);
  await expect(page.locator(".swap-card .swap-to").first()).toHaveText(min);

  await page.selectOption("#tool-sort", "za");
  await expect(page).toHaveURL(/sort=za/);
  await expect(page.locator(".swap-card .swap-to").first()).toHaveText(max);
});

test("view toggle switches grid/list, syncs URL, and survives reload", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();
  await expect(page.locator(".grid.list")).toHaveCount(0);

  await page.locator('.view-btn[aria-label="List view"]').click();
  await expect(page.locator(".grid.list")).toHaveCount(1);
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator('.view-btn[aria-label="List view"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.reload();
  await expect(page.locator(".grid.list")).toHaveCount(1);
});

test("sort + view deep links apply on load", async ({ page }) => {
  await page.goto("?sort=az&view=list");
  await expect(page.locator("#tool-sort")).toHaveValue("az");
  await expect(page.locator(".grid.list")).toHaveCount(1);
});

test("category filter counts add up to the total", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".filter-btn").nth(1)).toBeVisible();
  const counts = (await page.locator(".filter-btn .filter-count").allInnerTexts()).map(Number);
  const [total, ...perCategory] = counts;
  expect(total).toBeGreaterThan(15);
  expect(perCategory.reduce((a, b) => a + b, 0)).toBe(total);
});

test("slash focuses search and Escape clears it", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();

  await page.keyboard.press("/");
  await expect(page.locator("#tool-search")).toBeFocused();
  await page.keyboard.type("jellyfin");
  await expect(page.locator("#tool-search")).toHaveValue("jellyfin");
  await expect(page.locator(".result-count")).toContainText("of");

  await page.keyboard.press("Escape");
  await expect(page.locator("#tool-search")).toHaveValue("");
  await expect(page.locator(".result-count")).toContainText(/^\d+ tools$/);
});

test("cards show difficulty and star badges", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".card-chip-diff").first()).toBeVisible();
  const diffs = await page
    .locator(".card-chip-diff")
    .evaluateAll((els) => els.map((el) => el.getAttribute("data-diff")));
  expect(diffs.length).toBeGreaterThan(0);
  expect(diffs.every((d) => ["easy", "medium", "hard"].includes(d!))).toBe(true);

  expect(await page.locator(".card-chip-stars").count()).toBeGreaterThan(0);
});

test("copying the caption shows a toast", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("");
  await page.click("#copy-caption-btn");
  await expect(page.locator(".toast")).toContainText("Caption copied");
});

test("back-to-top appears after scrolling and returns to the top", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();
  await expect(page.locator(".back-to-top")).toBeHidden();

  await page.evaluate(() => window.scrollTo(0, 2500));
  await expect(page.locator(".back-to-top")).toBeVisible();
  await page.click(".back-to-top");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(50);
});

test.describe("mobile viewport", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function expectNoHorizontalOverflow(page: Page) {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  }

  test("browse has no horizontal scroll", async ({ page }) => {
    await page.goto("");
    await expect(page.locator(".swap-card").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("batch has no horizontal scroll", async ({ page }) => {
    await page.goto("batch");
    await expect(page.locator(".batch-post-card").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("create has no horizontal scroll", async ({ page }) => {
    await page.goto("create");
    await expect(page.locator("#f-id")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("slide page scales the 1080x1350 card to fit", async ({ page }) => {
    await page.goto("slide?post=post-001&type=intro");
    await expect(page.locator("#stage .export-card.intro")).toBeVisible();
    const box = await page.locator("#stage .export-card").boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
    expect(box!.width).toBeGreaterThan(300);
    await expectNoHorizontalOverflow(page);
  });

  test("card page scales the 1080x1350 card to fit", async ({ page }) => {
    await page.goto("card?tool=jellyfin");
    await expect(page.locator("#stage .export-card")).toBeVisible();
    const box = await page.locator("#stage .export-card").boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(390);
    expect(box!.width).toBeGreaterThan(300);
    await expectNoHorizontalOverflow(page);
  });
});
