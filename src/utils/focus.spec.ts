import { beforeEach, describe, expect, it } from "vitest";
import { getFocusables, trapTabKeydown } from "./focus";

function key(type: "forward" | "back"): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey: type === "back",
    bubbles: true,
    cancelable: true,
  });
}

// jsdom's id lookups break when the same id exists twice in one document,
// so make sure each test starts with a fresh body.
beforeEach(() => {
  document.body.innerHTML = "";
});

describe("getFocusables", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.innerHTML = `
      <button id="close">close</button>
      <a href="#x">link</a>
      <input />
      <select><option>a</option></select>
      <button disabled>disabled</button>
      <span>not focusable</span>
      <div tabindex="-1">skip</div>
      <button tabindex="4">custom</button>
    `;
    document.body.appendChild(root);
  });

  it("collects focusable elements in DOM order, skipping disabled and tabindex -1", () => {
    const ids = getFocusables(root).map((el) => el.id || el.tagName);
    expect(ids).toEqual(["close", "A", "INPUT", "SELECT", "BUTTON"]);
  });

  it("handles an empty dialog by focusing the root", () => {
    const empty = document.createElement("div");
    document.body.appendChild(empty);
    const e = key("forward");
    trapTabKeydown(e, empty);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(empty);
  });
});

describe("trapTabKeydown", () => {
  let root: HTMLElement;
  let first: HTMLElement;
  let last: HTMLElement;

  beforeEach(() => {
    root = document.createElement("div");
    root.innerHTML = `<button id="a">a</button><button id="b">b</button><button id="c">c</button>`;
    document.body.appendChild(root);
    first = root.querySelector("#a")!;
    last = root.querySelector("#c")!;
  });

  it("does nothing for non-Tab keys", () => {
    const e = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    trapTabKeydown(e, root);
    expect(e.defaultPrevented).toBe(false);
  });

  it("wraps forward from the last element to the first", () => {
    last.focus();
    const e = key("forward");
    trapTabKeydown(e, root);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });

  it("wraps backward from the first element to the last", () => {
    first.focus();
    const e = key("back");
    trapTabKeydown(e, root);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(last);
  });

  it("lets Tab pass through in the middle of the list", () => {
    const mid = root.querySelector<HTMLElement>("#b")!;
    mid.focus();
    const e = key("forward");
    trapTabKeydown(e, root);
    expect(e.defaultPrevented).toBe(false);
  });

  it("directs focus to the first item when focus is outside", () => {
    document.body.querySelector<HTMLElement>("#a")!.blur();
    document.body.focus();
    const e = key("forward");
    trapTabKeydown(e, root);
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(first);
  });
});