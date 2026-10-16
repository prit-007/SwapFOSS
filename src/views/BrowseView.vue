<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { SORT_OPTIONS, isSortKey, useCatalogStore, type SortKey } from "@/stores/catalog";
import { useShareCard } from "@/composables/useShareCard";
import { useToast } from "@/composables/useToast";
import SwapCard from "@/components/browse/SwapCard.vue";
import SkeletonGrid from "@/components/browse/SkeletonGrid.vue";
import Lightbox from "@/components/browse/Lightbox.vue";
import ShareMenu from "@/components/browse/ShareMenu.vue";
import LoadError from "@/components/common/LoadError.vue";
import AppIcon from "@/components/common/AppIcon.vue";
import { formatStars } from "@/utils/formatStars";
import type { Tool } from "@/types";

type ViewMode = "grid" | "list";

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();
const toast = useToast();
const {
  open: shareOpen,
  toolId: shareToolId,
  dataUrl: shareDataUrl,
  share: doShare,
  close: closeShare,
} = useShareCard();

const category = ref((route.query.category as string) || "all");
const q = ref((route.query.q as string) || "");
const sort = ref<SortKey>(isSortKey(route.query.sort) ? route.query.sort : "featured");
const view = ref<ViewMode>(route.query.view === "list" ? "list" : "grid");
const previewTool = ref<Tool | null>(null);
const captionCopied = ref(false);
const batchSize = 24;
const visibleCount = ref(batchSize);
const sentinel = ref<HTMLElement | null>(null);
const isLoadingMore = ref(false);
let observer: IntersectionObserver | null = null;

const captionText =
  "I built a visual directory for FOSS tools that normal people can actually use. What tool should I add next?";

const filterIds = computed(() => ["all", ...catalog.categoryIds]);
const allShown = computed(() =>
  catalog.query({ category: category.value, q: q.value, sort: sort.value }),
);
const shown = computed(() => allShown.value.slice(0, visibleCount.value));
const hasMore = computed(() => visibleCount.value < allShown.value.length);
const total = computed(() => catalog.tools.length);
const totalStarsLabel = computed(() => formatStars(catalog.totalStars));
const resultLabel = computed(() =>
  shown.value.length === total.value
    ? `${total.value} tools`
    : `${shown.value.length} of ${total.value} tools`,
);
const emptyTitle = computed(() => {
  const query = q.value.trim();
  return query ? `No tools match “${query}”` : "No tools in this category yet";
});

onMounted(() => {
  if (!catalog.tools.length) catalog.load();
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("scroll", onWindowScroll, { passive: true });
  setupObserver();
});
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("scroll", onWindowScroll);
  observer?.disconnect();
});

watch(
  () => route.query,
  (query) => {
    const cat = query.category as string | undefined;
    category.value = cat && catalog.categories[cat] ? cat : "all";
    q.value = (query.q as string) || "";
    sort.value = isSortKey(query.sort) ? query.sort : "featured";
    view.value = query.view === "list" ? "list" : "grid";
    visibleCount.value = batchSize;
  },
);

watch(
  () => [category.value, q.value, sort.value],
  () => {
    visibleCount.value = batchSize;
    nextTick(() => {
      checkViewportFill();
    });
  },
);

function syncURL(mode: "push" | "replace") {
  const query: Record<string, string> = {};
  if (category.value !== "all") query.category = category.value;
  if (q.value.trim()) query.q = q.value.trim();
  if (sort.value !== "featured") query.sort = sort.value;
  if (view.value !== "grid") query.view = view.value;
  router[mode]({ query });
}

function selectCategory(id: string) {
  category.value = id;
  syncURL("push");
}

function onSearchInput(e: Event) {
  q.value = (e.target as HTMLInputElement).value;
  syncURL("replace");
}

function clearSearch() {
  q.value = "";
  syncURL("replace");
  const input = document.getElementById("tool-search") as HTMLInputElement | null;
  input?.focus();
}

function onSortChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value;
  sort.value = isSortKey(value) ? value : "featured";
  syncURL("replace");
}

function setView(next: ViewMode) {
  view.value = next;
  syncURL("replace");
}

function clearAll(focus = true) {
  category.value = "all";
  q.value = "";
  syncURL("replace");
  if (focus) {
    const input = document.getElementById("tool-search") as HTMLInputElement | null;
    input?.focus();
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function onKeydown(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  const typing =
    !!el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable);

  if (e.key === "/" && !typing) {
    e.preventDefault();
    (document.getElementById("tool-search") as HTMLInputElement | null)?.focus();
    return;
  }
  if (e.key === "Escape") {
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (q.value || category.value !== "all") clearAll(false);
  }
}

async function onShare(id: string) {
  const tool = catalog.tools.find((t) => t.id === id);
  if (!tool) return;
  await doShare(tool, catalog.categories[tool.category] || { label: tool.category, color: "#888" });
}

async function copyCaption() {
  try {
    await navigator.clipboard.writeText(captionText);
    captionCopied.value = true;
    toast.show("Caption copied to clipboard", { icon: "copy-01" });
    setTimeout(() => (captionCopied.value = false), 1500);
  } catch {
    toast.show("Couldn't copy — clipboard blocked", { tone: "error" });
  }
}

function loadMore() {
  if (!hasMore.value || isLoadingMore.value) return;
  isLoadingMore.value = true;
  visibleCount.value = Math.min(allShown.value.length, visibleCount.value + batchSize);
  nextTick(() => {
    isLoadingMore.value = false;
    checkViewportFill();
  });
}

function checkViewportFill() {
  if (hasMore.value && sentinel.value) {
    const rect = sentinel.value.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 250) {
      loadMore();
    }
  }
}

function onWindowScroll() {
  if (hasMore.value && sentinel.value && !isLoadingMore.value) {
    const rect = sentinel.value.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 400) {
      loadMore();
    }
  }
}

function setupObserver() {
  observer?.disconnect();
  if (typeof IntersectionObserver !== "function") return;
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting) && hasMore.value) {
        loadMore();
      }
    },
    { rootMargin: "400px", threshold: 0 },
  );
  if (sentinel.value) observer.observe(sentinel.value);
}

watch(
  sentinel,
  (el) => {
    observer?.disconnect();
    if (el && observer) {
      observer.observe(el);
      checkViewportFill();
    }
  },
  { flush: "post", immediate: true },
);
</script>

<template>
  <section class="hero">
    <div class="wrap">
      <h1>Free, open-source swaps for the apps you already use</h1>
      <p>
        No subscriptions. No one watching what you watch, hear, or send. Same jobs
        done, none of the strings attached — one tool at a time.
      </p>
      <div v-if="!catalog.loading && !catalog.error" class="hero-stats">
        <span class="hero-stat">
          <AppIcon name="grid-view" :size="15" /> {{ total }} open-source tools
        </span>
        <span class="hero-stat">
          <AppIcon name="list-view" :size="15" /> {{ filterIds.length - 1 }} categories
        </span>
        <span class="hero-stat">
          <AppIcon name="star" :size="15" /> {{ totalStarsLabel }} GitHub stars
        </span>
      </div>
    </div>
  </section>

  <main class="wrap" id="main" tabindex="-1">
    <div class="index-toolbar">
      <div class="search-box">
        <AppIcon class="search-icon" name="search-01" :size="15" />
        <input
          id="tool-search"
          type="search"
          class="search-input"
          placeholder="Search tools…"
          aria-label="Search tools"
          autocomplete="off"
          :value="q"
          @input="onSearchInput"
        />
        <button
          v-if="q"
          type="button"
          class="search-clear-btn"
          aria-label="Clear search"
          title="Clear search"
          @click="clearSearch"
        >
          <AppIcon name="cancel-01" :size="13" />
        </button>
        <kbd v-else class="search-hint" aria-hidden="true">/</kbd>
      </div>
      <div class="toolbar-controls">
        <div class="sort-control">
          <label class="sr-only" for="tool-sort">Sort tools</label>
          <select id="tool-sort" class="sort-select" :value="sort" @change="onSortChange">
            <option v-for="opt in SORT_OPTIONS" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </option>
          </select>
          <AppIcon class="sort-chevron" name="arrow-down-01" :size="14" />
        </div>
        <div class="view-toggle" role="group" aria-label="View mode">
          <button
            class="view-btn"
            :class="{ active: view === 'grid' }"
            type="button"
            aria-label="Grid view"
            :aria-pressed="view === 'grid'"
            @click="setView('grid')"
          >
            <AppIcon name="grid-view" :size="16" />
          </button>
          <button
            class="view-btn"
            :class="{ active: view === 'list' }"
            type="button"
            aria-label="List view"
            :aria-pressed="view === 'list'"
            @click="setView('list')"
          >
            <AppIcon name="list-view" :size="16" />
          </button>
        </div>
        <span class="result-count" role="status" aria-live="polite">{{ resultLabel }}</span>
      </div>
    </div>

    <div class="filters">
      <button
        v-for="id in filterIds"
        :key="id"
        class="filter-btn"
        :class="{ active: id === category }"
        type="button"
        :aria-pressed="id === category"
        :style="{
          '--pill-color':
            id === 'all' ? 'var(--text-muted)' : catalog.categories[id]?.color,
        }"
        @click="selectCategory(id)"
      >
        {{ id === "all" ? "All" : catalog.categories[id]?.label }}
        <span class="filter-count">{{ catalog.countFor(id) }}</span>
      </button>
    </div>

    <LoadError v-if="catalog.error" what="tools" @retry="catalog.load()" />
    <SkeletonGrid v-else-if="catalog.loading && !catalog.tools.length" />
    <div v-else class="grid" :class="{ list: view === 'list' }" :aria-busy="false">
      <SwapCard
        v-for="(tool, i) in shown"
        :key="tool.id"
        :tool="tool"
        :cat="catalog.categories[tool.category] || { label: tool.category, color: '#888' }"
        :index="i"
        :variant="view"
        @share="onShare"
        @preview="previewTool = $event"
      />
    </div>

    <div v-if="!catalog.loading && !catalog.error && shown.length === 0" class="empty-state">
      <p class="empty-state-title">{{ emptyTitle }}</p>
      <p class="empty-state-sub">Try a different search, or start over.</p>
      <button
        class="filter-btn"
        type="button"
        style="--pill-color: var(--text-muted)"
        @click="clearAll()"
      >
        <AppIcon name="refresh-01" /> Clear search &amp; filters
      </button>
    </div>

    <div
      v-if="!catalog.loading && !catalog.error && hasMore"
      ref="sentinel"
      class="infinite-sentinel"
      aria-hidden="true"
    ></div>

    <div
      v-if="!catalog.loading && !catalog.error && hasMore"
      class="load-more-indicator"
      aria-live="polite"
      :aria-busy="isLoadingMore"
    >
      <div v-if="isLoadingMore" class="load-more-loading">
        <span class="load-more-spinner" aria-hidden="true"></span>
        <span>Loading more tools…</span>
      </div>
      <button
        v-else
        type="button"
        class="load-more-btn"
        aria-label="Load more tools"
        @click="loadMore"
      >
        <AppIcon name="arrow-down-01" :size="14" />
        Load more tools ({{ allShown.length - shown.length }} remaining)
      </button>
    </div>

    <div
      v-else-if="!catalog.loading && !catalog.error && shown.length > 0 && !hasMore"
      class="load-more-end"
    >
      <span class="load-more-end-text">You've explored all {{ shown.length }} tools</span>
      <button type="button" class="load-more-top-btn" @click="scrollToTop">
        <AppIcon name="arrow-up-01" :size="13" /> Back to top
      </button>
    </div>

    <div v-reveal class="caption-box">
      <span class="caption-label">Suggested post caption</span>
      <p>{{ captionText }}</p>
      <button id="copy-caption-btn" @click="copyCaption">
        <AppIcon name="copy-01" /> {{ captionCopied ? "Copied!" : "Copy caption" }}
      </button>
    </div>
  </main>

  <section v-reveal class="dev-credits">
    <div class="wrap">
      <div class="dev-credits-label">Developer's Paradise</div>
      <p class="dev-credits-tagline">Where bugs fear to tread and coffee never runs out</p>
      <ul class="dev-credits-list">
        <li
          v-for="(dev, i) in [
            { initials: 'PV', name: 'Prit Vasani', role: 'Builder', color: '#FF5A5F', href: 'https://www.linkedin.com/in/prit-vasani007', label: 'Prit Vasani on LinkedIn' },
            { initials: 'N', name: 'Nilay', role: 'AI/ML', color: '#4EA8DE', href: 'https://github.com/NILAY1556', label: 'Nilay on GitHub' },
            { initials: 'RA', name: 'Rajvi Adesara', role: 'UX', color: '#FFC857', href: 'https://github.com/RajviAdesara', label: 'Rajvi Adesara on GitHub' },
            { initials: 'V', name: 'Vivek Khunt', role: 'Game Dev', color: '#6BCB77', href: 'https://github.com/VivekKhunt', label: 'Vivek Khunt on GitHub' },
            { initials: 'B', name: 'Bhargav', role: 'Animation', color: '#B983FF', href: 'https://github.com/Bhargav-1001', label: 'Bhargav on GitHub' },
            { initials: 'M', name: 'Meet', role: 'UI', color: '#2DD4BF', href: 'https://github.com/meet2904', label: 'Meet on GitHub' },
          ]"
          :key="dev.name"
          class="dev-credit"
          :style="{ '--avatar-color': dev.color, '--card-index': i }"
        >
          <a :href="dev.href" target="_blank" rel="noopener" class="dev-avatar-link" :aria-label="dev.label">
            <span class="dev-avatar">{{ dev.initials }}</span>
          </a>
          <span class="dev-name">{{ dev.name }}</span>
          <span class="dev-role">{{ dev.role }}</span>
        </li>
      </ul>
    </div>
  </section>

  <footer v-reveal class="site-footer">
    <div class="wrap">
      <div class="footer-row">
        <span>
          Spot a great FOSS tool that belongs here?
          <a href="https://github.com/prit-007/SwapFOSS" target="_blank" rel="noopener">Open a PR</a>.
        </span>
        <span class="footer-divider">·</span>
        <span>
          Built by
          <a href="https://www.linkedin.com/in/prit-vasani007" target="_blank" rel="noopener">Prit Vasani</a>
          &amp; the Developer's Paradise crew
        </span>
      </div>
    </div>
  </footer>

  <Lightbox v-if="previewTool" :tool="previewTool" @close="previewTool = null" />
  <ShareMenu
    v-if="shareOpen && shareToolId"
    :tool="catalog.tools.find((t) => t.id === shareToolId)!"
    :data-url="shareDataUrl"
    @close="closeShare"
  />
</template>
