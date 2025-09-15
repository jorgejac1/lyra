/**
 * Minimal reactive signal and DOM mount utilities.
 * @packageDocumentation
 */

export type Unsubscribe = () => void;

export type Signal<T> = {
  value: T;
  __isSignal: true;
  subscribe?: (fn: (v: T) => void) => Unsubscribe;
};

export function signal<T>(initial: T): Signal<T> {
  let _value = initial;
  const listeners = new Set<(v: T) => void>();

  const sig: Signal<T> = {
    __isSignal: true,
    get value() {
      return _value;
    },
    set value(v: T) {
      _value = v;
      listeners.forEach((fn) => fn(v));
    },
    subscribe(fn: (v: T) => void): Unsubscribe {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  return sig;
}

function isSignal(x: unknown): x is Signal<unknown> {
  return !!x && typeof x === "object" && (x as any).__isSignal === true;
}

/**
 * Walk the DOM and wire Lyra `data-*` directive attributes to real behaviors.
 */
export function mount(root: HTMLElement): void {
  type DynEl = HTMLElement & Record<string, unknown>;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  do {
    const el = walker.currentNode as DynEl;
    if (!el) continue;

    // Wire events
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith("data-on-")) {
        const evt = attr.name.replace("data-on-", "");
        const handlerName = attr.value;
        const candidate = (el as DynEl)[handlerName] ?? (root as DynEl)[handlerName];
        if (typeof candidate === "function") {
          el.addEventListener(evt, candidate as EventListener);
        }
      }

      if (attr.name.startsWith("data-class-")) {
        const cls = attr.name.replace("data-class-", "");
        const boundKey = attr.value;
        const val = (el as DynEl)[boundKey];
        if (typeof val === "boolean") {
          if (val) el.classList.add(cls);
          else el.classList.remove(cls);
        }
      }
    });

    // Bind signals via data-* attributes
    ["value", "checked", "disabled", "ariaLabel"].forEach((prop) => {
      const boundKey = el.getAttribute(`data-${prop}`);
      if (!boundKey) return;
      const maybeSignal = (el as DynEl)[boundKey];
      if (isSignal(maybeSignal)) {
        const s = maybeSignal;
        // initial apply
        (el as any)[prop] =
          prop === "checked" || prop === "disabled" ? Boolean(s.value) : s.value == null ? "" : String(s.value);
        // subscribe
        s.subscribe?.((nv) => {
          (el as any)[prop] =
            prop === "checked" || prop === "disabled" ? Boolean(nv) : nv == null ? "" : String(nv);
        });
      }
    });
  } while (walker.nextNode());
}
