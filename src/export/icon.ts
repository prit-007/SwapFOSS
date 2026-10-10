import { ICONS, type IconName } from "@/icons";

export interface IconSvgOptions {
  size?: number;
  color?: string;
  stroke?: number;
}

export function iconSvg(name: IconName, opts: IconSvgOptions = {}): string {
  const { size = 16, color = "currentColor", stroke = 1.5 } = opts;
  let body: string = ICONS[name] ?? "";
  if (stroke !== 1.5) {
    body = body.replaceAll('stroke-width="1.5"', `stroke-width="${stroke}"`);
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" style="display:inline-block;vertical-align:-0.16em;flex:none;color:${color};overflow:visible;">${body}</svg>`;
}
