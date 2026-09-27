// Post builder — compose a carousel post, preview it, save drafts, export JSON.

const DRAFTS_KEY = "swapfoss-drafts";

let toolManifest = [];
let categories = {};
let selectedTools = [];

let postsManifest = [];

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function getDrafts() {
  try {
    return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || [];
  } catch {
    return [];
  }
}

function setDrafts(drafts) {
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
}

function esc(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function buildPost() {
  const id = document.getElementById("f-id").value.trim();
  return {
    id,
    title: document.getElementById("f-title").value.trim(),
    intro: {
      eyebrow: document.getElementById("f-eyebrow").value.trim(),
      headline: document.getElementById("f-headline").value.trim(),
      subhead: document.getElementById("f-subhead").value.trim(),
    },
    tools: [...selectedTools],
    outro: {
      headline: document.getElementById("f-outro-headline").value.trim(),
      subhead: document.getElementById("f-outro-subhead").value.trim(),
    },
  };
}

function validate(post) {
  const errors = [];
  if (!/^post-\d{3}$/.test(post.id)) errors.push("ID must look like post-004");
  if (!post.title) errors.push("Title is required");
  if (!post.intro.eyebrow) errors.push("Eyebrow is required");
  if (!post.intro.headline) errors.push("Intro headline is required");
  if (!post.intro.subhead) errors.push("Intro subhead is required");
  if (!post.tools.length) errors.push("Pick at least one tool");
  if (!post.outro.headline) errors.push("Outro headline is required");
  if (!post.outro.subhead) errors.push("Outro subhead is required");
  return errors;
}

function suggestNextId() {
  const ids = [
    ...postsManifest,
    ...getDrafts().map(d => d.id),
  ];
  const used = new Set();
  ids.forEach(id => {
    const m = /^post-(\d+)$/.exec(id);
    if (m) used.add(parseInt(m[1], 10));
  });
  let n = 1;
  while (used.has(n)) n++;
  return `post-${String(n).padStart(3, "0")}`;
}

function refreshPreview() {
  const post = buildPost();
  document.getElementById("p-eyebrow").textContent = post.intro.eyebrow || "Eyebrow";
  document.getElementById("p-headline").textContent = post.intro.headline || "Your headline";
  document.getElementById("p-subhead").textContent = post.intro.subhead || "Your subhead";
  document.getElementById("p-outro-headline").textContent = post.outro.headline || "Closing headline";
  document.getElementById("p-outro-subhead").textContent = post.outro.subhead || "Closing subhead";

  const previewTools = document.getElementById("preview-tools");
  const tools = selectedTools
    .map(id => toolManifest.find(t => t.id === id))
    .filter(Boolean);
  previewTools.innerHTML = tools.map(t =>
    t.logo
      ? `<img class="batch-tool-thumb" src="${t.logo}" alt="${esc(t.name)}" title="${esc(t.name)}" />`
      : `<span class="batch-tool-thumb" style="display:inline-flex;align-items:center;justify-content:center;font-size:11px;color:var(--text-faint)">${esc(t.name.slice(0, 2))}</span>`
  ).join("");

  const errors = validate(post);
  const jsonPreview = document.getElementById("json-preview");
  if (errors.length) {
    jsonPreview.textContent = errors.join("\n");
    jsonPreview.classList.add("create-json-invalid");
  } else {
    jsonPreview.classList.remove("create-json-invalid");
    jsonPreview.textContent = JSON.stringify(post, null, 2);
  }

  updateGithubLink(post, errors);
  return { post, errors };
}

function updateGithubLink(post, errors) {
  const link = document.getElementById("btn-github");
  if (errors.length) {
    link.removeAttribute("href");
    link.classList.add("create-btn-disabled");
    return;
  }
  link.classList.remove("create-btn-disabled");
  const repo = "prit-007/SwapFOSS";
  const filename = `data/posts/${post.id}.json`;
  const value = JSON.stringify(post, null, 2) + "\n";
  link.href = `https://github.com/${repo}/new/main?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(value)}`;
}

function showStatus(msg, isError) {
  const el = document.getElementById("create-status");
  el.textContent = msg;
  el.classList.toggle("create-status-error", !!isError);
  clearTimeout(showStatus._t);
  showStatus._t = setTimeout(() => (el.textContent = ""), 3000);
}

function renderToolGroups() {
  const grouped = {};
  toolManifest.forEach(t => {
    (grouped[t.category] = grouped[t.category] || []).push(t);
  });
  document.getElementById("tool-groups").innerHTML = Object.entries(grouped).map(([catId, tools]) => {
    const cat = categories[catId] || { label: catId, color: "#999" };
    return `
      <div class="create-tool-group">
        <span class="batch-cat-badge" style="--pill-color:${cat.color}">${esc(cat.label)}</span>
        <div class="create-tool-options">
          ${tools.map(t => `
            <label class="create-tool-option">
              <input type="checkbox" value="${t.id}" />
              ${t.logo ? `<img class="batch-tool-thumb" src="${t.logo}" alt="" />` : ""}
              <span>${esc(t.name)}</span>
            </label>
          `).join("")}
        </div>
      </div>
    `;
  }).join("");

  document.getElementById("tool-groups").addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    const id = e.target.value;
    if (e.target.checked) {
      if (!selectedTools.includes(id)) selectedTools.push(id);
    } else {
      selectedTools = selectedTools.filter(t => t !== id);
    }
    refreshPreview();
  });
}

function renderDrafts() {
  const drafts = getDrafts();
  const list = document.getElementById("drafts-list");
  if (!drafts.length) {
    list.innerHTML = `<p class="create-hint">No drafts yet. Saved drafts appear here and on the batch export page.</p>`;
    return;
  }
  list.innerHTML = drafts.map(d => `
    <div class="create-draft-row" data-draft="${esc(d.id)}">
      <div class="create-draft-info">
        <strong>${esc(d.id)}</strong>
        <span>${esc(d.title || "Untitled")}</span>
        <span class="batch-post-count">${d.tools.length} tool${d.tools.length !== 1 ? "s" : ""}</span>
      </div>
      <div class="create-draft-actions">
        <button class="batch-caption-btn" data-load="${esc(d.id)}">Edit</button>
        <button class="batch-caption-btn" data-remove="${esc(d.id)}">Delete</button>
      </div>
    </div>
  `).join("");
}

function loadDraft(id) {
  const draft = getDrafts().find(d => d.id === id);
  if (!draft) return;
  document.getElementById("f-id").value = draft.id;
  document.getElementById("f-title").value = draft.title || "";
  document.getElementById("f-eyebrow").value = draft.intro.eyebrow || "";
  document.getElementById("f-headline").value = draft.intro.headline || "";
  document.getElementById("f-subhead").value = draft.intro.subhead || "";
  document.getElementById("f-outro-headline").value = draft.outro.headline || "";
  document.getElementById("f-outro-subhead").value = draft.outro.subhead || "";
  selectedTools = [...draft.tools];
  document.querySelectorAll("#tool-groups input[type=checkbox]").forEach(cb => {
    cb.checked = selectedTools.includes(cb.value);
  });
  refreshPreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveDraft() {
  const { post, errors } = refreshPreview();
  if (errors.length) {
    showStatus(errors[0], true);
    return;
  }
  const drafts = getDrafts();
  const idx = drafts.findIndex(d => d.id === post.id);
  if (idx >= 0) drafts[idx] = post;
  else drafts.push(post);
  setDrafts(drafts);
  renderDrafts();
  showStatus("Draft saved");
}

function downloadJSON() {
  const { post, errors } = refreshPreview();
  if (errors.length) {
    showStatus(errors[0], true);
    return;
  }
  const blob = new Blob([JSON.stringify(post, null, 2) + "\n"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${post.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("Downloaded");
}

async function copyJSON() {
  const { post, errors } = refreshPreview();
  if (errors.length) {
    showStatus(errors[0], true);
    return;
  }
  await navigator.clipboard.writeText(JSON.stringify(post, null, 2));
  showStatus("Copied to clipboard");
}

async function init() {
  const [manifest, cats, postsMan] = await Promise.all([
    loadJSON("data/manifest.json"),
    loadJSON("data/categories.json"),
    loadJSON("data/posts-manifest.json"),
  ]);
  categories = cats;
  postsManifest = postsMan.posts;
  toolManifest = await Promise.all(manifest.tools.map(id => loadJSON(`data/tools/${id}.json`)));

  renderToolGroups();
  document.getElementById("f-id").value = suggestNextId();
  renderDrafts();
  refreshPreview();

  document.getElementById("create-form").addEventListener("input", refreshPreview);
  document.getElementById("btn-save").addEventListener("click", saveDraft);
  document.getElementById("btn-download").addEventListener("click", downloadJSON);
  document.getElementById("btn-copy").addEventListener("click", copyJSON);
  document.getElementById("btn-github").addEventListener("click", (e) => {
    if (!e.currentTarget.getAttribute("href")) {
      e.preventDefault();
      showStatus("Fill in all fields first", true);
    }
  });

  document.getElementById("drafts-list").addEventListener("click", (e) => {
    const loadBtn = e.target.closest("[data-load]");
    if (loadBtn) {
      loadDraft(loadBtn.dataset.load);
      return;
    }
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      const id = removeBtn.dataset.remove;
      setDrafts(getDrafts().filter(d => d.id !== id));
      renderDrafts();
      showStatus("Draft deleted");
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
