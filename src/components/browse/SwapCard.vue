<script setup lang="ts">
import { computed, ref } from "vue";
import AppIcon from "@/components/common/AppIcon.vue";
import type { Category, Difficulty, Tool } from "@/types";

const props = defineProps<{
  tool: Tool;
  cat: Category;
  index: number;
  variant?: "grid" | "list";
}>();
const emit = defineEmits<{ share: [id: string]; preview: [tool: Tool] }>();

const setupOpen = ref(false);
const detailsOpen = ref(false);

const isList = computed(() => props.variant === "list");
const hasScreenshot = computed(() => !!props.tool.screenshot);
const hasLogo = computed(() => !!props.tool.logo);
const hasFeatures = computed(() => !!props.tool.features?.length);
const hasSetupSteps = computed(() => !!props.tool.setupSteps?.length);
const hasStars = computed(() => typeof props.tool.stars === "number" && props.tool.stars > 0);

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
const difficultyLabel = computed(() => DIFFICULTY_LABELS[props.tool.difficulty]);

function formatStars(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return String(n);
}
const starsLabel = computed(() => formatStars(props.tool.stars ?? 0));
</script>

<template>
  <article
    class="swap-card group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4 shadow-lg shadow-black/20 backdrop-blur-xl transition duration-300 ease-out will-change-transform hover:-translate-y-1.5 hover:border-white/[0.15] hover:from-white/[0.09] hover:to-white/[0.04] hover:shadow-2xl hover:shadow-black/50"
    :class="isList ? 'sm:flex-row sm:items-stretch' : ''"
    :style="{ '--cat-color': cat.color, '--card-index': index }"
    :data-category="tool.category"
    :data-id="tool.id"
  >
    <span
      aria-hidden="true"
      class="pointer-events-none absolute -right-20 -top-24 h-44 w-44 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-40"
      :style="{ background: cat.color }"
    ></span>
    <div
      class="card-media relative overflow-hidden rounded-xl ring-1 ring-white/10"
      :class="[{ 'no-screenshot': !hasScreenshot }, isList ? 'sm:w-72 sm:shrink-0' : '']"
      :data-fallback-text="!hasScreenshot && !hasLogo ? tool.name : ''"
    >
      <img
        v-if="hasScreenshot"
        :src="tool.screenshot"
        :alt="`${tool.name} screenshot`"
        loading="lazy"
        class="screenshot-img"
        @click="emit('preview', tool)"
      />
      <div
        v-if="hasScreenshot"
        class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
      ></div>
      <img
        v-if="hasLogo"
        class="logo-badge ring-1 ring-white/20"
        :src="tool.logo"
        :alt="`${tool.name} logo`"
      />
      <div class="card-badges">
        <span class="card-chip card-chip-diff" :data-diff="tool.difficulty">
          {{ difficultyLabel }}
        </span>
        <span v-if="hasStars" class="card-chip card-chip-stars">
          <AppIcon name="star" :size="11" /> {{ starsLabel }}
        </span>
      </div>
    </div>
    <div class="card-body flex flex-1 flex-col gap-3 pt-3">
      <div class="card-title-row">
        <img
          v-if="hasLogo"
          class="card-logo-inline"
          :src="tool.logo"
          :alt="`${tool.name} logo`"
        />
        <div class="card-title-text">
          <span class="tag">{{ cat.label || tool.category }}</span>
          <div class="swap-row">
            <span class="swap-from">{{ tool.insteadOf }}</span>
            <span class="swap-arrow"><AppIcon name="arrow-right-01" /></span>
            <span class="swap-to">{{ tool.name }}</span>
          </div>
        </div>
      </div>
      <p class="hook">{{ tool.hook }}</p>
      <div v-if="hasFeatures" class="feature-pills">
        <span v-for="f in tool.features" :key="f" class="feature-pill">{{ f }}</span>
      </div>
      <div v-if="hasSetupSteps" class="setup-steps">
        <button class="setup-toggle" @click="setupOpen = !setupOpen">
          How to use <AppIcon :name="setupOpen ? 'arrow-up-01' : 'arrow-down-01'" />
        </button>
        <div class="setup-body" :class="{ open: setupOpen }">
          <ol>
            <li v-for="(s, i) in tool.setupSteps" :key="i">{{ s }}</li>
          </ol>
        </div>
      </div>
      <div v-if="tool.details" class="details-expand">
        <button class="details-toggle" @click="detailsOpen = !detailsOpen">
          {{ detailsOpen ? "Read less" : "Read more" }}
          <AppIcon :name="detailsOpen ? 'arrow-up-01' : 'arrow-down-01'" />
        </button>
        <div class="details-body" :class="{ open: detailsOpen }">
          <p>{{ tool.details }}</p>
        </div>
      </div>
      <div class="card-footer">
        <span class="meta">{{ tool.setup }}</span>
        <div class="flex gap-2">
          <button class="share-btn" @click="emit('share', tool.id)">
            <AppIcon name="share-01" /> Share
          </button>
          <a class="link-btn" :href="tool.link" target="_blank" rel="noopener">
            <AppIcon name="external-link" /> Visit
          </a>
        </div>
      </div>
    </div>
  </article>
</template>
