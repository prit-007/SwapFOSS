import { defineConfig } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Use the highest cached Chromium if the exact revision Playwright expects
 * hasn't been downloaded (offline / sandboxed environments). CI downloads the
 * correct revision and this fallback stays out of the way.
 */
function findCachedChromium(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH;
  const base = join(homedir(), ".cache", "ms-playwright");
  if (!existsSync(base)) return undefined;
  const dirs = readdirSync(base)
    .filter((d) => d.startsWith("chromium-"))
    .sort();
  for (const dir of dirs.reverse()) {
    const p = join(base, dir, "chrome-linux64", "chrome");
    if (existsSync(p)) return p;
  }
  return undefined;
}

const executablePath = findCachedChromium();

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173/SwapFOSS/",
    headless: true,
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    command: "npm run build:only && npm run preview",
    url: "http://localhost:4173/SwapFOSS/",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
