<script setup lang="ts">
import { computed, ref } from "vue";
import AppIcon from "@/components/common/AppIcon.vue";
import type { Category, Tool } from "@/types";

const props = defineProps<{ tool: Tool; cat: Category; index: number }>();
const emit = defineEmits<{ share: [id: string]; preview: [tool: Tool] }>();

const setupOpen = ref(false);
const detailsOpen = ref(false);

const hasScreenshot = computed(() => !!props.tool.screenshot);
const hasLogo = computed(() => !!props.tool.logo);
const hasFeatures = computed(() => !!props.tool.features?.length);
const hasSetupSteps = computed(() => !!props.tool.setupSteps?.length);
</script>

<template>
  <article
    class="swap-card"
    :style="{ '--cat-color': cat.color, '--card-index': index }"
    :data-category="tool.category"
    :data-id="tool.id"
  >
    <div
      class="card-media"
      :class="{ 'no-screenshot': !hasScreenshot }"
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
      <img
        v-if="hasLogo"
        class="logo-badge"
        :src="tool.logo"
        :alt="`${tool.name} logo`"
      />
    </div>
    <div class="card-body">
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
        <div style="display: flex; gap: 8px">
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
