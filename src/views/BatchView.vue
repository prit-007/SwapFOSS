<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import { useCatalogStore } from "@/stores/catalog";
import { useDraftsStore } from "@/stores/drafts";
import { useBatchStore, PIN } from "@/stores/batch";
import { loadPosts } from "@/data/catalog";
import { PRESETS, type PresetKey } from "@/export/presets";
import { buildPostZip } from "@/export/post-zip";
import { generateCaption } from "@/export/caption";
import { isDeepDive, buildSlides } from "@/export/deep-cards";
import { downloadBlob } from "@/export/render";
import LoadError from "@/components/common/LoadError.vue";
import AppIcon from "@/components/common/AppIcon.vue";
import SkeletonPosts from "@/components/batch/SkeletonPosts.vue";
import type { Post, Tool } from "@/types";

const catalog = useCatalogStore();
const drafts = useDraftsStore();
const batch = useBatchStore();

const posts = ref<Post[]>([]);
const draftIds = ref<Set<string>>(new Set());
const error = ref(false);
const loaded = ref(false);

const pins = reactive<Record<string, string>>({});
const pinError = reactive<Record<string, boolean>>({});
const captions = reactive<Record<string, { text: string; visible: boolean; copied: boolean }>>({});
const progress = reactive<Record<string, { active: boolean; pct: number; label: string; done: boolean }>>(
  {},
);

const presetOptions = Object.entries(PRESETS).map(([key, p]) => ({
  key: key as PresetKey,
  label: `${p.label} (${p.width}×${p.height})`,
}));

const toolMap = computed(() => new Map(catalog.tools.map((t) => [t.id, t])));
const postIds = computed(() => posts.value.map((p) => p.id));

function toolsFor(post: Post): Tool[] {
  return post.tools.map((id) => toolMap.value.get(id)).filter((t): t is Tool => !!t);
}
function catsFor(post: Post): string[] {
  return [...new Set(toolsFor(post).map((t) => t.category))];
}
function countText(post: Post): string {
  return isDeepDive(post)
    ? `Deep dive · ${buildSlides(post).length} slides`
    : `${toolsFor(post).length} tool${toolsFor(post).length !== 1 ? "s" : ""}`;
}

async function load() {
  error.value = false;
  try {
    if (!catalog.tools.length) await catalog.load();
    if (catalog.error) throw new Error(catalog.error);
    const published = await loadPosts();
    drafts.load();
    const publishedIds = new Set(published.map((p) => p.id));
    const draftPosts = drafts.drafts.filter((d) => d && d.id && !publishedIds.has(d.id));
    draftIds.value = new Set(draftPosts.map((p) => p.id));
    posts.value = [...published, ...draftPosts];
    batch.restorePinRemember();
    if (batch.pinRemember) fillPins(PIN);
  } catch {
    error.value = true;
  } finally {
    loaded.value = true;
  }
}

function fillPins(value: string) {
  postIds.value.forEach((id) => (pins[id] = value));
}

function onBulkPreset(key: PresetKey) {
  batch.setBulkPreset(key, postIds.value);
}
function toggleBulkTheme() {
  batch.setBulkTheme(!batch.bulkTheme, postIds.value);
}
function onPinRemember(e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  batch.setPinRemember(checked);
  fillPins(checked ? PIN : "");
}

async function download(postId: string) {
  if ((pins[postId] || "") !== PIN) {
    pinError[postId] = true;
    setTimeout(() => (pinError[postId] = false), 1500);
    return;
  }
  const post = posts.value.find((p) => p.id === postId);
  if (!post) return;
  progress[postId] = { active: true, pct: 0, label: "", done: false };
  try {
    const { blob } = await buildPostZip({
      post,
      tools: toolsFor(post),
      categories: catalog.categories,
      presetKey: batch.presetFor(postId),
      lightTheme: batch.themeFor(postId),
      onProgress: (cur, tot, msg) => {
        progress[postId] = { active: true, pct: (cur / tot) * 100, label: `${msg} ${cur}/${tot}`, done: false };
      },
    });
    downloadBlob(blob, `${postId}.zip`);
    progress[postId] = { active: true, pct: 100, label: "Done!", done: true };
    setTimeout(() => (progress[postId] = { active: false, pct: 0, label: "", done: false }), 1500);
  } catch {
    progress[postId] = { active: true, pct: 0, label: "Error — try again", done: false };
    setTimeout(() => (progress[postId] = { active: false, pct: 0, label: "", done: false }), 2000);
  }
}

function showCaption(postId: string) {
  const post = posts.value.find((p) => p.id === postId);
  if (!post) return;
  captions[postId] = { text: generateCaption(post, toolsFor(post)), visible: true, copied: false };
}
async function copyCaption(postId: string) {
  const c = captions[postId];
  if (!c) return;
  await navigator.clipboard.writeText(c.text);
  c.copied = true;
  setTimeout(() => (c.copied = false), 1500);
}
function removeDraft(postId: string) {
  drafts.remove(postId);
  posts.value = posts.value.filter((p) => p.id !== postId);
}

onMounted(load);
</script>

<template>
  <section class="hero">
    <div class="wrap">
      <h1>Batch export</h1>
      <p>
        Download post-ready bundles — intro card, tool cards, and outro — as a ZIP.
        Enter the PIN to unlock downloads.
      </p>
      <RouterLink to="/create" class="batch-create-link">
        <AppIcon name="add-01" /> Create a new post
      </RouterLink>
    </div>
  </section>

  <main class="wrap" id="main" tabindex="-1">
    <div v-if="loaded && posts.length" class="batch-bulk-bar">
      <span class="batch-bulk-title">Apply to all posts</span>
      <select
        class="batch-select batch-bulk-select"
        aria-label="Preset for every post"
        :value="batch.bulkPreset"
        @change="onBulkPreset(($event.target as HTMLSelectElement).value as PresetKey)"
      >
        <option v-for="opt in presetOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
      </select>
      <button
        class="batch-theme-toggle"
        :class="{ active: batch.bulkTheme }"
        type="button"
        :aria-pressed="batch.bulkTheme"
        @click="toggleBulkTheme"
      >
        <AppIcon class="batch-theme-icon" :name="batch.bulkTheme ? 'moon-01' : 'sun-01'" />
        <span class="batch-theme-label">{{ batch.bulkTheme ? "Dark" : "Light" }}</span>
      </button>
      <label class="batch-bulk-check">
        <input type="checkbox" :checked="batch.pinRemember" @change="onPinRemember" />
        Fill PIN for this session
      </label>
    </div>

    <LoadError v-if="error" what="posts" @retry="load" />
    <SkeletonPosts v-else-if="!loaded" />
    <div v-else class="posts-grid">
      <div
        v-for="(post, i) in posts"
        :key="post.id"
        class="batch-post-card relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.02] shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-xl hover:shadow-black/30"
        :class="{ 'batch-post-deep': isDeepDive(post) }"
        :style="{ '--card-index': i }"
      >
        <div class="batch-post-header flex items-start justify-between gap-3">
          <h2 class="batch-post-title">{{ post.title }}</h2>
          <div class="flex shrink-0 items-center gap-3">
            <span class="batch-post-count">
              {{ draftIds.has(post.id) ? "Draft · " : "" }}{{ countText(post) }}
            </span>
            <RouterLink
              class="batch-post-preview inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 no-underline transition hover:border-white/25 hover:bg-white/10 hover:text-white"
              :to="{ path: '/slide', query: { post: post.id, type: 'intro' } }"
            >
              <AppIcon name="eye" /> Preview
            </RouterLink>
          </div>
        </div>
        <div class="batch-post-intro rounded-xl bg-white/[0.03] ring-1 ring-white/10">
          <span class="batch-intro-eyebrow">{{ post.intro.eyebrow }}</span>
          <p class="batch-intro-headline">{{ post.intro.headline }}</p>
          <p class="batch-intro-subhead">{{ post.intro.subhead }}</p>
        </div>
        <div class="batch-post-tools">
          <span class="batch-tools-label">{{ isDeepDive(post) ? "Featured app:" : "Tools included:" }}</span>
          <div class="batch-tool-thumbs">
            <img
              v-for="t in toolsFor(post)"
              v-show="t.logo"
              :key="t.id"
              class="batch-tool-thumb rounded-lg ring-1 ring-white/10"
              :src="t.logo"
              :alt="t.name"
              :title="t.name"
            />
          </div>
        </div>
        <div class="batch-post-badges">
          <span
            v-for="c in catsFor(post)"
            :key="c"
            class="batch-cat-badge"
            :style="{ '--pill-color': catalog.categories[c]?.color }"
          >
            {{ catalog.categories[c]?.label }}
          </span>
        </div>
        <div class="batch-post-controls">
          <div class="batch-control-row">
            <label class="batch-label">Preset</label>
            <select
              class="batch-select"
              :value="batch.presetFor(post.id)"
              @change="batch.setPreset(post.id, ($event.target as HTMLSelectElement).value as PresetKey)"
            >
              <option v-for="opt in presetOptions" :key="opt.key" :value="opt.key">{{ opt.label }}</option>
            </select>
          </div>
          <div class="batch-control-row">
            <label class="batch-label">Theme</label>
            <button
              class="batch-theme-toggle"
              :class="{ active: batch.themeFor(post.id) }"
              :aria-pressed="batch.themeFor(post.id)"
              @click="batch.toggleTheme(post.id)"
            >
              <AppIcon
                class="batch-theme-icon"
                :name="batch.themeFor(post.id) ? 'moon-01' : 'sun-01'"
              />
              <span class="batch-theme-label">{{ batch.themeFor(post.id) ? "Dark" : "Light" }}</span>
            </button>
          </div>
          <div class="batch-control-row batch-pin-row">
            <label class="batch-label">PIN</label>
            <input
              v-model="pins[post.id]"
              class="batch-pin-input"
              :class="{ 'batch-pin-error': pinError[post.id] }"
              type="password"
              placeholder="Enter PIN"
            />
          </div>
          <button class="batch-download-btn" :disabled="progress[post.id]?.active" @click="download(post.id)">
            <span v-show="!progress[post.id]?.active" class="batch-download-text">
              <AppIcon name="download-01" /> Download ZIP
            </span>
            <span v-show="progress[post.id]?.active" class="batch-download-progress">
              <span class="batch-progress-bar">
                <span class="batch-progress-fill" :style="{ width: `${progress[post.id]?.pct || 0}%` }"></span>
              </span>
              <span class="batch-progress-label">{{ progress[post.id]?.label }}</span>
            </span>
          </button>
          <button class="batch-caption-btn" @click="showCaption(post.id)">
            <AppIcon name="magic-wand-01" /> Generate caption
          </button>
          <div v-if="captions[post.id]?.visible" class="batch-caption-box">
            <p class="batch-caption-text">{{ captions[post.id].text }}</p>
            <button class="batch-caption-copy" @click="copyCaption(post.id)">
              <AppIcon :name="captions[post.id].copied ? 'tick-04' : 'copy-01'" />
              {{ captions[post.id].copied ? "Copied!" : "Copy" }}
            </button>
          </div>
          <button
            v-if="draftIds.has(post.id)"
            class="batch-draft-delete"
            @click="removeDraft(post.id)"
          >
            <AppIcon name="delete-02" /> Remove draft
          </button>
        </div>
      </div>
    </div>
  </main>

  <footer v-reveal class="site-footer">
    <div class="wrap">Built for sharing free software with the world.</div>
  </footer>
</template>
