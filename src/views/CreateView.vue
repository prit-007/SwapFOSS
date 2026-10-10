<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useCatalogStore } from "@/stores/catalog";
import { useDraftsStore } from "@/stores/drafts";
import { loadJSON } from "@/data/api";
import LoadError from "@/components/common/LoadError.vue";
import AppIcon from "@/components/common/AppIcon.vue";
import type { Post, PostIntro, Tool } from "@/types";

const catalog = useCatalogStore();
const drafts = useDraftsStore();

const form = reactive({
  id: "",
  title: "",
  eyebrow: "",
  headline: "",
  subhead: "",
  pills: "",
  hlWord: "",
  hlColor: "#FF5A5F",
  outroHeadline: "",
  outroSubhead: "",
});
const selectedTools = ref<string[]>([]);
const format = ref<"swap" | "deep">("swap");
const error = ref(false);
const status = reactive({ msg: "", isError: false });
let statusTimer: ReturnType<typeof setTimeout> | undefined;

const post = computed<Post>(() => {
  const intro: PostIntro = {
    eyebrow: form.eyebrow.trim(),
    headline: form.headline.trim(),
    subhead: form.subhead.trim(),
  };
  const pills = form.pills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (pills.length) intro.pills = pills;
  if (form.hlWord.trim()) intro.hl = { word: form.hlWord.trim(), color: form.hlColor };
  const base: Post = {
    id: form.id.trim(),
    title: form.title.trim(),
    intro,
    tools: [...selectedTools.value],
    outro: { headline: form.outroHeadline.trim(), subhead: form.outroSubhead.trim() },
  };
  return format.value === "deep" ? { ...base, format: "deep-dive" } : base;
});

const errors = computed(() => validate(post.value));
const selected = computed<Tool[]>(() =>
  selectedTools.value
    .map((id) => catalog.tools.find((t) => t.id === id))
    .filter((t): t is Tool => !!t),
);
const grouped = computed(() => {
  const groups: Record<string, Tool[]> = {};
  catalog.tools.forEach((t) => {
    (groups[t.category] = groups[t.category] || []).push(t);
  });
  return groups;
});
const toolsHint = computed(() =>
  format.value === "deep"
    ? "Deep dive posts feature exactly one app — pick the star of the show. Its features, benefits, and setup slides are generated from that app's own data."
    : "Pick at least one. Cards render in the order listed below.",
);
/** The fixed 6-slide strip a deep dive will export. */
const slideChips = computed(() => {
  if (format.value !== "deep") return [];
  const appName = selected.value[0]?.name || "One app";
  return ["Intro", appName, "Features", "Benefits", "Setup", "Outro"];
});
const githubHref = computed(() => {
  if (errors.value.length) return undefined;
  const repo = "prit-007/SwapFOSS";
  const filename = `public/data/posts/${post.value.id}.json`;
  const value = JSON.stringify(post.value, null, 2) + "\n";
  return `https://github.com/${repo}/new/main?filename=${encodeURIComponent(filename)}&value=${encodeURIComponent(value)}`;
});

function validate(p: Post): string[] {
  const errs: string[] = [];
  if (!/^post-\d{3}$/.test(p.id)) errs.push("ID must look like post-004");
  if (!p.title) errs.push("Title is required");
  if (!p.intro.eyebrow) errs.push("Eyebrow is required");
  if (!p.intro.headline) errs.push("Intro headline is required");
  if (!p.intro.subhead) errs.push("Intro subhead is required");
  if (p.intro.hl && !p.intro.headline.includes(p.intro.hl.word)) {
    errs.push(`Highlight word "${p.intro.hl.word}" is not in the headline`);
  }
  if (p.format === "deep-dive") {
    if (p.tools.length !== 1) errs.push("Deep dive posts feature exactly one app");
  } else if (!p.tools.length) {
    errs.push("Pick at least one tool");
  }
  if (!p.outro.headline) errs.push("Outro headline is required");
  if (!p.outro.subhead) errs.push("Outro subhead is required");
  return errs;
}

function showStatus(msg: string, isError = false) {
  status.msg = msg;
  status.isError = isError;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => (status.msg = ""), 3000);
}

function setFormat(next: "swap" | "deep") {
  format.value = next;
  // Deep dives feature exactly one app, so trim any multi-selection down.
  if (next === "deep" && selectedTools.value.length > 1) {
    selectedTools.value = [selectedTools.value[0]];
  }
}

function onToolChange(id: string, e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  if (format.value === "deep") {
    selectedTools.value = checked ? [id] : [];
    return;
  }
  if (checked) {
    if (!selectedTools.value.includes(id)) selectedTools.value.push(id);
  } else {
    selectedTools.value = selectedTools.value.filter((x) => x !== id);
  }
}

async function init() {
  error.value = false;
  try {
    if (!catalog.tools.length) await catalog.load();
    if (catalog.error) throw new Error(catalog.error);
    const manifest = await loadJSON<{ posts: string[] }>("data/posts-manifest.json");
    drafts.load();
    form.id = drafts.nextId(manifest.posts);
  } catch {
    error.value = true;
  }
}

function loadDraft(id: string) {
  const d = drafts.drafts.find((x) => x.id === id);
  if (!d) return;
  form.id = d.id;
  form.title = d.title || "";
  form.eyebrow = d.intro.eyebrow || "";
  form.headline = d.intro.headline || "";
  form.subhead = d.intro.subhead || "";
  form.pills = (d.intro.pills || []).join(", ");
  form.hlWord = d.intro.hl?.word || "";
  form.hlColor = d.intro.hl?.color || "#FF5A5F";
  form.outroHeadline = d.outro.headline || "";
  form.outroSubhead = d.outro.subhead || "";
  setFormat(d.format === "deep-dive" ? "deep" : "swap");
  selectedTools.value = [...d.tools];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveDraft() {
  if (errors.value.length) return showStatus(errors.value[0], true);
  drafts.save(post.value);
  showStatus("Draft saved");
}

function downloadJSON() {
  if (errors.value.length) return showStatus(errors.value[0], true);
  const blob = new Blob([JSON.stringify(post.value, null, 2) + "\n"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${post.value.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showStatus("Downloaded");
}

async function copyJSON() {
  if (errors.value.length) return showStatus(errors.value[0], true);
  await navigator.clipboard.writeText(JSON.stringify(post.value, null, 2));
  showStatus("Copied to clipboard");
}

function removeDraft(id: string) {
  drafts.remove(id);
  showStatus("Draft deleted");
}

onMounted(init);
</script>

<template>
  <section class="hero">
    <div class="wrap">
      <h1>Create a post</h1>
      <p>Compose a carousel post, preview it live, then save it as a draft or download the JSON.</p>
    </div>
  </section>

  <main class="wrap create-layout" id="main" tabindex="-1">
    <form class="create-form" novalidate @submit.prevent>
      <div v-reveal class="create-section">
        <h2 class="create-section-title">Basics</h2>
        <div class="create-field">
          <span class="batch-label" id="format-label">Format</span>
          <div class="create-format-toggle" role="group" aria-labelledby="format-label">
            <button
              type="button"
              class="create-format-btn"
              :class="{ active: format === 'swap' }"
              :aria-pressed="format === 'swap'"
              @click="setFormat('swap')"
            >
              Swap post
              <small>2–3 apps side by side</small>
            </button>
            <button
              type="button"
              class="create-format-btn"
              :class="{ active: format === 'deep' }"
              :aria-pressed="format === 'deep'"
              @click="setFormat('deep')"
            >
              Deep dive
              <small>one app, told properly</small>
            </button>
          </div>
        </div>
        <div class="create-field">
          <label class="batch-label" for="f-id">Post ID</label>
          <input id="f-id" v-model="form.id" class="batch-pin-input" type="text" placeholder="post-004" />
          <span class="create-hint">Must match the filename: post-004.json</span>
        </div>
        <div class="create-field">
          <label class="batch-label" for="f-title">Title</label>
          <input id="f-title" v-model="form.title" class="batch-pin-input" type="text" placeholder="Short label shown on the batch card" />
        </div>
      </div>

      <div v-reveal class="create-section">
        <h2 class="create-section-title">Intro card</h2>
        <div class="create-field">
          <label class="batch-label" for="f-eyebrow">Eyebrow</label>
          <input id="f-eyebrow" v-model="form.eyebrow" class="batch-pin-input" type="text" placeholder="e.g. Free your music" />
        </div>
        <div class="create-field">
          <label class="batch-label" for="f-headline">Headline</label>
          <input id="f-headline" v-model="form.headline" class="batch-pin-input" type="text" placeholder="The big line on the intro card" />
        </div>
        <div class="create-field">
          <label class="batch-label" for="f-subhead">Subhead</label>
          <textarea id="f-subhead" v-model="form.subhead" class="batch-textarea" rows="2" placeholder="One supporting sentence"></textarea>
        </div>
        <div class="create-field">
          <label class="batch-label" for="f-pills">Stat pills (optional)</label>
          <input id="f-pills" v-model="form.pills" class="batch-pin-input" type="text" placeholder="Ad-Free Forever, No Account, Zero Tracking" />
          <span class="create-hint">Comma-separated. When set, the pills replace the subhead on the intro card.</span>
        </div>
        <div class="create-field-split">
          <div class="create-field">
            <label class="batch-label" for="f-hl-word">Highlight word (optional)</label>
            <input id="f-hl-word" v-model="form.hlWord" class="batch-pin-input" type="text" placeholder="e.g. security" />
            <span class="create-hint">Must appear in the headline. Leave empty for the default red-gold gradient on the last word.</span>
          </div>
          <div class="create-field">
            <label class="batch-label" for="f-hl-color">Color</label>
            <input id="f-hl-color" v-model="form.hlColor" class="create-color" type="color" />
          </div>
        </div>
      </div>

      <div v-reveal class="create-section">
        <h2 class="create-section-title">Tools</h2>
        <p class="create-hint">{{ toolsHint }}</p>
        <LoadError v-if="error" what="tools" @retry="init" />
        <div v-else class="create-tool-groups">
          <div v-for="(tools, catId) in grouped" :key="catId" class="create-tool-group">
            <span class="batch-cat-badge" :style="{ '--pill-color': catalog.categories[catId]?.color }">
              {{ catalog.categories[catId]?.label || catId }}
            </span>
            <div class="create-tool-options">
              <label v-for="t in tools" :key="t.id" class="create-tool-option">
                <input
                  type="checkbox"
                  :checked="selectedTools.includes(t.id)"
                  :value="t.id"
                  @change="onToolChange(t.id, $event)"
                />
                <img v-if="t.logo" class="batch-tool-thumb" :src="t.logo" alt="" />
                <span>{{ t.name }}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div v-reveal class="create-section">
        <h2 class="create-section-title">Outro card</h2>
        <div class="create-field">
          <label class="batch-label" for="f-outro-headline">Headline</label>
          <input id="f-outro-headline" v-model="form.outroHeadline" class="batch-pin-input" type="text" placeholder="Closing line" />
        </div>
        <div class="create-field">
          <label class="batch-label" for="f-outro-subhead">Subhead</label>
          <textarea id="f-outro-subhead" v-model="form.outroSubhead" class="batch-textarea" rows="2" placeholder="Call to action"></textarea>
        </div>
      </div>

      <div class="create-actions">
        <button type="button" class="batch-download-btn" @click="saveDraft">
          <AppIcon name="floppy-disk" /> Save draft
        </button>
        <button type="button" class="batch-caption-btn" @click="downloadJSON">
          <AppIcon name="download-01" /> Download JSON
        </button>
        <button type="button" class="batch-caption-btn" @click="copyJSON">
          <AppIcon name="copy-01" /> Copy JSON
        </button>
        <a
          class="batch-caption-btn"
          :class="{ 'create-btn-disabled': errors.length }"
          :href="githubHref"
          target="_blank"
          rel="noopener"
          @click="errors.length && $event.preventDefault()"
        >
          <AppIcon name="github-01" /> Open on GitHub
        </a>
        <span class="create-status" :class="{ 'create-status-error': status.isError }">{{ status.msg }}</span>
      </div>
    </form>

    <aside v-reveal class="create-preview">
      <div class="create-preview-sticky">
        <span class="batch-tools-label"><AppIcon name="eye" /> Live preview</span>
        <div class="create-preview-card">
          <span class="batch-intro-eyebrow">{{ post.intro.eyebrow || "Eyebrow" }}</span>
          <p class="batch-intro-headline">{{ post.intro.headline || "Your headline" }}</p>
          <p v-show="!post.intro.pills" class="batch-intro-subhead">
            {{ post.intro.subhead || "Your subhead" }}
          </p>
          <div v-if="post.intro.pills" class="create-preview-pills">
            <span v-for="p in post.intro.pills" :key="p" class="stat-pill">
              <AppIcon name="tick-04" /> {{ p }}
            </span>
          </div>
        </div>
        <div class="create-preview-tools">
          <img
            v-for="t in selected"
            :key="t.id"
            class="batch-tool-thumb"
            :src="t.logo"
            :alt="t.name"
            :title="t.name"
          />
        </div>
        <div v-if="slideChips.length" class="create-slide-strip">
          <span class="create-slide-strip-label">{{ slideChips.length }} slides</span>
          <span
            v-for="(c, i) in slideChips"
            :key="c"
            class="create-slide-chip"
            :class="{ 'deep-active': i > 0 && i < slideChips.length - 1 }"
          >
            {{ c }}
          </span>
        </div>
        <div class="create-preview-card create-preview-outro">
          <p class="batch-intro-headline">{{ post.outro.headline || "Closing headline" }}</p>
          <p class="batch-intro-subhead">{{ post.outro.subhead || "Closing subhead" }}</p>
        </div>
        <pre class="create-json-preview" :class="{ 'create-json-invalid': errors.length }">{{ errors.length ? errors.join("\n") : JSON.stringify(post, null, 2) }}</pre>
      </div>
    </aside>
  </main>

  <section class="wrap create-drafts">
    <h2 class="create-section-title">Your drafts</h2>
    <div class="create-drafts-list">
      <p v-if="!drafts.drafts.length" class="create-hint">
        No drafts yet. Saved drafts appear here and on the batch export page.
      </p>
      <div v-for="d in drafts.drafts" :key="d.id" class="create-draft-row">
        <div class="create-draft-info">
          <strong>{{ d.id }}</strong>
          <span>{{ d.title || "Untitled" }}</span>
          <span class="batch-post-count">
            {{ d.format === "deep-dive" ? "Deep dive" : `${d.tools.length} tool${d.tools.length !== 1 ? "s" : ""}` }}
          </span>
        </div>
        <div class="create-draft-actions">
          <button class="batch-caption-btn" @click="loadDraft(d.id)">
            <AppIcon name="edit-01" /> Edit
          </button>
          <button class="batch-caption-btn" @click="removeDraft(d.id)">
            <AppIcon name="delete-02" /> Delete
          </button>
        </div>
      </div>
    </div>
  </section>

  <footer class="site-footer">
    <div class="wrap">Built for sharing free software with the world.</div>
  </footer>
</template>
