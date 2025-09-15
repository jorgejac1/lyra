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
  return (
    !!x &&
    typeof x === "object" &&
    "__isSignal" in (x as Record<string, unknown>) &&
    (x as { __isSignal?: unknown }).__isSignal === true
  );
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
        const fromEl = (el as DynEl)[handlerName];
        const fromRoot = (root as DynEl)[handlerName];
        const candidate = (typeof fromEl === "function" ? fromEl : fromRoot) as
          | ((e: Event) => void)
          | undefined;

        if (candidate) {
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

    // Helper to set known DOM props without `any`
    const setDomProp = (
      prop: "value" | "checked" | "disabled" | "ariaLabel",
      nv: unknown,
    ) => {
      switch (prop) {
        case "value": {
          if (el instanceof HTMLInputElement) {
            el.value = nv == null ? "" : String(nv);
          } else if (el instanceof HTMLTextAreaElement) {
            el.value = nv == null ? "" : String(nv);
          } else {
            // fallback: any element we allow to carry a .value property
            (el as unknown as { value?: string }).value =
              nv == null ? "" : String(nv);
          }
          break;
        }
        case "checked": {
          (el as unknown as HTMLInputElement).checked = Boolean(nv);
          break;
        }
        case "disabled": {
          (el as unknown as { disabled: boolean }).disabled = Boolean(nv);
          break;
        }
        case "ariaLabel": {
          (el as unknown as { ariaLabel: string | null }).ariaLabel =
            nv == null ? null : String(nv);
          break;
        }
      }
    };

    // Bind signals via data-* attributes
    (["value", "checked", "disabled", "ariaLabel"] as const).forEach((prop) => {
      const boundKey = el.getAttribute(`data-${prop}`);
      if (!boundKey) return;
      const maybeSignal = (el as DynEl)[boundKey];
      if (isSignal(maybeSignal)) {
        const s = maybeSignal as Signal<unknown>;
        // initial apply
        setDomProp(prop, s.value);
        // subscribe to updates
        s.subscribe?.((nv) => {
          setDomProp(prop, nv);
        });
      }
    });
  } while (walker.nextNode());
}
