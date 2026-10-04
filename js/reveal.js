// Scroll-reveal — adds `.reveal` to [data-reveal] targets and flips them to
// `.is-visible` as they enter the viewport. Content stays visible when JS is
// off (the class is only added here) or when reduced motion is requested.

export function initReveal(root = document) {
  const targets = [...root.querySelectorAll("[data-reveal]")];
  if (!targets.length) return;

  const reduced =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced || typeof IntersectionObserver !== "function") {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
  );

  targets.forEach((el) => {
    el.classList.add("reveal");
    io.observe(el);
  });
}
