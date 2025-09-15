import { describe, it, expect, vi } from "vitest";
import { signal, mount } from "./index";

type DynEl = HTMLElement & Record<string, unknown>;
const setProp = <T>(el: HTMLElement, key: string, value: T): void => {
  (el as DynEl)[key] = value as unknown;
};

describe("runtime", () => {
  it("binds signal to input.value correctly", () => {
    const input = document.createElement("input");
    const s = signal("foo");
    setProp(input, "boundValue", s);
    input.setAttribute("data-value", "boundValue");

    document.body.appendChild(input);
    mount(document.body);

    expect(input.value).toBe("foo");
    s.value = "bar";
    expect(input.value).toBe("bar");
  });

  it("adds class when boolean is true", () => {
    const div = document.createElement("div");
    div.setAttribute("data-class-active", "flag");
    setProp(div, "flag", true);

    document.body.appendChild(div);
    mount(document.body);

    expect(div.classList.contains("active")).toBe(true);
  });

  it("removes class when boolean is false", () => {
    const div = document.createElement("div");
    div.classList.add("inactive");
    div.setAttribute("data-class-inactive", "flag");
    setProp(div, "flag", false);

    document.body.appendChild(div);
    mount(document.body);

    expect(div.classList.contains("inactive")).toBe(false);
  });

  it("wires up event listeners from data-on-*", () => {
    const button = document.createElement("button");
    // Attach handler function on the element with a precise type
    type WithHandle = HTMLButtonElement & {
      handleClick?: () => void;
      title?: string;
    };
    (button as WithHandle).handleClick = () => {
      (button as WithHandle).title = "clicked";
    };
    button.setAttribute("data-on-click", "handleClick");

    document.body.appendChild(button);
    mount(document.body);

    button.click();
    expect((button as WithHandle).title).toBe("clicked");
  });

  it("falls back to root-scoped handler if not found on element", () => {
    const div = document.createElement("div");
    let called = false;

    setProp(document.body, "rootHandler", () => {
      called = true;
    });
    div.setAttribute("data-on-click", "rootHandler");

    document.body.appendChild(div);
    mount(document.body);

    div.click();
    expect(called).toBe(true);
  });

  it("applies and updates data-value binding", () => {
    const input = document.createElement("input");
    const s = signal("foo");
    setProp(input, "val", s);
    input.setAttribute("data-value", "val");

    document.body.appendChild(input);
    mount(document.body);

    expect(input.value).toBe("foo");

    s.value = "bar";
    expect(input.value).toBe("bar");
  });

  it("handles null on initial apply and subscribe for data-value", () => {
    const input = document.createElement("input");
    const s = signal<string | null>(null);
    setProp(input, "val", s);
    input.setAttribute("data-value", "val");

    document.body.appendChild(input);
    mount(document.body);

    expect(input.value).toBe("");

    s.value = "hello";
    expect(input.value).toBe("hello");

    s.value = null;
    expect(input.value).toBe("");
  });

  it("applies and updates data-checked binding", () => {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    const s = signal(true);
    setProp(checkbox, "c", s);
    checkbox.setAttribute("data-checked", "c");

    document.body.appendChild(checkbox);
    mount(document.body);

    expect(checkbox.checked).toBe(true);

    s.value = false;
    expect(checkbox.checked).toBe(false);
  });

  it("applies and updates data-disabled binding", () => {
    const button = document.createElement("button");
    const s = signal(true);
    setProp(button, "d", s);
    button.setAttribute("data-disabled", "d");

    document.body.appendChild(button);
    mount(document.body);

    expect(button.disabled).toBe(true);

    s.value = false;
    expect(button.disabled).toBe(false);
  });

  it("applies and updates data-ariaLabel binding", () => {
    const div = document.createElement("div");
    const s = signal("label1");
    setProp(div, "lab", s);
    div.setAttribute("data-ariaLabel", "lab");

    document.body.appendChild(div);
    mount(document.body);

    expect(div.ariaLabel).toBe("label1");

    s.value = "label2";
    expect(div.ariaLabel).toBe("label2");
  });

  it("covers the `if (!el) continue;` branch", () => {
    const root = document.createElement("div");
    document.body.appendChild(root);

    // Minimal fake TreeWalker; cast via unknown (not `any`)
    const fakeWalker = {
      currentNode: null,
      nextNode: vi.fn(() => false),
    } as unknown as TreeWalker;

    const spy = vi
      .spyOn(document, "createTreeWalker")
      .mockReturnValue(fakeWalker);

    expect(() => mount(root)).not.toThrow();

    spy.mockRestore();
  });

  it("applies data-value on <textarea> (covers the textarea branch)", () => {
    const ta = document.createElement("textarea");
    const s = signal("foo");
    setProp(ta, "txt", s);
    ta.setAttribute("data-value", "txt");

    document.body.appendChild(ta);
    mount(document.body);

    // initial apply uses textarea.value
    expect(ta.value).toBe("foo");

    // null → "" (coercion)
    s.value = null as unknown as string;
    expect(ta.value).toBe("");

    // update to a string
    s.value = "bar";
    expect(ta.value).toBe("bar");
  });

  it("applies data-value on an element without native value (covers fallback)", () => {
    const span = document.createElement("span");
    const s = signal("hi");
    setProp(span, "val", s);
    span.setAttribute("data-value", "val");

    document.body.appendChild(span);
    mount(document.body);

    // fallback assigns a plain property { value?: string }
    type HasValue = HTMLElement & { value?: string };
    expect((span as HasValue).value).toBe("hi");

    s.value = null as unknown as string;
    expect((span as HasValue).value).toBe("");

    s.value = "there";
    expect((span as HasValue).value).toBe("there");
  });

  it("applies data-value on <textarea> (covers textarea branch)", () => {
    const ta = document.createElement("textarea");
    const s = signal("foo");
    setProp(ta, "txt", s);
    ta.setAttribute("data-value", "txt");

    document.body.appendChild(ta);
    mount(document.body);

    expect(ta.value).toBe("foo");
    s.value = null as unknown as string;
    expect(ta.value).toBe("");
    s.value = "bar";
    expect(ta.value).toBe("bar");
  });

  it("sets ariaLabel to null when signal is null", () => {
    const div = document.createElement("div");
    const s = signal<string | null>("label1");
    setProp(div, "lab", s);
    div.setAttribute("data-ariaLabel", "lab");

    document.body.appendChild(div);
    mount(document.body);

    expect(div.ariaLabel).toBe("label1");
    s.value = null;
    expect(div.ariaLabel).toBeNull();
  });
});
