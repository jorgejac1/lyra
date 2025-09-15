/**
 * Minimal reactive signal and DOM mount utilities.
 * @packageDocumentation
 */

/**
 * Function returned by {@link Signal.subscribe} to unsubscribe a listener.
 */
export type Unsubscribe = () => void;

/**
 * A minimal reactive container that stores a value of type `T` and can notify subscribers.
 *
 * @typeParam T - The type of the stored value.
 * @property value - The current value. Assigning to this property notifies subscribers.
 * @property __isSignal - Internal brand used by runtime type guards.
 * @property subscribe - Optional method to observe changes. Returns an {@link Unsubscribe}.
 */
export type Signal<T> = {
  value: T;
  __isSignal: true;
  subscribe?: (fn: (v: T) => void) => Unsubscribe;
};

/**
 * Create a new {@link Signal}.
 *
 * @typeParam T - The type of the initial value.
 * @param initial - Initial value for the signal.
 * @returns A signal carrying the provided value.
 */
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

/**
 * Type guard for {@link Signal}.
 *
 * @param x - Unknown value to test.
 * @returns `true` if `x` is a signal produced by {@link signal}.
 */
function isSignal(x: unknown): x is Signal<unknown> {
  return (
    !!x &&
    typeof x === "object" &&
    "__isSignal" in (x as Record<string, unknown>) &&
    (x as { __isSignal?: unknown }).__isSignal === true
  );
}

/**
 * Wire Lyra `data-*` directive attributes under the given `root` element.
 *
 * Supported attributes on elements found within `root`:
 *
 * - **Events**: `data-on-<event>`
 *   Looks up a handler function by name on the element or on `root`, then calls
 *   `addEventListener("<event>", handler)`.
 *
 * - **Classes**: `data-class-<className>`
 *   Reads a boolean property from the element (by the attribute value) and
 *   adds/removes `<className>` accordingly.
 *
 * - **Bindings (Signals)**:
 *   - `data-value` → binds a {@link Signal} to `.value` (for inputs, textareas, or a fallback property)
 *   - `data-checked` → binds a {@link Signal} to `.checked` (checkboxes/radios)
 *   - `data-disabled` → binds a {@link Signal} to `.disabled`
 *   - `data-ariaLabel` → binds a {@link Signal} to `.ariaLabel`
 *
 * On initial mount, the current signal value is applied. Subsequent updates are
 * propagated by subscribing to the signal.
 *
 * @param root - Root DOM node whose subtree will be scanned and wired.
 */
export function mount(root: HTMLElement): void {
  type DynEl = HTMLElement & Record<string, unknown>;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  do {
    const el = walker.currentNode as DynEl;
    if (!el) continue;

    // Wire events and class toggles declared as attributes
    Array.from(el.attributes).forEach((attr) => {
      // data-on-<event> → addEventListener
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

      // data-class-<className> → toggle class based on boolean property
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

    /**
     * Assign supported DOM properties with proper coercion, without using `any`.
     *
     * @param prop - One of the supported DOM properties: "value" | "checked" | "disabled" | "ariaLabel".
     * @param nv - New value to assign (from the signal).
     */
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
            // Fallback: allow generic elements to carry a `.value` string
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

    // Bind signals declared via data-* attributes
    (["value", "checked", "disabled", "ariaLabel"] as const).forEach((prop) => {
      const boundKey = el.getAttribute(`data-${prop}`);
      if (!boundKey) return;
      const maybeSignal = (el as DynEl)[boundKey];
      if (isSignal(maybeSignal)) {
        const s = maybeSignal as Signal<unknown>;
        // Initial apply
        setDomProp(prop, s.value);
        // Reactive updates
        s.subscribe?.((nv) => {
          setDomProp(prop, nv);
        });
      }
    });
  } while (walker.nextNode());
}
