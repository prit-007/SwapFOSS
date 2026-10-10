<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import type { Tool } from "@/types";

const props = defineProps<{ tool: Tool }>();
const emit = defineEmits<{ close: [] }>();
const closeBtn = ref<HTMLButtonElement | null>(null);

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
}
onMounted(() => {
  document.addEventListener("keydown", onKey);
  closeBtn.value?.focus();
});
onBeforeUnmount(() => document.removeEventListener("keydown", onKey));
</script>

<template>
  <div
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
      ✕
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
