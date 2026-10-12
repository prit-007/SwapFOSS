<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import AppIcon from "@/components/common/AppIcon.vue";
import { trapTabKeydown } from "@/utils/focus";
import type { Tool } from "@/types";

const props = defineProps<{ tool: Tool; dataUrl: string }>();
const emit = defineEmits<{ close: [] }>();

const copied = ref(false);
const closeBtn = ref<HTMLButtonElement | null>(null);
const overlay = ref<HTMLDivElement | null>(null);
let lastFocus: HTMLElement | null = null;

function shareUrl() {
  return `${location.origin}${location.pathname}card?tool=${encodeURIComponent(props.tool.id)}`;
}
function shareText() {
  return `Check out ${props.tool.name} — a free, open-source alternative to ${props.tool.insteadOf}`;
}

async function act(platform: string) {
  const url = shareUrl();
  const text = shareText();
  if (platform === "whatsapp") {
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, "_blank");
  } else if (platform === "twitter") {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      "_blank",
    );
  } else if (platform === "linkedin") {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      "_blank",
    );
  } else if (platform === "email") {
    window.open(
      `mailto:?subject=${encodeURIComponent(`FOSS Swap: ${props.tool.name}`)}&body=${encodeURIComponent(text + "\n\n" + url)}`,
      "_blank",
    );
  } else if (platform === "copy") {
    await navigator.clipboard.writeText(text + "\n" + url);
    copied.value = true;
    setTimeout(() => emit("close"), 1000);
    return;
  } else if (platform === "download") {
    const a = document.createElement("a");
    a.href = props.dataUrl;
    a.download = `swapfoss-${props.tool.id}.png`;
    a.click();
  }
  emit("close");
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") emit("close");
  else if (overlay.value) trapTabKeydown(e, overlay.value);
}
onMounted(async () => {
  document.addEventListener("keydown", onKey);
  lastFocus = document.activeElement as HTMLElement | null;
  await nextTick();
  closeBtn.value?.focus();
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  lastFocus?.focus?.();
});
</script>

<template>
  <div
    ref="overlay"
    class="share-overlay"
    role="dialog"
    aria-modal="true"
    aria-label="Share card"
    @click.self="emit('close')"
  >
    <div class="share-menu">
      <div class="share-menu-header">
        <span class="share-menu-title">Share card</span>
        <button ref="closeBtn" class="share-menu-close" aria-label="Close" @click="emit('close')">
          <AppIcon name="cancel-01" :size="15" />
        </button>
      </div>
      <div class="share-menu-body">
        <div class="share-menu-preview">
          <img :src="dataUrl" alt="Card preview" />
        </div>
        <div class="share-menu-platforms">
          <button class="share-platform" @click="act('whatsapp')">
            <span class="share-platform-icon"><AppIcon name="whatsapp" :size="16" /></span>
            WhatsApp
          </button>
          <button class="share-platform" @click="act('twitter')">
            <span class="share-platform-icon"><AppIcon name="twitter" :size="16" /></span>
            Twitter / X
          </button>
          <button class="share-platform" @click="act('linkedin')">
            <span class="share-platform-icon"><AppIcon name="linkedin-01" :size="16" /></span>
            LinkedIn
          </button>
          <button class="share-platform" @click="act('email')">
            <span class="share-platform-icon"><AppIcon name="mail-01" :size="16" /></span>
            Email
          </button>
          <button class="share-platform" @click="act('copy')">
            <span class="share-platform-icon">
              <AppIcon :name="copied ? 'tick-04' : 'link-01'" :size="16" />
            </span>
            {{ copied ? "Copied!" : "Copy link" }}
          </button>
          <button class="share-platform" @click="act('download')">
            <span class="share-platform-icon"><AppIcon name="download-01" :size="16" /></span>
            Download PNG
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
