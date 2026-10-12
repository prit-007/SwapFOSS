import { beforeEach, describe, expect, it } from "vitest";
import { useScrollLock } from "./useScrollLock";

describe("useScrollLock", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  it("locks the body scroll when activated", () => {
    const { lock } = useScrollLock();
    lock();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("is idempotent", () => {
    const { lock } = useScrollLock();
    lock();
    lock();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores the previous overflow value on unlock", () => {
    document.body.style.overflow = "scroll";
    const { lock, unlock } = useScrollLock();
    lock();
    expect(document.body.style.overflow).toBe("hidden");
    unlock();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("unlock without lock leaves the body untouched", () => {
    const { unlock } = useScrollLock();
    unlock();
    expect(document.body.style.overflow).toBe("");
  });
});