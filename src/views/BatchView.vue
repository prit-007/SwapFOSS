<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { RouterLink } from "vue-router";
import { useCatalogStore } from "@/stores/catalog";
import { useDraftsStore } from "@/stores/drafts";
import { useBatchStore, PIN } from "@/stores/batch";
import { loadPosts } from "@/data/catalog";
import { PRESETS, type PresetKey } from "@/export/presets";
import { buildPostZip } from "@/export/post-zip";
import {
  generateNarrative,
  type NarrativePlatform,
  type NarrativeAngle,
} from "@/export/narrative";
import { isDeepDive, buildSlides } from "@/export/deep-cards";
import { downloadBlob } from "@/export/render";
import LoadError from "@/components/common/LoadError.vue";
import AppIcon from "@/components/common/AppIcon.vue";
import SkeletonPosts from "@/components/batch/SkeletonPosts.vue";
import { useToast } from "@/composables/useToast";
import type { Post, Tool } from "@/types";
import type { IconName } from "@/icons";

const catalog = useCatalogStore();
const drafts = useDraftsStore();
const batch = useBatchStore();
const toast = useToast();

const posts = ref<Post[]>([]);
const draftIds = ref<Set<string>>(new Set());
const error = ref(false);
const loaded = ref(false);

const pins = reactive<Record<string, string>>({});
const pinError = reactive<Record<string, boolean>>({});
const progress = reactive<Record<string, { active: boolean; pct: number; label: string; done: boolean }>>(
  {},
);

interface StudioItem {
  visible: boolean;
  platform: NarrativePlatform;
  angle: NarrativeAngle;
  customText: Record<string, string>;
  copied: boolean;
}

const studios = reactive<Record<string, StudioItem>>({});

const PLATFORM_TABS: { key: NarrativePlatform; label: string; icon: IconName }[] = [
  { key: "linkedin", label: "LinkedIn", icon: "linkedin-01" },
  { key: "twitter", label: "X / Thread", icon: "twitter" },
  { key: "reddit", label: "Reddit", icon: "share-01" },
  { key: "instagram", label: "Instagram", icon: "share-01" },
];

const LINKEDIN_ANGLES: { key: NarrativeAngle; label: string }[] = [
  { key: "story", label: "Story / Friction" },
  { key: "tech", label: "Tech / Architecture" },
  { key: "quick", label: "Quick Switcher" },
];

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
    toast.show(`${postId}.zip downloaded`, { icon: "download-01" });
    setTimeout(() => (progress[postId] = { active: false, pct: 0, label: "", done: false }), 1500);
  } catch {
    progress[postId] = { active: true, pct: 0, label: "Error — try again", done: false };
    setTimeout(() => (progress[postId] = { active: false, pct: 0, label: "", done: false }), 2000);
  }
}

function ensureStudio(postId: string): StudioItem {
  if (!studios[postId]) {
    studios[postId] = {
      visible: false,
      platform: "linkedin",
      angle: "story",
      customText: {},
      copied: false,
    };
  }
  return studios[postId];
}

function currentPlatform(postId: string): NarrativePlatform {
  return ensureStudio(postId).platform;
}

function currentAngle(postId: string): NarrativeAngle {
  return ensureStudio(postId).angle;
}

function getStudioKey(platform: NarrativePlatform, angle: NarrativeAngle): string {
  return platform === "linkedin" ? `linkedin:${angle}` : platform;
}

function toggleStudio(postId: string) {
  const s = ensureStudio(postId);
  s.visible = !s.visible;
}

function getStudioText(postId: string): string {
  const s = ensureStudio(postId);
  const key = getStudioKey(s.platform, s.angle);
  if (s.customText[key] !== undefined) {
    return s.customText[key];
  }
  const post = posts.value.find((p) => p.id === postId);
  if (!post) return "";
  return generateNarrative(post, toolsFor(post), {
    platform: s.platform,
    angle: s.angle,
  });
}

function onStudioInput(postId: string, text: string) {
  const s = ensureStudio(postId);
  const key = getStudioKey(s.platform, s.angle);
  s.customText[key] = text;
}

function setPlatform(postId: string, platform: NarrativePlatform) {
  const s = ensureStudio(postId);
  s.platform = platform;
}

function setAngle(postId: string, angle: NarrativeAngle) {
  const s = ensureStudio(postId);
  s.angle = angle;
}

function resetStudio(postId: string) {
  const s = ensureStudio(postId);
  const key = getStudioKey(s.platform, s.angle);
  delete s.customText[key];
  toast.show("Reset to generated narrative", { icon: "refresh-01" });
}

async function copyStudio(postId: string) {
  const s = ensureStudio(postId);
  const text = getStudioText(postId);
  try {
    await navigator.clipboard.writeText(text);
    s.copied = true;
    toast.show("Post copied to clipboard", { icon: "copy-01" });
    setTimeout(() => (s.copied = false), 1500);
  } catch {
    toast.show("Couldn't copy — clipboard blocked", { tone: "error" });
  }
}

function getStats(text: string) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { chars, words };
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
    <template v-else>
      <div v-if="!posts.length" class="empty-state">
        <p class="empty-state-title">Nothing to export yet</p>
        <p class="empty-state-sub">
          Publish a post to the repo, or save a draft on the Create page, and it'll
          show up here ready for batch export.
        </p>
        <RouterLink class="filter-btn" to="/create" style="--pill-color: var(--text-muted)">
          <AppIcon name="add-01" :size="14" /> Create a post
        </RouterLink>
      </div>
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
            <label class="batch-label" :for="`batch-pin-${post.id}`">PIN</label>
            <input
              :id="`batch-pin-${post.id}`"
              v-model="pins[post.id]"
              class="batch-pin-input"
              :class="{ 'batch-pin-error': pinError[post.id] }"
              :aria-invalid="pinError[post.id] || undefined"
              type="password"
              autocomplete="off"
              placeholder="Enter PIN"
            />
          </div>
          <button class="batch-download-btn" :disabled="progress[post.id]?.active" @click="download(post.id)">
            <span v-show="!progress[post.id]?.active" class="batch-download-text">
              <AppIcon name="download-01" /> Download ZIP
            </span>
            <span v-show="progress[post.id]?.active" class="batch-download-progress">
              <span
                class="batch-progress-bar"
                role="progressbar"
                :aria-valuenow="Math.round(progress[post.id]?.pct || 0)"
                aria-valuemin="0"
                aria-valuemax="100"
              >
                <span class="batch-progress-fill" :style="{ width: `${progress[post.id]?.pct || 0}%` }"></span>
              </span>
              <span class="batch-progress-label" role="status" aria-live="polite">
                {{ progress[post.id]?.label }}
              </span>
            </span>
          </button>
          <button class="batch-caption-btn" @click="toggleStudio(post.id)">
            <AppIcon name="magic-wand-01" /> {{ studios[post.id]?.visible ? "Hide Post Studio" : "Post Studio & Captions" }}
          </button>
          <div v-if="studios[post.id]?.visible" class="batch-caption-box studio-box">
            <div class="studio-header">
              <div class="studio-title-group">
                <span class="studio-title">Multi-Platform Post Studio</span>
                <span class="studio-badge">
                  <AppIcon name="star" :size="12" /> Human copy · Zero AI fluff
                </span>
              </div>
              <div class="studio-platforms" role="tablist" aria-label="Platform select">
                <button
                  v-for="p in PLATFORM_TABS"
                  :key="p.key"
                  type="button"
                  role="tab"
                  :aria-selected="currentPlatform(post.id) === p.key"
                  class="studio-tab"
                  :class="{ active: currentPlatform(post.id) === p.key }"
                  @click="setPlatform(post.id, p.key)"
                >
                  <AppIcon :name="p.icon" :size="13" />
                  {{ p.label }}
                </button>
              </div>
              <div v-if="currentPlatform(post.id) === 'linkedin'" class="studio-angles">
                <span class="studio-angle-label">Angle:</span>
                <button
                  v-for="a in LINKEDIN_ANGLES"
                  :key="a.key"
                  type="button"
                  class="studio-angle-btn"
                  :class="{ active: currentAngle(post.id) === a.key }"
                  @click="setAngle(post.id, a.key)"
                >
                  {{ a.label }}
                </button>
              </div>
            </div>
            <div class="studio-editor-wrap">
              <textarea
                class="studio-textarea"
                :value="getStudioText(post.id)"
                rows="8"
                aria-label="Post narrative content"
                @input="onStudioInput(post.id, ($event.target as HTMLTextAreaElement).value)"
              ></textarea>
            </div>
            <div class="studio-footer">
              <div class="studio-stats">
                <span>{{ getStats(getStudioText(post.id)).chars }} chars</span>
                <span>·</span>
                <span>{{ getStats(getStudioText(post.id)).words }} words</span>
              </div>
              <div class="studio-actions">
                <button
                  type="button"
                  class="studio-reset-btn"
                  title="Reset to generated narrative"
                  @click="resetStudio(post.id)"
                >
                  <AppIcon name="refresh-01" :size="12" /> Reset
                </button>
                <button
                  type="button"
                  class="batch-caption-copy"
                  @click="copyStudio(post.id)"
                >
                  <AppIcon :name="studios[post.id]?.copied ? 'tick-04' : 'copy-01'" />
                  {{ studios[post.id]?.copied ? "Copied!" : "Copy Post" }}
                </button>
              </div>
            </div>
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
    </template>
  </main>

  <footer v-reveal class="site-footer">
    <div class="wrap">Built for sharing free software with the world.</div>
  </footer>
</template>
