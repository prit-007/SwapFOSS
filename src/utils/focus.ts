const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Focusable elements inside a dialog, in DOM order. */
export function getFocusables(root: HTMLElement): HTMLElement[] {
  const els = root.querySelectorAll<HTMLElement>(FOCUSABLE);
  return [...new Set(els)].sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
}

/**
 * Keeps Tab/Shift+Tab cycling within a modal dialog. Call it from a keydown
 * listener; it only acts on Tab keys and wraps focus at the boundaries.
 */
export function trapTabKeydown(e: KeyboardEvent, root: HTMLElement): void {
  if (e.key !== "Tab") return;
  const focusables = getFocusables(root);
  if (!focusables.length) {
    e.preventDefault();
    root.tabIndex = -1;
    root.focus();
    return;
  }
  const active = document.activeElement as HTMLElement | null;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const inside = active !== null && focusables.includes(active);

  if (!inside) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
    return;
  }
  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}