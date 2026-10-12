/** Locks the body scroll while a modal is open and restores it on close. */
export function useScrollLock() {
  let active = false;
  let previous = "";

  function lock() {
    if (active) return;
    active = true;
    previous = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";
  }

  function unlock() {
    if (!active) return;
    active = false;
    document.body.style.overflow = previous;
  }

  return { lock, unlock };
}