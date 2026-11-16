import { onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter } from "vue";

/**
 * Fit a fixed-size export card into the available width by scaling
 * a wrapper element. The card node itself is never transformed, so PNG export
 * via html-to-image stays pixel-accurate. Supports dynamic width/height presets.
 */
export function usePreviewScale(
  naturalWidth: MaybeRefOrGetter<number> = 1080,
  naturalHeight: MaybeRefOrGetter<number> = 1350,
) {
  const stage = ref<HTMLElement | null>(null);
  const scale = ref(1);

  function measure() {
    const el = stage.value;
    if (!el) return;
    const available = el.clientWidth;
    const w = toValue(naturalWidth);
    if (available > 0 && w > 0) scale.value = Math.min(1, available / w);
  }

  let observer: ResizeObserver | null = null;

  onMounted(() => {
    measure();
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      if (stage.value) observer.observe(stage.value);
    }
    window.addEventListener("resize", measure);
  });

  watch([() => toValue(naturalWidth), () => toValue(naturalHeight)], () => {
    measure();
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    window.removeEventListener("resize", measure);
  });

  const frameStyle = () => ({
    transform: `scale(${scale.value})`,
    transformOrigin: "top left",
  });
  const stageStyle = () => ({
    height: `${toValue(naturalHeight) * scale.value}px`,
  });

  return { stage, scale, frameStyle, stageStyle };
}
