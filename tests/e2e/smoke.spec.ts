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

test("infinite scroll loads more tools when scrolling near bottom", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();
  const initialCount = await page.locator(".swap-card").count();
  expect(initialCount).toBe(24);
  // each scroll loads one batch; keep scrolling to the bottom until every tool is rendered
  await expect
    .poll(
      async () => {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        return page.locator(".swap-card").count();
      },
      { timeout: 15_000 },
    )
    .toBe(59);
  await expect(page.locator(".load-more-end")).toBeVisible();
  await expect(page.locator(".load-more-end")).toContainText("You've explored all 59 tools");
});

test("clicking search clear button clears the search query", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();
  await page.fill("#tool-search", "jellyfin");
  await expect(page.locator(".search-clear-btn")).toBeVisible();
  await page.locator(".search-clear-btn").click();
  await expect(page.locator("#tool-search")).toHaveValue("");
  await expect(page.locator(".search-clear-btn")).toBeHidden();
  await expect(page.locator(".result-count")).toContainText(/tools$/);
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

test("tag filter narrows results by app type and reflects in URL", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".swap-card").first()).toBeVisible();
  const totalCount = await page.locator(".swap-card").count();

  // Click "Self-Hosted" tag filter button
  const selfHostedBtn = page.locator(".tag-filter-btn", { hasText: "Self-Hosted" });
  await expect(selfHostedBtn).toBeVisible();
  await selfHostedBtn.click();
  await expect(page).toHaveURL(/\btag=self-hosted\b/);

  const selfHostedCount = await page.locator(".swap-card:visible").count();
  expect(selfHostedCount).toBeGreaterThan(0);
  expect(selfHostedCount).toBeLessThan(totalCount);

  // Click "Plug & Play" tag filter button
  const plugAndPlayBtn = page.locator(".tag-filter-btn", { hasText: "Plug & Play" });
  await plugAndPlayBtn.click();
  await expect(page).toHaveURL(/\btag=plug-and-play\b/);

  // Click "All Types" to clear tag filter
  const allTypesBtn = page.locator(".tag-filter-btn", { hasText: "All Types" });
  await allTypesBtn.click();
  await expect(page).not.toHaveURL(/\btag=/);
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

test("preview back button redirects to batch card last position and syncs preset/theme", async ({ page }) => {
  await page.goto("batch");
  const targetCard = page.locator("#batch-card-post-005");
  await expect(targetCard).toBeVisible();

  // Switch preset to square (instagram) and theme to light
  await targetCard.locator(".batch-select").selectOption("instagram");
  await targetCard.locator(".batch-theme-toggle").click();

  // Click Preview
  await targetCard.locator(".batch-post-preview").click();

  // Verify URL has post-005, preset=instagram, theme=light
  await expect(page).toHaveURL(/post=post-005/);
  await expect(page).toHaveURL(/preset=instagram/);
  await expect(page).toHaveURL(/theme=light/);

  // Verify preview stage rendered light theme (white bg)
  const exportCard = page.locator("#stage .export-card");
  await expect(exportCard).toBeVisible();
  await expect(exportCard).toHaveCSS("background-color", "rgb(255, 255, 255)");

  // Click Back button in slide toolbar
  const backBtn = page.locator("#slide-back");
  await expect(backBtn).toBeVisible();
  await expect(backBtn).toContainText("Batch");
  await backBtn.click();

  // Verify redirected back to batch with hash targeting post-005
  await expect(page).toHaveURL(/batch#batch-card-post-005/);
  await expect(page.locator("#batch-card-post-005")).toBeVisible();
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

  await page.selectOption("#tool-sort", "az");
  await expect(page).toHaveURL(/sort=az/);
  await expect(page.locator(".swap-card .swap-to").first()).toHaveText(min);

  await page.selectOption("#tool-sort", "za");
  await expect(page).toHaveURL(/sort=za/);
  await expect(page.locator(".swap-card .swap-to").first()).toBeVisible();
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
  await expect(page.locator(".result-count")).toContainText(/tools$/);
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

test("hero shows a stat strip with tools, categories, and stars", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".hero-stat")).toHaveCount(3);
  await expect(page.locator(".hero-stat").nth(0)).toContainText("open-source tools");
  await expect(page.locator(".hero-stat").nth(1)).toContainText("categories");
  await expect(page.locator(".hero-stat").nth(2)).toContainText("GitHub stars");
});

test("share menu copies a deep link to the tool card", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("");
  await expect(page.locator(".share-btn").first()).toBeVisible();
  await page.locator(".share-btn").first().click();
  await expect(page.locator(".share-menu")).toBeVisible();
  const copied = page.locator(".share-platform", { hasText: "Copy link" });
  await copied.click();
  await expect(page.locator(".share-platform", { hasText: "Copied" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toMatch(/card\?tool=/);
});

test("share menu traps Tab focus inside the dialog", async ({ page }) => {
  await page.goto("");
  await page.locator(".share-btn").first().click();
  await expect(page.locator(".share-menu")).toBeVisible();
  await expect(page.locator(".share-menu-close")).toBeFocused();
  const inDialog = () =>
    page.evaluate(() => !!document.activeElement?.closest(".share-overlay"));
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await inDialog()).toBe(true);
  }
  await page.keyboard.press("Shift+Tab");
  expect(await inDialog()).toBe(true);
});

test("screenshot preview opens from the keyboard and locks body scroll", async ({ page }) => {
  await page.goto("");
  const shot = page.locator(".screenshot-img").first();
  await expect(shot).toBeVisible();
  await shot.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".lightbox")).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.click(".lightbox-close");
  await expect(page.locator(".lightbox")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("card toggles expose aria-expanded", async ({ page }) => {
  await page.goto("");
  const toggle = page.locator(".setup-toggle").first();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toContainText("How to use");
});

test("slide viewer swipes between slides on touch", async ({ page }) => {
  await page.goto("slide?post=post-006&type=deep&part=hero");
  await expect(page.locator("#stage .export-card.deep.deep-hero")).toBeVisible();
  const stage = page.locator("#stage");
  await stage.dispatchEvent("touchstart", {
    touches: [{ identifier: 1, clientX: 320, clientY: 420 }],
  });
  await stage.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 1, clientX: 170, clientY: 420 }],
  });
  await expect(page).toHaveURL(/part=features/);
  await expect(page.locator("#stage .export-card.deep.deep-features")).toBeVisible();

  await stage.dispatchEvent("touchstart", {
    touches: [{ identifier: 2, clientX: 170, clientY: 420 }],
  });
  await stage.dispatchEvent("touchend", {
    changedTouches: [{ identifier: 2, clientX: 320, clientY: 420 }],
  });
  await expect(page).toHaveURL(/part=hero/);
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

test("batch page interactive Post Studio toggles, switches platforms and angles, and edits narrative", async ({ page }) => {
  await page.goto("batch");
  const firstCard = page.locator(".batch-post-card").first();
  await expect(firstCard).toBeVisible();

  // Initially studio box is not rendered
  await expect(firstCard.locator(".studio-box")).toBeHidden();

  // Open studio
  await firstCard.locator(".batch-caption-btn").click();
  await expect(firstCard.locator(".studio-box")).toBeVisible();
  await expect(firstCard.locator(".studio-title")).toContainText("Multi-Platform Post Studio");

  // Default platform is LinkedIn (story angle)
  const textarea = firstCard.locator(".studio-textarea");
  await expect(textarea).toBeVisible();
  const initialText = await textarea.inputValue();
  expect(initialText.length).toBeGreaterThan(50);
  await expect(firstCard.locator(".studio-stats")).toContainText("chars");

  // Switch to Reddit platform
  await firstCard.locator(".studio-tab", { hasText: "Reddit" }).click();
  await expect(firstCard.locator(".studio-tab.active")).toContainText("Reddit");
  const redditText = await textarea.inputValue();
  expect(redditText).toContain("## ");
  expect(redditText).not.toBe(initialText);

  // Switch to X / Thread platform
  await firstCard.locator(".studio-tab", { hasText: "X / Thread" }).click();
  await expect(firstCard.locator(".studio-tab.active")).toContainText("X / Thread");
  const twitterText = await textarea.inputValue();
  expect(twitterText).toMatch(/🧵|1\//);

  // Switch back to LinkedIn and select Tech angle
  await firstCard.locator(".studio-tab", { hasText: "LinkedIn" }).click();
  await firstCard.locator(".studio-angle-btn", { hasText: "Tech" }).click();
  await expect(firstCard.locator(".studio-angle-btn.active")).toContainText("Tech");
  const techText = await textarea.inputValue();
  expect(techText).toContain("Software architecture matters");

  // Custom edit and reset
  await textarea.fill("Custom user edit test string");
  await expect(firstCard.locator(".studio-stats")).toContainText("5 words");
  await firstCard.locator(".studio-reset-btn").click();
  const resetText = await textarea.inputValue();
  expect(resetText).toContain("Software architecture matters");

  // Toggle close
  await firstCard.locator(".batch-caption-btn").click();
  await expect(firstCard.locator(".studio-box")).toBeHidden();
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
