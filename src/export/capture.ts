import * as htmlToImage from "html-to-image";

/** Wait for web fonts and any <img> inside the node to finish loading. */
export async function waitForAssets(root: HTMLElement): Promise<void> {
  const fonts = (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts;
  if (fonts?.ready) {
    try {
      await fonts.ready;
    } catch {
      /* font loading failures should not block export */
    }
  }

  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      if (typeof img.decode === "function") return img.decode().catch(() => undefined);
      return new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });
    }),
  );
}

/** Render a DOM node to a PNG blob at the given pixel ratio. */
export async function capturePng(node: HTMLElement, pixelRatio = 2): Promise<Blob> {
  await waitForAssets(node);
  const dataUrl = await htmlToImage.toPng(node, { pixelRatio });
  const res = await fetch(dataUrl);
  return res.blob();
}
