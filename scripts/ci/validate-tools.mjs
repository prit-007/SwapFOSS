#!/usr/bin/env node

// Validates tool JSON files against the required schema.
// Usage: node scripts/ci/validate-tools.mjs

import fs from "node:fs";
import path from "node:path";

const REQUIRED_FIELDS = [
  "id",
  "name",
  "category",
  "insteadOf",
  "hook",
  "bullets",
  "details",
  "setup",
  "difficulty",
  "link",
  "repo",
];

const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

let errors = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

// 1. Load categories
console.log("\n▸ Validating categories.json");
const categoriesPath = path.resolve("public/data/categories.json");
let categories;
try {
  categories = JSON.parse(fs.readFileSync(categoriesPath, "utf-8"));
  const keys = Object.keys(categories);
  if (keys.length === 0) {
    fail("categories.json is empty");
  } else {
    for (const key of keys) {
      const cat = categories[key];
      if (!cat.label || typeof cat.label !== "string") {
        fail(`Category "${key}" missing or invalid "label"`);
      }
      if (!cat.color || !/^#[0-9A-Fa-f]{6}$/.test(cat.color)) {
        fail(`Category "${key}" missing or invalid "color" (expected #RRGGBB)`);
      }
    }
    pass(`${keys.length} categories loaded: ${keys.join(", ")}`);
  }
} catch (e) {
  fail(`Cannot read categories.json: ${e.message}`);
}
// Categories are the source of truth for valid tool categories.
const VALID_CATEGORIES = categories ? Object.keys(categories) : [];

// 2. Load manifest
console.log("\n▸ Validating manifest.json");
const manifestPath = path.resolve("public/data/manifest.json");
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  if (!Array.isArray(manifest.tools) || manifest.tools.length === 0) {
    fail('manifest.json must have a non-empty "tools" array');
  } else {
    pass(`${manifest.tools.length} tools registered: ${manifest.tools.join(", ")}`);
  }
} catch (e) {
  fail(`Cannot read manifest.json: ${e.message}`);
}

// 3. Validate each tool
if (manifest?.tools) {
  for (const toolId of manifest.tools) {
    console.log(`\n▸ Validating tool: ${toolId}`);
    const toolPath = path.resolve(`public/data/tools/${toolId}.json`);

    if (!fs.existsSync(toolPath)) {
      fail(`File not found: public/data/tools/${toolId}.json`);
      continue;
    }

    let tool;
    try {
      tool = JSON.parse(fs.readFileSync(toolPath, "utf-8"));
    } catch (e) {
      fail(`Invalid JSON: ${e.message}`);
      continue;
    }

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      if (tool[field] === undefined || tool[field] === null || tool[field] === "") {
        fail(`Missing required field: "${field}"`);
      }
    }

    // Validate id matches filename
    if (tool.id !== toolId) {
      fail(`id "${tool.id}" does not match filename "${toolId}"`);
    }

    // Validate category
    if (tool.category && !VALID_CATEGORIES.includes(tool.category)) {
      fail(`Invalid category "${tool.category}" — must be one of: ${VALID_CATEGORIES.join(", ")}`);
    }

    // Validate difficulty
    if (tool.difficulty && !VALID_DIFFICULTIES.includes(tool.difficulty)) {
      fail(`Invalid difficulty "${tool.difficulty}" — must be one of: ${VALID_DIFFICULTIES.join(", ")}`);
    }

    // Validate bullets is array with 1-5 items
    if (tool.bullets) {
      if (!Array.isArray(tool.bullets)) {
        fail('"bullets" must be an array');
      } else if (tool.bullets.length < 1 || tool.bullets.length > 5) {
        fail(`"bullets" must have 1-5 items, got ${tool.bullets.length}`);
      }
    }

    // Validate benefits (optional, deep-dive slides) — array of 1-6 strings
    if (tool.benefits !== undefined) {
      if (!Array.isArray(tool.benefits)) {
        fail('"benefits" must be an array');
      } else if (tool.benefits.length < 1 || tool.benefits.length > 6) {
        fail(`"benefits" must have 1-6 items, got ${tool.benefits.length}`);
      } else if (tool.benefits.some(b => typeof b !== "string" || !b.trim())) {
        fail('"benefits" items must be non-empty strings');
      }
    }

    // Validate URLs
    for (const urlField of ["link", "repo"]) {
      if (tool[urlField] && !/^https?:\/\//.test(tool[urlField])) {
        fail(`"${urlField}" must be a valid URL starting with http:// or https://`);
      }
    }

    // Validate details is a substantial paragraph
    if (tool.details && tool.details.length < 50) {
      fail(`"details" should be at least 50 characters (got ${tool.details.length})`);
    }

    if (errors === 0) {
      pass(`${tool.name} — all checks passed`);
    }
  }
}

// 4. Check for orphan tool files (files not in manifest)
console.log("\n▸ Checking for orphan tool files");
const toolsDir = path.resolve("public/data/tools");
if (fs.existsSync(toolsDir)) {
  const files = fs.readdirSync(toolsDir).filter(f => f.endsWith(".json"));
  const manifestSet = new Set(manifest?.tools || []);
  const orphans = files.filter(f => !manifestSet.has(f.replace(".json", "")));
  if (orphans.length > 0) {
    fail(`Orphan tool files not in manifest: ${orphans.join(", ")}`);
  } else {
    pass("No orphan tool files");
  }
}

// 5. Validate post files
console.log("\n▸ Validating post files");
const postsDir = path.resolve("public/data/posts");
if (fs.existsSync(postsDir)) {
  const postFiles = fs.readdirSync(postsDir).filter(f => f.endsWith(".json"));
  for (const postFile of postFiles) {
    const postPath = path.resolve("public/data/posts", postFile);
    try {
      const post = JSON.parse(fs.readFileSync(postPath, "utf-8"));
      if (!post.id) fail(`Post ${postFile}: missing "id"`);
      else if (post.id !== postFile.replace(/\.json$/, "")) {
        fail(`Post ${postFile}: id "${post.id}" does not match filename`);
      }
      if (post.format !== undefined && post.format !== "deep-dive") {
        fail(`Post ${postFile}: unknown format "${post.format}" (only "deep-dive" is allowed)`);
      }
      if (!post.tools || !Array.isArray(post.tools) || post.tools.length === 0) {
        fail(`Post ${postFile}: missing or empty "tools" array`);
      } else {
        const manifestSet = new Set(manifest?.tools || []);
        const missing = post.tools.filter(t => !manifestSet.has(t));
        if (missing.length > 0) {
          fail(`Post ${postFile}: references tools not in manifest: ${missing.join(", ")}`);
        }
        if (post.format === "deep-dive" && post.tools.length !== 1) {
          fail(`Post ${postFile}: deep-dive format must feature exactly one tool (got ${post.tools.length})`);
        }
      }
      pass(`${postFile} — valid`);
    } catch (e) {
      fail(`Post ${postFile}: ${e.message}`);
    }
  }
}

// Summary
console.log("\n" + "─".repeat(50));
if (errors > 0) {
  console.error(`\n✗ ${errors} error(s) found. Fix them before merging.\n`);
  process.exit(1);
} else {
  console.log(`\n✓ All validations passed.\n`);
  process.exit(0);
}
