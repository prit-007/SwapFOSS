export interface Preset {
  width: number;
  height: number;
  label: string;
}

export const PRESETS = {
  linkedin: { width: 1080, height: 1350, label: "LinkedIn" },
  instagram: { width: 1080, height: 1080, label: "Instagram" },
  twitter: { width: 1200, height: 675, label: "Twitter / X" },
} as const satisfies Record<string, Preset>;

export type PresetKey = keyof typeof PRESETS;
export const DEFAULT_PRESET: PresetKey = "linkedin";

export interface TypeScale {
  h1: number;
  sub: number;
  wm: number;
  cta: number;
}

/** Font sizes scale with the preset height, clamped to a 0.62 floor. */
export function typeScale(preset: Preset): TypeScale {
  const k = Math.min(1, Math.max(0.62, preset.height / 1350));
  return {
    h1: Math.round(80 * k),
    sub: Math.round(26 * k),
    wm: Math.round(320 * k),
    cta: Math.max(15, Math.round(19 * k)),
  };
}
