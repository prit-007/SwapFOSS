import { capturePng } from "./capture";

/** Render an HTML card string to a PNG blob using an offscreen node. */
export async function renderCard(html: string, pixelRatio = 2): Promise<Blob> {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;z-index:-1;";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    return await capturePng(container.firstElementChild as HTMLElement, pixelRatio);
  } finally {
    container.remove();
  }
}

/** Trigger a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
