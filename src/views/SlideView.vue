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
    <RouterLink id="slide-back" to="/"><AppIcon name="arrow-left-01" /> Home</RouterLink>
    <button :disabled="!prev" @click="prev && go(prev)">
      <AppIcon name="arrow-left-01" /> Prev
    </button>
    <button :disabled="!next" @click="next && go(next)">
      Next <AppIcon name="arrow-right-01" />
    </button>
    <button id="slide-download" :disabled="busy || !html" @click="download">
      <AppIcon :name="status.icon" /> {{ status.label }}
    </button>
    <span>1080×1350 — ready for posting</span>
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
}
#slide-toolbar {
  position: fixed;
  top: 24px;
  left: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
#slide-toolbar button,
#slide-back {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 14px;
  padding: 9px 16px;
  border-radius: 8px;
}
#slide-back {
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  padding: 10px 6px;
}
#slide-toolbar button {
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
}
#slide-toolbar button:disabled {
  opacity: 0.35;
  cursor: default;
}
#slide-download {
  background: #f5f3ed !important;
  color: #0f1115 !important;
  border: none !important;
  padding: 10px 18px !important;
}
#slide-toolbar > span {
  color: rgba(255, 255, 255, 0.35);
  font-size: 13px;
}
</style>
