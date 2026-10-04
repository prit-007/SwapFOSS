// Loads categories + tool data, renders the swap-card grid, wires up filters + caption copy.
import { shareCard } from "./share.js";
import { icon, mountIcons } from "./icons.js";
import { initReveal } from "./reveal.js";

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function cardHTML(tool, categories, index = 0) {
  const cat = categories[tool.category] || {};
  const hasDetails = !!tool.details;
  const hasLogo = !!tool.logo;
  const hasScreenshot = !!tool.screenshot;
  const hasFeatures = tool.features && tool.features.length > 0;
  const hasSetupSteps = tool.setupSteps && tool.setupSteps.length > 0;
  return `
    <article class="swap-card" style="--cat-color:${cat.color};--card-index:${index}" data-category="${tool.category}" data-id="${tool.id}">
      <div class="card-media ${hasScreenshot ? "" : "no-screenshot"}" data-fallback-text="${tool.name}">
        ${hasScreenshot ? `<img src="${tool.screenshot}" alt="${tool.name} screenshot" loading="lazy" data-full="${tool.screenshot}" class="screenshot-img" />` : ""}
        ${hasLogo ? `<img class="logo-badge" src="${tool.logo}" alt="${tool.name} logo" />` : ""}
      </div>
      <div class="card-body">
        <div class="card-title-row">
          ${hasLogo ? `<img class="card-logo-inline" src="${tool.logo}" alt="${tool.name} logo" />` : ""}
          <div class="card-title-text">
            <span class="tag">${cat.label || tool.category}</span>
            <div class="swap-row">
              <span class="swap-from">${tool.insteadOf}</span>
              <span class="swap-arrow">${icon("direction-right-01")}</span>
              <span class="swap-to">${tool.name}</span>
            </div>
          </div>
        </div>
        <p class="hook">${tool.hook}</p>
        ${hasFeatures ? `
        <div class="feature-pills">
          ${tool.features.map(f => `<span class="feature-pill">${f}</span>`).join("")}
        </div>
        ` : ""}
        ${hasSetupSteps ? `
        <div class="setup-steps">
          <button class="setup-toggle" data-setup="${tool.id}">How to use ${icon("arrow-down-01")}</button>
          <div class="setup-body" id="setup-${tool.id}">
            <ol>
              ${tool.setupSteps.map(s => `<li>${s}</li>`).join("")}
            </ol>
          </div>
        </div>
        ` : ""}
        ${hasDetails ? `
        <div class="details-expand">
          <button class="details-toggle" data-details="${tool.id}">Read more ${icon("arrow-down-01")}</button>
          <div class="details-body" id="details-${tool.id}">
            <p>${tool.details}</p>
          </div>
        </div>
        ` : ""}
        <div class="card-footer">
          <span class="meta">${tool.setup}</span>
          <div style="display:flex; gap:8px;">
            <button class="share-btn" data-export="${tool.id}">${icon("share-01")} Share</button>
            <a class="link-btn" href="${tool.link}" target="_blank" rel="noopener">${icon("external-link")} Visit</a>
          </div>
        </div>
      </div>
    </article>
  `;
}

function lightboxHTML(tool) {
  return `
    <div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="${tool.name} screenshot preview">
      <button class="lightbox-close" id="lightbox-close" aria-label="Close screenshot">${icon("cancel-01", 18)}</button>
      <div class="lightbox-content">
        <img src="${tool.screenshot}" alt="${tool.name} screenshot" />
        <div class="lightbox-caption">
          <span class="lightbox-name">${tool.name}</span>
          <span class="lightbox-sub">screenshot preview</span>
        </div>
      </div>
    </div>
  `;
}

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
  const grid = document.getElementById("grid");
  const filterBar = document.getElementById("filters");
  const searchInput = document.getElementById("tool-search");
  const resultCount = document.getElementById("result-count");
  const emptyState = document.getElementById("empty-state");
  const emptyTitle = document.getElementById("empty-title");

  let tools;
  let categories;
  try {
    const [manifest, cats] = await Promise.all([
      loadJSON("data/manifest.json"),
      loadJSON("data/categories.json"),
    ]);
    categories = cats;
    tools = await Promise.all(
      manifest.tools.map(id => loadJSON(`data/tools/${id}.json`))
    );
  } catch (err) {
    showLoadError(grid, "tools");
    return;
  }

  window.SWAPFOSS_TOOLS = tools;
  window.SWAPFOSS_CATEGORIES = categories;

  grid.innerHTML = tools.map((t, i) => cardHTML(t, categories, i)).join("");
  grid.setAttribute("aria-busy", "false");

  const searchHay = new Map(
    tools.map(t => [t.id, `${t.name} ${t.insteadOf} ${t.hook} ${t.setup} ${t.details || ""} ${(t.features || []).join(" ")}`.toLowerCase()])
  );

  // Read shareable state from the URL (?category=media&q=spotify)
  const params = new URLSearchParams(location.search);
  const urlCategory = params.get("category");
  let activeFilter = urlCategory && categories[urlCategory] ? urlCategory : "all";
  let searchQuery = params.get("q") || "";
  searchInput.value = searchQuery;

  // Filter buttons
  const catsList = ["all", ...Object.keys(categories)];
  filterBar.innerHTML = catsList.map(c => {
    const label = c === "all" ? "All" : categories[c].label;
    const color = c === "all" ? "var(--text-muted)" : categories[c].color;
    return `<button class="filter-btn ${c === "all" ? "active" : ""}" data-filter="${c}" type="button" aria-pressed="${c === "all"}" style="--pill-color:${color}">${label}</button>`;
  }).join("");

  function syncFilterButtons() {
    filterBar.querySelectorAll(".filter-btn").forEach(b => {
      const isActive = b.dataset.filter === activeFilter;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-pressed", String(isActive));
    });
  }
  syncFilterButtons();

  function syncURL(mode) {
    const url = new URL(location.href);
    if (activeFilter === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", activeFilter);
    const q = searchQuery.trim();
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    if (url.search === location.search) return;
    if (mode === "push") history.pushState({}, "", url);
    else history.replaceState({}, "", url);
  }

  function applyFilters() {
    const q = searchQuery.trim().toLowerCase();
    let shown = 0;
    grid.querySelectorAll(".swap-card").forEach(card => {
      const matchCat = activeFilter === "all" || card.dataset.category === activeFilter;
      const matchQ = !q || (searchHay.get(card.dataset.id) || "").includes(q);
      const show = matchCat && matchQ;
      const wasShown = card.style.display !== "none";
      card.style.display = show ? "" : "none";
      if (show) {
        shown++;
        // Re-entry stagger only for cards that just became visible — cards
        // already on screen keep their entrance (no flicker while typing).
        if (!wasShown) {
          card.style.animation = "none";
          void card.offsetWidth;
          card.style.animation = "";
          card.style.animationDelay = `${(shown - 1) * 0.04}s`;
        }
      }
    });
    const total = tools.length;
    resultCount.textContent = shown === total ? `${total} tools` : `${shown} of ${total} tools`;
    const qDisplay = searchQuery.trim();
    if (shown === 0) {
      emptyTitle.textContent = qDisplay ? `No tools match “${qDisplay}”` : "No tools in this category yet";
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
    }
  }
  applyFilters();

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    syncFilterButtons();
    syncURL("push");
    applyFilters();
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    syncURL("replace");
    applyFilters();
  });

  document.getElementById("clear-filters").addEventListener("click", () => {
    searchQuery = "";
    searchInput.value = "";
    activeFilter = "all";
    syncFilterButtons();
    syncURL("replace");
    applyFilters();
    searchInput.focus();
  });

  window.addEventListener("popstate", () => {
    const p = new URLSearchParams(location.search);
    const cat = p.get("category");
    activeFilter = cat && categories[cat] ? cat : "all";
    searchQuery = p.get("q") || "";
    searchInput.value = searchQuery;
    syncFilterButtons();
    applyFilters();
  });

  // Screenshot click → lightbox
  grid.addEventListener("click", (e) => {
    const img = e.target.closest(".screenshot-img");
    if (!img) return;
    const card = img.closest(".swap-card");
    const toolId = card.querySelector("[data-export]")?.dataset.export;
    const tool = tools.find(t => t.id === toolId);
    if (!tool) return;
    const returnFocus = document.activeElement;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = lightboxHTML(tool);
    document.body.appendChild(wrapper.firstElementChild);
    const lb = document.getElementById("lightbox");
    const close = () => {
      lb.remove();
      document.removeEventListener("keydown", onKey);
      if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
    };
    const onKey = (ev) => {
      if (ev.key === "Escape") { close(); return; }
      if (ev.key !== "Tab") return;
      const els = [...lb.querySelectorAll("button, [href], input, select, textarea")]
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
    };
    lb.addEventListener("click", (ev) => {
      if (ev.target === lb || ev.target.id === "lightbox-close") close();
    });
    document.addEventListener("keydown", onKey);
    document.getElementById("lightbox-close").focus();
  });

  // Share buttons — render PNG + Web Share API (fallback: download)
  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-export]");
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = `${icon("share-01")} Sharing…`;
    try {
      const result = await shareCard(btn.dataset.export);
      if (result.reason === "cancelled") {
        btn.innerHTML = `${icon("share-01")} Share`;
      } else {
        btn.innerHTML = `${icon("tick-04")} Shared!`;
        setTimeout(() => { btn.innerHTML = `${icon("share-01")} Share`; }, 1500);
      }
    } catch (err) {
      btn.innerHTML = `${icon("share-01")} Share`;
    } finally {
      btn.disabled = false;
    }
  });

  // Setup steps expand/collapse
  grid.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-setup]");
    if (!toggle) return;
    const id = toggle.dataset.setup;
    const body = document.getElementById(`setup-${id}`);
    const isOpen = body.classList.contains("open");
    body.classList.toggle("open");
    toggle.innerHTML = isOpen ? `How to use ${icon("arrow-down-01")}` : `How to use ${icon("arrow-up-01")}`;
  });

  // Details expand/collapse
  grid.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-details]");
    if (!toggle) return;
    const id = toggle.dataset.details;
    const body = document.getElementById(`details-${id}`);
    const isOpen = body.classList.contains("open");
    body.classList.toggle("open");
    toggle.innerHTML = isOpen ? `Read more ${icon("arrow-down-01")}` : `Read less ${icon("arrow-up-01")}`;
  });

  // Caption copy
  const copyBtn = document.getElementById("copy-caption-btn");
  copyBtn.addEventListener("click", async () => {
    const text = document.getElementById("caption-text").textContent;
    await navigator.clipboard.writeText(text);
    copyBtn.innerHTML = `${icon("copy-01")} Copied!`;
    setTimeout(() => (copyBtn.innerHTML = `${icon("copy-01")} Copy caption`), 1500);
  });
}

document.addEventListener("DOMContentLoaded", init);
