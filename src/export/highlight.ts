import type { Highlight } from "@/types";

/** The red→gold / blue→purple text gradient used for highlighted words. */
export function gradientStyle(c1: string, c2: string): string {
  return `background:linear-gradient(135deg,${c1},${c2});-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;`;
}

/**
 * Highlights one word of a headline, returning an HTML string safe to feed to
 * `v-html`. An explicit `hl.word` (with optional colour) wins; otherwise the
 * last word gets the category gradient. Mirrors the original export output.
 */
export function highlightHtml(
  text: string,
  c1: string,
  c2: string,
  hl?: Highlight,
): string {
  const grad = gradientStyle(c1, c2);
  if (hl && hl.word && text.includes(hl.word)) {
    const style = hl.color ? `color:${hl.color};-webkit-text-fill-color:${hl.color};` : grad;
    return text.replace(hl.word, (m) => `<span style="${style}">${m}</span>`);
  }
  const i = text.lastIndexOf(" ");
  if (i < 0) return text;
  return `${text.slice(0, i)} <span style="${grad}">${text.slice(i + 1)}</span>`;
}
