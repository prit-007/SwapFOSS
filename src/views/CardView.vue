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

const route = useRoute();
const catalog = useCatalogStore();

const stage = ref<HTMLElement | null>(null);
const busy = ref(false);
const status = ref("Download PNG");

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
  status.value = "Rendering…";
  try {
    const blob = await capturePng(node, 2);
    downloadBlob(blob, `swapfoss-${tool.value.id}.png`);
    status.value = "Saved ✓";
  } catch {
    status.value = "Failed — retry";
  } finally {
    busy.value = false;
    setTimeout(() => (status.value = "Download PNG"), 1600);
  }
}
</script>

<template>
  <div id="toolbar">
    <RouterLink id="toolbar-back" to="/">← Home</RouterLink>
    <button id="download-btn" :disabled="busy || !html" @click="download">{{ status }}</button>
    <span class="hint">1080×1350 — ready for LinkedIn or Instagram</span>
  </div>
  <div id="stage" ref="stage" tabindex="-1">
    <LoadError v-if="catalog.error" what="card" @retry="catalog.load()" />
    <StageLoader v-else-if="!html" text="Loading card…" />
    <div v-else v-html="html"></div>
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
