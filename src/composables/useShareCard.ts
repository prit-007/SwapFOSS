import { ref } from "vue";
import type { Category, Tool } from "@/types";
import { PRESETS } from "@/export/presets";
import { toolCardHTML } from "@/export/cards";
import { renderCard } from "@/export/render";

export type ShareResult =
  | { shared: true }
  | { shared: false; reason: "cancelled" | "menu" };

export function useShareCard() {
  const open = ref(false);
  const toolId = ref<string | null>(null);
  const dataUrl = ref("");

  async function share(tool: Tool, cat: Category): Promise<ShareResult> {
    const blob = await renderCard(toolCardHTML(tool, cat, PRESETS.linkedin, false));
    const file = new File([blob], `swapfoss-${tool.id}.png`, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `SwapFOSS — ${tool.id}`,
          text: "Check out this free open-source alternative",
        });
        return { shared: true };
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return { shared: false, reason: "cancelled" };
        }
      }
    }

    dataUrl.value = URL.createObjectURL(blob);
    toolId.value = tool.id;
    open.value = true;
    return { shared: false, reason: "menu" };
  }

  function close() {
    if (dataUrl.value) URL.revokeObjectURL(dataUrl.value);
    open.value = false;
    toolId.value = null;
    dataUrl.value = "";
  }

  return { open, toolId, dataUrl, share, close };
}
