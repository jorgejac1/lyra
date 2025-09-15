import { describe, it, expect, vi } from "vitest";
import { signal, mount } from "./index";

describe("runtime", () => {
  it("binds signal to input.value correctly", () => {
    const input = document.createElement("input");
    const s = signal("foo");
    (input as any).boundValue = s;
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
    (div as any).flag = true;

    document.body.appendChild(div);
    mount(document.body);

    expect(div.classList.contains("active")).toBe(true);
  });

  it("removes class when boolean is false", () => {
    const div = document.createElement("div");
    div.classList.add("inactive");
    div.setAttribute("data-class-inactive", "flag");
    (div as any).flag = false;

    document.body.appendChild(div);
    mount(document.body);

    expect(div.classList.contains("inactive")).toBe(false);
  });

  it("wires up event listeners from data-on-*", () => {
    const button = document.createElement("button");
    let called = false;

    (button as any).handleClick = () => {
      called = true;
    };
    button.setAttribute("data-on-click", "handleClick");

    document.body.appendChild(button);
    mount(document.body);

    button.click();
    expect(called).toBe(true);
  });

  it("falls back to root-scoped handler if not found on element", () => {
    const div = document.createElement("div");
    let called = false;

    (document.body as any).rootHandler = () => {
      called = true;
    };
    div.setAttribute("data-on-click", "rootHandler");

    document.body.appendChild(div);
    mount(document.body);

    div.click();
    expect(called).toBe(true);
  });

  it("applies and updates data-value binding", () => {
    const input = document.createElement("input");
    const s = signal("foo");
    (input as any).val = s;
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
    (input as any).val = s;
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
    (checkbox as any).c = s;
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
    (button as any).d = s;
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
    (div as any).lab = s;
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

    const fakeWalker: any = {
      currentNode: null,
      nextNode: vi.fn(() => false),
    };

    const spy = vi.spyOn(document, "createTreeWalker").mockReturnValue(fakeWalker);

    expect(() => mount(root)).not.toThrow();

    spy.mockRestore();
  });
});
