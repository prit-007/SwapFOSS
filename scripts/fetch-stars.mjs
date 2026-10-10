#!/usr/bin/env node

// Fetches GitHub star counts for every tool with a github.com repo and writes
// public/data/popularity.json (committed). Non-GitHub hosts are recorded with
// a null star count so the UI can fall back gracefully.
//
// Usage: npm run stars   (set GITHUB_TOKEN to raise the API rate limit)

import fs from "node:fs";
import path from "node:path";

const manifestPath = path.resolve("public/data/manifest.json");
const outputPath = path.resolve("public/data/popularity.json");
const token = process.env.GITHUB_TOKEN;

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

/** Extract "owner/repo" from a github.com URL, else null. */
function parseGitHubRepo(url) {
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") return null;
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1].replace(/\.git$/, "")}`;
}

async function fetchStars(slug) {
  const res = await fetch(`https://api.github.com/repos/${slug}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "swapfoss-stars-script",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    console.warn(`  ! ${slug}: HTTP ${res.status}`);
    return null;
  }
  const data = await res.json();
  return typeof data.stargazers_count === "number" ? data.stargazers_count : null;
}

const tools = {};
let fetched = 0;
let failed = 0;

for (const id of manifest.tools) {
  const tool = JSON.parse(fs.readFileSync(path.resolve(`public/data/tools/${id}.json`), "utf-8"));
  const slug = parseGitHubRepo(tool.repo);
  if (!slug) {
    tools[id] = { repo: tool.repo, host: "other", stars: null };
    continue;
  }
  try {
    const stars = await fetchStars(slug);
    tools[id] = { repo: slug, host: "github", stars };
    if (stars === null) failed++;
    else fetched++;
    console.log(`  ✓ ${id} (${slug}): ${stars ?? "—"}`);
  } catch (err) {
    failed++;
    tools[id] = { repo: slug, host: "github", stars: null };
    console.warn(`  ! ${id} (${slug}): ${err.message}`);
  }
  // Stay well under the unauthenticated rate limit when fetching many repos.
  if (!token) await new Promise((r) => setTimeout(r, 250));
}

const output = {
  generatedAt: new Date().toISOString(),
  source: "github",
  tools,
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log(`\nWrote ${outputPath}`);
console.log(`${fetched} star counts fetched, ${failed} failed, ${manifest.tools.length} total.`);
