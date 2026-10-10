import { describe, expect, it } from "vitest";
import { iconSvg } from "./icon";

describe("iconSvg", () => {
  it("renders an inline svg using the shared 24x24 viewBox", () => {
    const svg = iconSvg("arrow-right-01");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('viewBox="0 0 24 24"');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain("<path");
  });

  it("applies a custom size and colour", () => {
    const svg = iconSvg("tick-04", { size: 22, color: "#FF5A5F" });
    expect(svg).toContain('width="22"');
    expect(svg).toContain('height="22"');
    expect(svg).toContain("color:#FF5A5F");
  });

  it("overrides the default stroke width only when asked", () => {
    expect(iconSvg("tick-04")).toContain('stroke-width="1.5"');
    expect(iconSvg("tick-04", { stroke: 2 })).toContain('stroke-width="2"');
    expect(iconSvg("tick-04", { stroke: 2 })).not.toContain('stroke-width="1.5"');
  });

  it("degrades gracefully for an unknown icon name", () => {
    // @ts-expect-error deliberately invalid name
    const svg = iconSvg("does-not-exist");
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<path");
  });
});
