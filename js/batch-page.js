// Batch export page — loads posts + drafts, renders the grid, wires downloads.

import { loadJSON, PIN, downloadPostZIP, generateCaption } from "./batch-export.js";
import { icon, mountIcons } from "./icons.js";
import { initReveal } from "./reveal.js";

function showLoadError(container, what) {
  container.setAttribute("aria-busy", "false");
  container.innerHTML = `
    <div class="load-error" role="alert">
      <span class="load-error-icon" aria-hidden="true">${icon("alert-01", 20)}</span>
      <p class="load-error-title">Couldn't load ${what}</p>
      <p class="load-error-text">The data files didn't respond. Check your connection and try again.</p>
      <button class="load-error-retry" type="button">${icon("refresh-01")} Retry</button>
    </div>`;
  container.querySelector(".load-error-retry").addEventListener("click", () => location.reload());
}

async function init() {
  mountIcons();
  initReveal();
  const grid = document.getElementById("posts-grid");

  const setThemeToggleUI = (btn, dark) => {
    const ic = btn.querySelector(".batch-theme-icon");
    const lb = btn.querySelector(".batch-theme-label");
    if (ic) ic.innerHTML = icon(dark ? "moon-01" : "sun-01");
    if (lb) lb.textContent = dark ? "Dark" : "Light";
  };

  let allPosts;
  let draftPosts;
  let toolMap;
  let categories;
  try {
    const [manifest, cats] = await Promise.all([
      loadJSON("data/posts-manifest.json"),
      loadJSON("data/categories.json"),
    ]);
    categories = cats;

    const posts = await Promise.all(
      manifest.posts.map(id => loadJSON(`data/posts/${id}.json`))
    );

    // Merge locally saved drafts (from create.html) with manifest posts.
    let drafts = [];
    try {
      drafts = JSON.parse(localStorage.getItem("swapfoss-drafts")) || [];
    } catch { /* ignore */ }
    const publishedIds = new Set(posts.map(p => p.id));
    draftPosts = drafts.filter(d => d && d.id && !publishedIds.has(d.id));
    allPosts = [...posts, ...draftPosts];

    const allTools = await Promise.all(
      [...new Set(allPosts.flatMap(p => p.tools))].map(id => loadJSON(`data/tools/${id}.json`))
    );
    toolMap = Object.fromEntries(allTools.map(t => [t.id, t]));
  } catch (err) {
    showLoadError(grid, "posts");
    return;
  }
  grid.innerHTML = allPosts.map((post, i) => {
    const isDraft = draftPosts.includes(post);
    const isDeep = post.format === "deep-dive";
    const tools = post.tools.map(id => toolMap[id]).filter(Boolean);
    const cats = [...new Set(tools.map(t => t.category))];
    const catBadges = cats.map(c => {
      const cat = categories[c];
      return `<span class="batch-cat-badge" style="--pill-color:${cat.color}">${cat.label}</span>`;
    }).join("");
    const toolThumbs = tools.map(t =>
      t.logo ? `<img class="batch-tool-thumb" src="${t.logo}" alt="${t.name}" title="${t.name}" />` : ""
    ).join("");
    const countText = isDeep
      ? "Deep dive · 6 slides"
      : `${tools.length} tool${tools.length !== 1 ? "s" : ""}`;
    return `
      <div class="batch-post-card ${isDeep ? "batch-post-deep" : ""}" data-post="${post.id}" style="--card-index:${i}">
        <div class="batch-post-header">
          <h2 class="batch-post-title">${post.title}</h2>
          <span class="batch-post-count">${isDraft ? "Draft · " : ""}${countText}</span>
        </div>
        <div class="batch-post-intro">
          <span class="batch-intro-eyebrow">${post.intro.eyebrow}</span>
          <p class="batch-intro-headline">${post.intro.headline}</p>
          <p class="batch-intro-subhead">${post.intro.subhead}</p>
        </div>
        <div class="batch-post-tools">
          <span class="batch-tools-label">${isDeep ? "Featured app:" : "Tools included:"}</span>
          <div class="batch-tool-thumbs">${toolThumbs}</div>
        </div>
        <div class="batch-post-badges">${catBadges}</div>
        <div class="batch-post-controls">
          <div class="batch-control-row">
            <label class="batch-label" for="preset-${post.id}">Preset</label>
            <select class="batch-select" id="preset-${post.id}">
              <option value="linkedin">LinkedIn (1080×1350)</option>
              <option value="instagram">Instagram (1080×1080)</option>
              <option value="twitter">Twitter / X (1200×675)</option>
            </select>
          </div>
          <div class="batch-control-row">
            <label class="batch-label">Theme</label>
            <button class="batch-theme-toggle" data-theme="${post.id}" aria-pressed="false">
              <span class="batch-theme-icon">${icon("sun-01")}</span>
              <span class="batch-theme-label">Light</span>
            </button>
          </div>
          <div class="batch-control-row batch-pin-row">
            <label class="batch-label" for="pin-${post.id}">PIN</label>
            <input class="batch-pin-input" id="pin-${post.id}" type="password" placeholder="Enter PIN" />
          </div>
          <button class="batch-download-btn" data-post="${post.id}">
            <span class="batch-download-text">${icon("download-01")} Download ZIP</span>
            <span class="batch-download-progress" id="progress-${post.id}">
              <span class="batch-progress-bar"><span class="batch-progress-fill" id="fill-${post.id}"></span></span>
              <span class="batch-progress-label" id="label-${post.id}"></span>
            </span>
          </button>
          <button class="batch-caption-btn" data-post="${post.id}">${icon("magic-wand-01")} Generate caption</button>
          <div class="batch-caption-box" id="caption-${post.id}" style="display:none">
            <p class="batch-caption-text" id="caption-text-${post.id}"></p>
            <button class="batch-caption-copy" data-caption="${post.id}">${icon("copy-01")} Copy</button>
          </div>
          ${isDraft ? `<button class="batch-draft-delete" data-delete-draft="${post.id}">${icon("delete-02")} Remove draft</button>` : ""}
        </div>
      </div>
    `;
  }).join("");
  grid.setAttribute("aria-busy", "false");

  // Apply-to-all controls + optional session PIN fill
  const bulkBar = document.getElementById("bulk-bar");
  bulkBar.hidden = false;
  const themeStates = {};

  document.getElementById("bulk-preset").addEventListener("change", (e) => {
    grid.querySelectorAll(".batch-select").forEach(sel => {
      sel.value = e.target.value;
    });
  });

  document.getElementById("bulk-theme").addEventListener("click", (e) => {
    const btn = e.currentTarget;
    const on = !btn.classList.contains("active");
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
    grid.querySelectorAll("[data-theme]").forEach(toggle => {
      themeStates[toggle.dataset.theme] = on;
      toggle.classList.toggle("active", on);
      toggle.setAttribute("aria-pressed", String(on));
      setThemeToggleUI(toggle, on);
    });
    setThemeToggleUI(btn, on);
  });

  const PIN_KEY = "swapfoss-fill-pin";
  const pinRemember = document.getElementById("bulk-pin-remember");
  const fillPins = (value) => {
    grid.querySelectorAll(".batch-pin-input").forEach(input => {
      input.value = value;
    });
  };
  if (sessionStorage.getItem(PIN_KEY) === "1") {
    pinRemember.checked = true;
    fillPins(PIN);
  }
  pinRemember.addEventListener("change", () => {
    sessionStorage.setItem(PIN_KEY, pinRemember.checked ? "1" : "0");
    fillPins(pinRemember.checked ? PIN : "");
  });

  // Theme toggles
  grid.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-theme]");
    if (!toggle) return;
    const id = toggle.dataset.theme;
    themeStates[id] = !themeStates[id];
    toggle.setAttribute("aria-pressed", String(themeStates[id]));
    toggle.classList.toggle("active", themeStates[id]);
    setThemeToggleUI(toggle, themeStates[id]);
  });

  // PIN validation + download
  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".batch-download-btn");
    if (!btn) return;
    const postId = btn.dataset.post;
    const pinInput = document.getElementById(`pin-${postId}`);
    if (pinInput.value !== PIN) {
      pinInput.classList.add("batch-pin-error");
      setTimeout(() => pinInput.classList.remove("batch-pin-error"), 1500);
      return;
    }

    const presetKey = document.getElementById(`preset-${postId}`).value;
    const lightTheme = themeStates[postId] || false;
    const fill = document.getElementById(`fill-${postId}`);
    const label = document.getElementById(`label-${postId}`);
    const text = btn.querySelector(".batch-download-text");

    btn.disabled = true;
    text.style.display = "none";
    document.getElementById(`progress-${postId}`).style.display = "flex";

    try {
      const postData = draftPosts.find(p => p.id === postId) || null;
      await downloadPostZIP(postId, presetKey, lightTheme, (cur, tot, msg) => {
        fill.style.width = `${(cur / tot) * 100}%`;
        label.textContent = `${msg} ${cur}/${tot}`;
      }, postData);
      label.textContent = "Done!";
      setTimeout(() => {
        btn.disabled = false;
        text.style.display = "";
        document.getElementById(`progress-${postId}`).style.display = "none";
        fill.style.width = "0%";
        label.textContent = "";
      }, 1500);
    } catch (err) {
      label.textContent = "Error — try again";
      btn.disabled = false;
      setTimeout(() => {
        text.style.display = "";
        document.getElementById(`progress-${postId}`).style.display = "none";
        fill.style.width = "0%";
        label.textContent = "";
      }, 2000);
    }
  });

  // Generate caption
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".batch-caption-btn");
    if (!btn) return;
    const postId = btn.dataset.post;
    const post = allPosts.find(p => p.id === postId);
    const tools = post.tools.map(id => toolMap[id]).filter(Boolean);
    const caption = generateCaption(post, tools);
    const box = document.getElementById(`caption-${postId}`);
    const textEl = document.getElementById(`caption-text-${postId}`);
    textEl.textContent = caption;
    box.style.display = "block";
  });

  // Copy caption
  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".batch-caption-copy");
    if (!btn) return;
    const postId = btn.dataset.caption;
    const text = document.getElementById(`caption-text-${postId}`).textContent;
    await navigator.clipboard.writeText(text);
    btn.innerHTML = `${icon("tick-04")} Copied!`;
    setTimeout(() => (btn.innerHTML = `${icon("copy-01")} Copy`), 1500);
  });

  // Remove draft
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-draft]");
    if (!btn) return;
    const id = btn.dataset.deleteDraft;
    try {
      const drafts = JSON.parse(localStorage.getItem("swapfoss-drafts")) || [];
      localStorage.setItem("swapfoss-drafts", JSON.stringify(drafts.filter(d => d.id !== id)));
    } catch { /* ignore */ }
    btn.closest(".batch-post-card").remove();
  });
}

document.addEventListener("DOMContentLoaded", init);
