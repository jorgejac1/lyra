import { describe, it, expect, vi } from "vitest";
import { signal, mount, batch, computed, effect } from "./index";
import type { Signal } from "./index";

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

  it("cleanup function removes all listeners and subscriptions", () => {
    const button = document.createElement("button");
    let clickCount = 0;

    setProp(button, "handleClick", () => {
      clickCount++;
    });
    button.setAttribute("data-on-click", "handleClick");

    const input = document.createElement("input");
    const s = signal("initial");
    setProp(input, "val", s);
    input.setAttribute("data-value", "val");

    const container = document.createElement("div");
    container.appendChild(button);
    container.appendChild(input);
    document.body.appendChild(container);

    const cleanup = mount(container);

    // Verify it works
    button.click();
    expect(clickCount).toBe(1);
    expect(input.value).toBe("initial");

    s.value = "updated";
    expect(input.value).toBe("updated");

    // Cleanup
    cleanup();

    button.click();
    expect(clickCount).toBe(1);

    s.value = "after-cleanup";
    expect(input.value).toBe("updated");
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

  it("ignores unsafe keys like __proto__ in data-on-* handlers", () => {
    const div = document.createElement("div");
    div.setAttribute("data-on-click", "__proto__");

    document.body.appendChild(div);
    // Should not throw or access prototype chain
    expect(() => mount(document.body)).not.toThrow();
  });

  it("ignores unsafe keys like constructor in data-value bindings", () => {
    const input = document.createElement("input");
    input.setAttribute("data-value", "constructor");

    document.body.appendChild(input);
    // Should not bind to Object.constructor
    expect(() => mount(document.body)).not.toThrow();
  });

  it("handles signal-like object without subscribe in data-value binding", () => {
    const input = document.createElement("input");
    // Signal-like object without subscribe method
    const fakeSig = { value: "hello", __isSignal: true as const };
    setProp(input, "sig", fakeSig);
    input.setAttribute("data-value", "sig");

    document.body.appendChild(input);
    const cleanup = mount(document.body);

    // Initial value should be applied
    expect(input.value).toBe("hello");

    // Cleanup should not throw
    cleanup();
  });
});

describe("signal equality", () => {
  it("does not notify when setting the same value", () => {
    const s = signal(42);
    const calls: number[] = [];
    s.subscribe?.((v) => calls.push(v));

    s.value = 42;
    expect(calls).toHaveLength(0);

    s.value = 43;
    expect(calls).toEqual([43]);
  });

  it("handles NaN correctly (NaN === NaN with Object.is)", () => {
    const s = signal(NaN);
    const calls: number[] = [];
    s.subscribe?.((v) => calls.push(v));

    // Setting NaN again should not notify (Object.is(NaN, NaN) is true)
    s.value = NaN;
    expect(calls).toHaveLength(0);
  });

  it("distinguishes +0 and -0", () => {
    const s = signal(0);
    const calls: number[] = [];
    s.subscribe?.((v) => calls.push(v));

    // Object.is(+0, -0) is false, so this should notify
    s.value = -0;
    expect(calls).toHaveLength(1);
  });
});

describe("batch", () => {
  it("defers subscriber notifications until batch completes", () => {
    const s = signal(0);
    const calls: number[] = [];
    s.subscribe?.((v) => calls.push(v));

    batch(() => {
      s.value = 1;
      s.value = 2;
      s.value = 3;
      // During batch, no notifications yet
      expect(calls).toHaveLength(0);
    });

    // After batch, all notifications fire
    expect(calls).toEqual([1, 2, 3]);
  });

  it("handles nested batch calls", () => {
    const s = signal(0);
    const calls: number[] = [];
    s.subscribe?.((v) => calls.push(v));

    batch(() => {
      s.value = 1;
      batch(() => {
        s.value = 2;
        expect(calls).toHaveLength(0);
      });
      // Inner batch ended but outer still active
      expect(calls).toHaveLength(0);
      s.value = 3;
    });

    expect(calls).toEqual([1, 2, 3]);
  });

  it("does not affect behavior without batch (backward compat)", () => {
    const s = signal(0);
    const calls: number[] = [];
    s.subscribe?.((v) => calls.push(v));

    s.value = 1;
    expect(calls).toEqual([1]);

    s.value = 2;
    expect(calls).toEqual([1, 2]);
  });
});

describe("computed", () => {
  it("returns correct initial value", () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a.value + b.value, [a, b]);

    expect(sum.value).toBe(5);
  });

  it("updates when dependency changes", () => {
    const a = signal(1);
    const doubled = computed(() => a.value * 2, [a]);

    expect(doubled.value).toBe(2);

    a.value = 5;
    expect(doubled.value).toBe(10);
  });

  it("updates on any dependency change", () => {
    const first = signal("John");
    const last = signal("Doe");
    const full = computed(() => `${first.value} ${last.value}`, [first, last]);

    expect(full.value).toBe("John Doe");

    first.value = "Jane";
    expect(full.value).toBe("Jane Doe");

    last.value = "Smith";
    expect(full.value).toBe("Jane Smith");
  });

  it("notifies its own subscribers", () => {
    const a = signal(1);
    const doubled = computed(() => a.value * 2, [a]);
    const calls: number[] = [];
    doubled.subscribe?.((v) => calls.push(v));

    a.value = 3;
    expect(calls).toEqual([6]);

    a.value = 7;
    expect(calls).toEqual([6, 14]);
  });
});

describe("mount edge cases", () => {
  it("ignores data-class-* when bound value is not boolean", () => {
    const div = document.createElement("div");
    div.setAttribute("data-class-highlight", "myProp");
    setProp(div, "myProp", "string-not-boolean");

    document.body.appendChild(div);
    mount(document.body);

    // Should not add or remove the class since value is not boolean
    expect(div.classList.contains("highlight")).toBe(false);
  });

  it("skips signal binding when data-* value is not a signal", () => {
    const input = document.createElement("input");
    input.setAttribute("data-value", "plainProp");
    setProp(input, "plainProp", "just a string");

    document.body.appendChild(input);
    // Should not throw — just skip because plainProp is not a signal
    expect(() => mount(document.body)).not.toThrow();
    // value should NOT be set to "just a string" because it's not a signal
    expect(input.value).toBe("");
  });

  it("skips signal binding when data-* bound key is unsafe", () => {
    const input = document.createElement("input");
    input.setAttribute("data-value", "prototype");

    document.body.appendChild(input);
    expect(() => mount(document.body)).not.toThrow();
  });
});

describe("effect", () => {
  it("runs callback when dependency changes", () => {
    const s = signal(0);
    const calls: number[] = [];

    effect(() => calls.push(s.value), [s]);

    s.value = 1;
    expect(calls).toEqual([1]);

    s.value = 2;
    expect(calls).toEqual([1, 2]);
  });

  it("returns cleanup that stops the effect", () => {
    const s = signal(0);
    const calls: number[] = [];

    const dispose = effect(() => calls.push(s.value), [s]);

    s.value = 1;
    expect(calls).toEqual([1]);

    dispose();

    s.value = 2;
    expect(calls).toEqual([1]); // no more calls
  });

  it("handles deps without subscribe method", () => {
    // A signal-like object without subscribe (e.g. read-only)
    const fakeDep = { value: 1, __isSignal: true as const } as Signal<unknown>;
    const calls: number[] = [];

    const dispose = effect(() => calls.push(1), [fakeDep]);

    // Should not throw, just skip that dep
    expect(typeof dispose).toBe("function");
    dispose(); // cleanup should not throw
  });

  it("tracks multiple dependencies", () => {
    const a = signal("x");
    const b = signal("y");
    const calls: string[] = [];

    effect(() => calls.push(`${a.value}-${b.value}`), [a, b]);

    a.value = "a";
    expect(calls).toEqual(["a-y"]);

    b.value = "b";
    expect(calls).toEqual(["a-y", "a-b"]);
  });
});
