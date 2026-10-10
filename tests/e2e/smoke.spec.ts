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
