import type { Directive } from "vue";

// Scroll-reveal — adds `.reveal` to v-reveal targets and flips them to
// `.is-visible` as they enter the viewport. Content stays visible when
// reduced motion is requested or IntersectionObserver is unavailable.
//
// Paired with the `.reveal` rules in css/styles.css.

const OBSERVED = new WeakMap<Element, IntersectionObserver>();

function revealNow(el: Element) {
  el.classList.add("reveal", "is-visible");
}

const reveal: Directive<Element> = {
  mounted(el) {
    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof IntersectionObserver !== "function") {
      revealNow(el);
      return;
    }

    el.classList.add("reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.08 },
    );
    io.observe(el);
    OBSERVED.set(el, io);
  },
  unmounted(el) {
    OBSERVED.get(el)?.disconnect();
    OBSERVED.delete(el);
  },
};

export default reveal;
