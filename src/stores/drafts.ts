import { defineStore } from "pinia";
import type { Post } from "@/types";

export const DRAFTS_KEY = "swapfoss-drafts";

export const useDraftsStore = defineStore("drafts", {
  state: () => ({
    drafts: [] as Post[],
  }),
  actions: {
    load() {
      try {
        const parsed = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "[]");
        this.drafts = Array.isArray(parsed) ? parsed : [];
      } catch {
        this.drafts = [];
      }
    },
    persist() {
      localStorage.setItem(DRAFTS_KEY, JSON.stringify(this.drafts));
    },
    save(post: Post) {
      const idx = this.drafts.findIndex((d) => d.id === post.id);
      if (idx >= 0) this.drafts[idx] = post;
      else this.drafts.push(post);
      this.persist();
    },
    remove(id: string) {
      this.drafts = this.drafts.filter((d) => d.id !== id);
      this.persist();
    },
    /** Smallest unused post-NNN id given published ids + current drafts. */
    nextId(published: string[]): string {
      const used = new Set<number>();
      [...published, ...this.drafts.map((d) => d.id)].forEach((id) => {
        const m = /^post-(\d+)$/.exec(id);
        if (m) used.add(parseInt(m[1], 10));
      });
      let n = 1;
      while (used.has(n)) n++;
      return `post-${String(n).padStart(3, "0")}`;
    },
  },
});
