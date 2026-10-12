import { describe, expect, it } from "vitest";
import { formatStars } from "./formatStars";

describe("formatStars", () => {
  it("returns plain numbers under 1000", () => {
    expect(formatStars(0)).toBe("0");
    expect(formatStars(42)).toBe("42");
    expect(formatStars(999)).toBe("999");
  });

  it("formats thousands with one decimal below 10k", () => {
    expect(formatStars(1000)).toBe("1k");
    expect(formatStars(1800)).toBe("1.8k");
    expect(formatStars(9999)).toBe("10k");
  });

  it("rounds 10k+ to whole k", () => {
    expect(formatStars(10_000)).toBe("10k");
    expect(formatStars(99_500)).toBe("100k");
    expect(formatStars(123_456)).toBe("123k");
  });

  it("formats millions with one decimal", () => {
    expect(formatStars(1_000_000)).toBe("1M");
    expect(formatStars(1_200_000)).toBe("1.2M");
    expect(formatStars(115_959_000)).toBe("116M");
  });
});