<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import AppIcon from "@/components/common/AppIcon.vue";
import { trapTabKeydown } from "@/utils/focus";
import type { Tool } from "@/types";

const props = defineProps<{ tool: Tool }>();
const emit = defineEmits<{ close: [] }>();
const closeBtn = ref<HTMLButtonElement | null>(null);
const dialogEl = ref<HTMLDivElement | null>(null);
let lastFocus: HTMLElement | null = null;

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
  else if (dialogEl.value) trapTabKeydown(e, dialogEl.value);
}
onMounted(() => {
  document.addEventListener("keydown", onKey);
  lastFocus = document.activeElement as HTMLElement | null;
  closeBtn.value?.focus();
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  lastFocus?.focus?.();
});
</script>

<template>
  <div
    ref="dialogEl"
    class="lightbox"
    role="dialog"
    aria-modal="true"
    :aria-label="`${tool.name} screenshot preview`"
    @click.self="emit('close')"
  >
    <button
      ref="closeBtn"
      class="lightbox-close"
      aria-label="Close screenshot"
      @click="emit('close')"
    >
      <AppIcon name="cancel-01" :size="18" />
    </button>
    <div class="lightbox-content">
      <img :src="tool.screenshot" :alt="`${tool.name} screenshot`" />
      <div class="lightbox-caption">
        <span class="lightbox-name">{{ tool.name }}</span>
        <span class="lightbox-sub">screenshot preview</span>
      </div>
    </div>
  </div>
</template>
