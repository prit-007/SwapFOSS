import { defineStore } from "pinia";
import type { PresetKey } from "@/export/presets";

export const PIN = "swapfoss2026";
export const PIN_FILL_KEY = "swapfoss-fill-pin";

export const useBatchStore = defineStore("batch", {
  state: () => ({
    presets: {} as Record<string, PresetKey>,
    themes: {} as Record<string, boolean>,
    bulkPreset: "linkedin" as PresetKey,
    bulkTheme: false,
    pinRemember: false,
  }),
  getters: {
    presetFor: (s) => (id: string): PresetKey => s.presets[id] ?? "linkedin",
    themeFor: (s) => (id: string): boolean => s.themes[id] ?? false,
  },
  actions: {
    setPreset(id: string, key: PresetKey) {
      this.presets[id] = key;
    },
    toggleTheme(id: string) {
      this.themes[id] = !this.themes[id];
    },
    setBulkPreset(key: PresetKey, ids: string[]) {
      this.bulkPreset = key;
      ids.forEach((id) => (this.presets[id] = key));
    },
    setBulkTheme(on: boolean, ids: string[]) {
      this.bulkTheme = on;
      ids.forEach((id) => (this.themes[id] = on));
    },
    setPinRemember(on: boolean) {
      this.pinRemember = on;
      sessionStorage.setItem(PIN_FILL_KEY, on ? "1" : "0");
    },
    restorePinRemember() {
      this.pinRemember = sessionStorage.getItem(PIN_FILL_KEY) === "1";
    },
  },
});
