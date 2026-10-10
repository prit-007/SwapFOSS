<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useCatalogStore } from "@/stores/catalog";
import { PRESETS } from "@/export/presets";
import { toolCardHTML } from "@/export/cards";
import { capturePng } from "@/export/capture";
import { downloadBlob } from "@/export/render";
import StageLoader from "@/components/common/StageLoader.vue";
import LoadError from "@/components/common/LoadError.vue";
import AppIcon from "@/components/common/AppIcon.vue";
import { usePreviewScale } from "@/composables/usePreviewScale";
import type { IconName } from "@/icons";

type StatusKey = "idle" | "rendering" | "saved" | "failed";
const STATUS: Record<StatusKey, { icon: IconName; label: string }> = {
  idle: { icon: "download-01", label: "Download PNG" },
  rendering: { icon: "refresh-01", label: "Rendering…" },
  saved: { icon: "tick-04", label: "Saved" },
  failed: { icon: "cancel-01", label: "Failed — retry" },
};

const route = useRoute();
const catalog = useCatalogStore();

const { stage, frameStyle, stageStyle } = usePreviewScale();
const busy = ref(false);
const statusKey = ref<StatusKey>("idle");
const status = computed(() => STATUS[statusKey.value]);

const toolId = computed(() => (route.query.tool as string) || "");
const tool = computed(() => catalog.tools.find((t) => t.id === toolId.value) || null);
const cat = computed(() =>
  tool.value
    ? catalog.categories[tool.value.category] || { label: tool.value.category, color: "#888" }
    : null,
);
const html = computed(() =>
  tool.value && cat.value ? toolCardHTML(tool.value, cat.value, PRESETS.linkedin, false) : "",
);

onMounted(() => {
  if (!catalog.tools.length) catalog.load();
});
watch(
  () => route.query.tool,
  () => {
    if (!catalog.tools.length) catalog.load();
  },
);

async function download() {
  const node = stage.value?.querySelector(".export-card") as HTMLElement | null;
  if (!node || !tool.value) return;
  busy.value = true;
  statusKey.value = "rendering";
  try {
    const blob = await capturePng(node, 2);
    downloadBlob(blob, `swapfoss-${tool.value.id}.png`);
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
  <div id="toolbar">
    <RouterLink id="toolbar-back" to="/"><AppIcon name="arrow-left-01" /> Home</RouterLink>
    <button id="download-btn" :disabled="busy || !html" @click="download">
      <AppIcon :name="status.icon" /> {{ status.label }}
    </button>
    <span class="hint">1080×1350 — ready for LinkedIn or Instagram</span>
  </div>
  <div id="stage" ref="stage" tabindex="-1" :style="stageStyle()">
    <LoadError v-if="catalog.error" what="card" @retry="catalog.load()" />
    <StageLoader v-else-if="!html" text="Loading card…" />
    <div v-else class="stage-frame" :style="frameStyle()" v-html="html"></div>
  </div>
</template>

<style>
body:has(#stage) {
  padding: 32px;
}
#toolbar {
  margin-bottom: 24px;
  display: flex;
  gap: 12px;
  align-items: center;
}
#toolbar-back {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 14px;
  color: var(--text-muted);
  text-decoration: none;
  padding: 10px 6px;
}
#toolbar-back:hover {
  color: var(--text);
}
#download-btn {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 14px;
  background: var(--text);
  color: var(--bg);
  border: none;
  padding: 10px 18px;
  border-radius: 8px;
  cursor: pointer;
}
.hint {
  color: var(--text-faint);
  font-size: 13px;
}
</style>
