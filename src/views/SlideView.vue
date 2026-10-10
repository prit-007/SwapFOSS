<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import { useCatalogStore } from "@/stores/catalog";
import { loadPost } from "@/data/catalog";
import { PRESETS } from "@/export/presets";
import { introCardHTML, outroCardHTML, toolCardHTML } from "@/export/cards";
import {
  DEEP_PARTS,
  buildSlides,
  deepCardHTML,
  isDeepDive,
  type DeepPart,
  type PostSlide,
} from "@/export/deep-cards";
import { capturePng } from "@/export/capture";
import { downloadBlob } from "@/export/render";
import StageLoader from "@/components/common/StageLoader.vue";
import LoadError from "@/components/common/LoadError.vue";
import AppIcon from "@/components/common/AppIcon.vue";
import type { IconName } from "@/icons";
import type { Post, Tool } from "@/types";

type StatusKey = "idle" | "rendering" | "saved" | "failed";
const STATUS: Record<StatusKey, { icon: IconName; label: string }> = {
  idle: { icon: "download-01", label: "Download PNG" },
  rendering: { icon: "refresh-01", label: "Rendering…" },
  saved: { icon: "tick-04", label: "Saved" },
  failed: { icon: "cancel-01", label: "Failed — retry" },
};

const route = useRoute();
const router = useRouter();
const catalog = useCatalogStore();

const stage = ref<HTMLElement | null>(null);
const post = ref<Post | null>(null);
const error = ref(false);
const busy = ref(false);
const statusKey = ref<StatusKey>("idle");
const status = computed(() => STATUS[statusKey.value]);

const postId = computed(() => (route.query.post as string) || "");
const type = computed(() => (route.query.type as string) || "intro");
const toolId = computed(() => (route.query.tool as string) || "");
const part = computed<DeepPart>(() => {
  const p = route.query.part as string;
  return (DEEP_PARTS as readonly string[]).includes(p) ? (p as DeepPart) : "hero";
});

const tool = computed(() => catalog.tools.find((t) => t.id === toolId.value) || null);
const cat = computed(() =>
  tool.value
    ? catalog.categories[tool.value.category] || { label: tool.value.category, color: "#888" }
    : null,
);
const postTools = computed<Tool[]>(() => {
  if (!post.value) return [];
  return post.value.tools
    .map((id) => catalog.tools.find((t) => t.id === id))
    .filter((t): t is Tool => !!t);
});

/** The single app a deep-dive post is built around. */
const deepTool = computed<Tool | null>(() => {
  if (!post.value || !isDeepDive(post.value)) return null;
  const id = post.value.tools[0];
  return catalog.tools.find((t) => t.id === id) || null;
});
const deepCat = computed(() => {
  const t = deepTool.value;
  return t ? catalog.categories[t.category] || { label: t.category, color: "#888" } : null;
});
const slides = computed<PostSlide[]>(() => (post.value ? buildSlides(post.value) : []));

const html = computed(() => {
  if (!post.value) return "";
  const preset = PRESETS.linkedin;
  const total = slides.value.length;
  if (type.value === "intro") return introCardHTML(post.value, preset, false, total, postTools.value);
  if (type.value === "outro") return outroCardHTML(post.value, preset, false, total);
  if (type.value === "deep") {
    const index = slides.value.findIndex((s) => s.type === "deep" && s.part === part.value) + 1;
    return deepTool.value && deepCat.value
      ? deepCardHTML(part.value, deepTool.value, deepCat.value, { index, total, preset })
      : "";
  }
  return tool.value && cat.value ? toolCardHTML(tool.value, cat.value, preset, false) : "";
});

function isCurrent(s: PostSlide) {
  if (type.value === "intro") return s.type === "intro";
  if (type.value === "outro") return s.type === "outro";
  if (type.value === "deep") return s.type === "deep" && s.part === part.value;
  return s.type === "tool" && s.tool === toolId.value;
}
const idx = computed(() => slides.value.findIndex(isCurrent));
const prev = computed(() => (idx.value > 0 ? slides.value[idx.value - 1] : null));
const next = computed(() =>
  idx.value >= 0 && idx.value < slides.value.length - 1 ? slides.value[idx.value + 1] : null,
);

function slideQuery(s: PostSlide) {
  const query: Record<string, string> = { post: postId.value, type: s.type };
  if (s.type === "tool") query.tool = s.tool;
  if (s.type === "deep") query.part = s.part;
  return query;
}
function go(s: PostSlide) {
  router.push({ name: "slide", query: slideQuery(s) });
}

function onKey(e: KeyboardEvent) {
  const el = e.target as HTMLElement;
  if (el?.matches?.("input, textarea, select")) return;
  if (e.key === "ArrowRight" && next.value) go(next.value);
  else if (e.key === "ArrowLeft" && prev.value) go(prev.value);
}

async function load() {
  error.value = false;
  try {
    if (!catalog.tools.length) await catalog.load();
    if (catalog.error) throw new Error(catalog.error);
    post.value = await loadPost(postId.value);
  } catch {
    error.value = true;
  }
}

onMounted(() => {
  load();
  window.addEventListener("keydown", onKey);
});
onBeforeUnmount(() => window.removeEventListener("keydown", onKey));
watch(() => route.query, load);

async function download() {
  const node = stage.value?.querySelector(".export-card") as HTMLElement | null;
  if (!node || !post.value) return;
  busy.value = true;
  statusKey.value = "rendering";
  try {
    const blob = await capturePng(node, 2);
    const suffix = type.value === "deep" ? `deep-${part.value}` : type.value;
    downloadBlob(blob, `swapfoss-${postId.value}-${suffix}.png`);
    statusKey.value = "saved";
  } catch {
    statusKey.value = "failed";
  } finally {
    busy.value = false;
    setTimeout(() => (statusKey.value = "idle"), 1600);
  }
}
</script>

<template>
  <a class="skip-link" href="#stage">Skip to content</a>
  <div id="slide-toolbar">
    <RouterLink id="slide-back" to="/">
      <AppIcon name="arrow-left-01" /> <span class="slide-tb-label">Home</span>
    </RouterLink>
    <div class="slide-tb-nav">
      <button
        class="slide-nav-btn"
        :disabled="!prev"
        aria-label="Previous slide"
        @click="prev && go(prev)"
      >
        <AppIcon name="arrow-left-01" /> <span class="slide-tb-label">Prev</span>
      </button>
      <div class="slide-dots">
        <button
          v-for="(s, i) in slides"
          :key="i"
          class="slide-dot"
          :class="{ active: isCurrent(s) }"
          :aria-label="`Go to slide ${i + 1}`"
          :aria-current="isCurrent(s) ? 'true' : undefined"
          @click="go(s)"
        ></button>
      </div>
      <button
        class="slide-nav-btn"
        :disabled="!next"
        aria-label="Next slide"
        @click="next && go(next)"
      >
        <span class="slide-tb-label">Next</span> <AppIcon name="arrow-right-01" />
      </button>
    </div>
    <div class="slide-tb-right">
      <span class="slide-counter">{{ idx >= 0 ? idx + 1 : 1 }} / {{ slides.length }}</span>
      <button id="slide-download" :disabled="busy || !html" @click="download">
        <AppIcon :name="status.icon" /> {{ status.label }}
      </button>
    </div>
  </div>
  <div id="stage" ref="stage" tabindex="-1">
    <LoadError v-if="error" what="slide" @retry="load" />
    <StageLoader v-else-if="!html" text="Loading slide…" />
    <div v-else v-html="html"></div>
  </div>
</template>

<style>
body:has(#slide-toolbar) {
  margin: 0;
  background: var(--bg);
  padding: 96px 16px 40px;
}
#slide-toolbar {
  position: fixed;
  top: 16px;
  left: 16px;
  right: 16px;
  margin: 0 auto;
  max-width: 1120px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 16px;
  background: rgba(15, 17, 21, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
#slide-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  padding: 8px 12px;
  border-radius: 10px;
  transition: color 0.2s var(--ease-glide), background 0.2s var(--ease-glide);
}
#slide-back:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}
.slide-tb-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}
#slide-toolbar button {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}
.slide-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: transparent;
  color: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.16);
  transition: background 0.2s var(--ease-glide), color 0.2s var(--ease-glide),
    border-color 0.2s var(--ease-glide);
}
.slide-nav-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}
.slide-nav-btn:disabled {
  opacity: 0.32;
  cursor: default;
}
.slide-dots {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 4px;
}
.slide-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.22);
  transition: width 0.25s var(--ease-snap), background 0.25s var(--ease-glide);
}
.slide-dot:hover {
  background: rgba(255, 255, 255, 0.45);
}
.slide-dot.active {
  width: 22px;
  background: #f5f3ed;
}
.slide-tb-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.slide-counter {
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.45);
  font-variant-numeric: tabular-nums;
}
#slide-download {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f5f3ed;
  color: #0f1115;
  border: none;
  padding: 9px 16px;
  border-radius: 10px;
  transition: transform 0.2s var(--ease-snap), box-shadow 0.2s var(--ease-glide);
}
#slide-download:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}
#slide-download:disabled {
  opacity: 0.5;
  cursor: default;
}
@media (max-width: 720px) {
  .slide-tb-label,
  .slide-dots {
    display: none;
  }
}
</style>
