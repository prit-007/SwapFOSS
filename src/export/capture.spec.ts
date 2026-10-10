import { describe, it, expect } from "vitest";
import { waitForAssets } from "./capture";

describe("waitForAssets", () => {
  it("resolves immediately when there are no images", async () => {
    const div = document.createElement("div");
    await expect(waitForAssets(div)).resolves.toBeUndefined();
  });

  it("awaits decode() for images that are not complete", async () => {
    const div = document.createElement("div");
    const img = document.createElement("img");
    let decoded = false;
    Object.defineProperty(img, "complete", { value: false, configurable: true });
    Object.defineProperty(img, "decode", {
      value: () =>
        new Promise<void>((resolve) => {
          decoded = true;
          resolve();
        }),
      configurable: true,
    });
    div.appendChild(img);
    await waitForAssets(div);
    expect(decoded).toBe(true);
  });

  it("skips images that are already complete", async () => {
    const div = document.createElement("div");
    const img = document.createElement("img");
    const decode = () => {
      throw new Error("should not be called");
    };
    Object.defineProperty(img, "complete", { value: true, configurable: true });
    Object.defineProperty(img, "decode", { value: decode, configurable: true });
    div.appendChild(img);
    await expect(waitForAssets(div)).resolves.toBeUndefined();
  });
});
