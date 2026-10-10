import { ref, readonly } from "vue";
import type { IconName } from "@/icons";

export type ToastTone = "default" | "success" | "error";

export interface Toast {
  id: number;
  message: string;
  icon: IconName;
  tone: ToastTone;
}

const toasts = ref<Toast[]>([]);
let nextId = 1;

/**
 * Tiny global toast queue. State lives at module scope so any component can
 * push a toast and the single <ToastHost> renders them.
 */
export function useToast() {
  function show(
    message: string,
    opts: { icon?: IconName; tone?: ToastTone; duration?: number } = {},
  ): number {
    const id = nextId++;
    const tone = opts.tone ?? "default";
    toasts.value.push({
      id,
      message,
      tone,
      icon: opts.icon ?? (tone === "error" ? "alert-01" : "tick-04"),
    });
    setTimeout(() => dismiss(id), opts.duration ?? 2400);
    return id;
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return { toasts: readonly(toasts), show, dismiss };
}
