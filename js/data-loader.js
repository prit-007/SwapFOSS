// Loads categories + tool data, renders the swap-card grid, wires up filters + caption copy.

async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

function cardHTML(tool, categories) {
  const cat = categories[tool.category] || {};
  const hasDetails = !!tool.details;
  const hasLogo = !!tool.logo;
  const hasScreenshot = !!tool.screenshot;
  return `
    <article class="swap-card" style="--cat-color:${cat.color}" data-category="${tool.category}">
      <div class="card-media ${hasScreenshot ? "" : "no-screenshot"}" data-fallback-text="${tool.name}">
        ${hasScreenshot ? `<img src="${tool.screenshot}" alt="${tool.name} screenshot" loading="lazy" />` : ""}
        ${hasLogo ? `<img class="logo-badge" src="${tool.logo}" alt="${tool.name} logo" />` : ""}
      </div>
      <div class="card-body">
        <span class="tag">${cat.label || tool.category}</span>
        <div class="swap-row">
          <span class="swap-from">${tool.insteadOf}</span>
          <span class="swap-arrow">→</span>
          <span class="swap-to">${tool.name}</span>
        </div>
        <p class="hook">${tool.hook}</p>
        <ul class="bullets">
          ${tool.bullets.map(b => `<li>${b}</li>`).join("")}
        </ul>
        ${hasDetails ? `
        <div class="details-expand">
          <button class="details-toggle" data-details="${tool.id}">Read more ↓</button>
          <div class="details-body" id="details-${tool.id}">
            <p>${tool.details}</p>
          </div>
        </div>
        ` : ""}
        <div class="card-footer">
          <span class="meta">${tool.setup}</span>
          <div style="display:flex; gap:8px;">
            <button class="export-btn" data-export="${tool.id}">Export card</button>
            <a class="link-btn" href="${tool.link}" target="_blank" rel="noopener">Visit ↗</a>
          </div>
        </div>
      </div>
    </article>
  `;
}

async function init() {
  const [manifest, categories] = await Promise.all([
    loadJSON("data/manifest.json"),
    loadJSON("data/categories.json"),
  ]);

  const tools = await Promise.all(
    manifest.tools.map(id => loadJSON(`data/tools/${id}.json`))
  );

  window.SWAPFOSS_TOOLS = tools;
  window.SWAPFOSS_CATEGORIES = categories;

  const grid = document.getElementById("grid");
  grid.innerHTML = tools.map(t => cardHTML(t, categories)).join("");

  // Filter buttons
  const filterBar = document.getElementById("filters");
  const cats = ["all", ...Object.keys(categories)];
  filterBar.innerHTML = cats.map(c => {
    const label = c === "all" ? "All" : categories[c].label;
    const style = c === "all"
      ? "border-color:var(--text-muted);"
      : `border-color:${categories[c].color};`;
    return `<button class="filter-btn ${c === "all" ? "active" : ""}" data-filter="${c}" style="${style}">${label}</button>`;
  }).join("");

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    filterBar.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const filter = btn.dataset.filter;
    grid.querySelectorAll(".swap-card").forEach(card => {
      card.style.display = (filter === "all" || card.dataset.category === filter) ? "" : "none";
    });
  });

  // Export buttons open card.html in a new tab pre-filled with the tool id
  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-export]");
    if (!btn) return;
    window.open(`card.html?tool=${btn.dataset.export}`, "_blank");
  });

  // Details expand/collapse
  grid.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-details]");
    if (!toggle) return;
    const id = toggle.dataset.details;
    const body = document.getElementById(`details-${id}`);
    const isOpen = body.classList.contains("open");
    body.classList.toggle("open");
    toggle.textContent = isOpen ? "Read more ↓" : "Read less ↑";
  });

  // Caption copy
  const copyBtn = document.getElementById("copy-caption-btn");
  copyBtn.addEventListener("click", async () => {
    const text = document.getElementById("caption-text").textContent;
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy caption"), 1500);
  });
}

document.addEventListener("DOMContentLoaded", init);
