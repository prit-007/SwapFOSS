import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * Fit a fixed-size export card (1080×1350) into the available width by scaling
 * a wrapper element. The card node itself is never transformed, so PNG export
 * via html-to-image stays pixel-accurate.
 */
export function usePreviewScale(naturalWidth = 1080, naturalHeight = 1350) {
  const stage = ref<HTMLElement | null>(null);
  const scale = ref(1);

  function measure() {
    const el = stage.value;
    if (!el) return;
    const available = el.clientWidth;
    if (available > 0) scale.value = Math.min(1, available / naturalWidth);
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

  onBeforeUnmount(() => {
    observer?.disconnect();
    window.removeEventListener("resize", measure);
  });

  const frameStyle = () => ({
    transform: `scale(${scale.value})`,
    transformOrigin: "top left",
  });
  const stageStyle = () => ({ height: `${naturalHeight * scale.value}px` });

  return { stage, scale, frameStyle, stageStyle };
}
