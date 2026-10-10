<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCatalogStore } from "@/stores/catalog";
import { useShareCard } from "@/composables/useShareCard";
import SwapCard from "@/components/browse/SwapCard.vue";
import SkeletonGrid from "@/components/browse/SkeletonGrid.vue";
import Lightbox from "@/components/browse/Lightbox.vue";
import ShareMenu from "@/components/browse/ShareMenu.vue";
import LoadError from "@/components/common/LoadError.vue";
import type { Tool } from "@/types";

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();
const {
  open: shareOpen,
  toolId: shareToolId,
  dataUrl: shareDataUrl,
  share: doShare,
  close: closeShare,
} = useShareCard();

const category = ref((route.query.category as string) || "all");
const q = ref((route.query.q as string) || "");
const previewTool = ref<Tool | null>(null);
const captionCopied = ref(false);

const captionText =
  "I built a visual directory for FOSS tools that normal people can actually use. What tool should I add next?";

const filterIds = computed(() => ["all", ...catalog.categoryIds]);
const shown = computed(() => catalog.query({ category: category.value, q: q.value }));
const total = computed(() => catalog.tools.length);
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
});

watch(
  () => route.query,
  (query) => {
    const cat = query.category as string | undefined;
    category.value = cat && catalog.categories[cat] ? cat : "all";
    q.value = (query.q as string) || "";
  },
);

function syncURL(mode: "push" | "replace") {
  const query: Record<string, string> = {};
  if (category.value !== "all") query.category = category.value;
  if (q.value.trim()) query.q = q.value.trim();
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

function clearAll() {
  category.value = "all";
  q.value = "";
  syncURL("replace");
  const input = document.getElementById("tool-search") as HTMLInputElement | null;
  input?.focus();
}

async function onShare(id: string) {
  const tool = catalog.tools.find((t) => t.id === id);
  if (!tool) return;
  await doShare(tool, catalog.categories[tool.category] || { label: tool.category, color: "#888" });
}

async function copyCaption() {
  await navigator.clipboard.writeText(captionText);
  captionCopied.value = true;
  setTimeout(() => (captionCopied.value = false), 1500);
}
</script>

<template>
  <section class="hero">
    <div class="wrap">
      <h1>Free, open-source swaps for the apps you already use</h1>
      <p>
        No subscriptions. No one watching what you watch, hear, or send. Same jobs
        done, none of the strings attached — one tool at a time.
      </p>
    </div>
  </section>

  <main class="wrap" id="main" tabindex="-1">
    <div class="index-toolbar">
      <div class="search-box">
        <svg
          class="search-icon"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
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
      </div>
      <span class="result-count" role="status" aria-live="polite">{{ resultLabel }}</span>
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
      </button>
    </div>

    <LoadError v-if="catalog.error" what="tools" @retry="catalog.load()" />
    <SkeletonGrid v-else-if="catalog.loading && !catalog.tools.length" />
    <div v-else class="grid" :aria-busy="false">
      <SwapCard
        v-for="(tool, i) in shown"
        :key="tool.id"
        :tool="tool"
        :cat="catalog.categories[tool.category] || { label: tool.category, color: '#888' }"
        :index="i"
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
        @click="clearAll"
      >
        Clear search &amp; filters
      </button>
    </div>

    <div class="caption-box">
      <span class="caption-label">Suggested post caption</span>
      <p>{{ captionText }}</p>
      <button @click="copyCaption">{{ captionCopied ? "Copied!" : "Copy caption" }}</button>
    </div>
  </main>

  <section class="dev-credits">
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

  <footer class="site-footer">
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
