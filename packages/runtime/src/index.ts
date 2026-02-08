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

// Batching state
let _batchDepth = 0;
const _pendingEffects: Array<() => void> = [];

/**
 * Batch multiple signal updates so subscribers are notified only once
 * after the outermost `batch()` call completes.
 *
 * Without `batch()`, behavior is unchanged (immediate notification).
 *
 * @param fn - Function containing signal updates to batch.
 */
export function batch(fn: () => void): void {
  _batchDepth++;
  try {
    fn();
  } finally {
    _batchDepth--;
    if (_batchDepth === 0) {
      const effects = _pendingEffects.splice(0);
      effects.forEach((f) => f());
    }
  }
}

/**
 * Create a new {@link Signal}.
 *
 * Uses `Object.is` equality to skip notifications when the value hasn't changed.
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
      if (Object.is(_value, v)) return;
      _value = v;
      if (_batchDepth > 0) {
        listeners.forEach((fn) => _pendingEffects.push(() => fn(v)));
      } else {
        listeners.forEach((fn) => fn(v));
      }
    },
    subscribe(fn: (v: T) => void): Unsubscribe {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };

  return sig;
}

/**
 * Create a derived signal that recomputes when any dependency changes.
 *
 * @typeParam T - The type of the computed value.
 * @param fn - Function that computes the derived value.
 * @param deps - Signals this computed value depends on.
 * @returns A signal whose value updates when dependencies change.
 */
export function computed<T>(fn: () => T, deps: Signal<unknown>[]): Signal<T> {
  const s = signal(fn());
  for (const dep of deps) {
    dep.subscribe?.(() => {
      s.value = fn();
    });
  }
  return s;
}

/**
 * Run a side-effect function whenever any of its dependencies change.
 *
 * @param fn - Side-effect callback to execute. Receives no arguments.
 * @param deps - Signals this effect depends on.
 * @returns An {@link Unsubscribe} function that stops the effect.
 */
export function effect(fn: () => void, deps: Signal<unknown>[]): Unsubscribe {
  const unsubs: Unsubscribe[] = [];
  for (const dep of deps) {
    const unsub = dep.subscribe?.(() => fn());
    if (unsub) unsubs.push(unsub);
  }
  return () => unsubs.forEach((u) => u());
}

/**
 * Keys that must not be looked up via bracket notation on an element
 * to prevent prototype pollution.
 */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Safely read a named property from an element, rejecting unsafe keys.
 */
function safeGet(
  el: HTMLElement & Record<string, unknown>,
  key: string,
): unknown {
  if (UNSAFE_KEYS.has(key)) return undefined;
  return Object.prototype.hasOwnProperty.call(el, key) ? el[key] : undefined;
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
 * @returns A cleanup function that removes all event listeners and signal subscriptions.
 */
export function mount(root: HTMLElement): () => void {
  type DynEl = HTMLElement & Record<string, unknown>;

  const cleanupFns: Array<() => void> = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);

  // Collect all elements first to avoid mutation-during-traversal issues
  const elements: DynEl[] = [];
  do {
    const el = walker.currentNode as DynEl;
    if (el) elements.push(el);
  } while (walker.nextNode());

  for (const el of elements) {
    // Wire events and class toggles declared as attributes
    Array.from(el.attributes).forEach((attr) => {
      // data-on-<event> → addEventListener
      if (attr.name.startsWith("data-on-")) {
        const evt = attr.name.replace("data-on-", "");
        const handlerName = attr.value;
        const fromEl = safeGet(el, handlerName);
        const fromRoot = safeGet(root as DynEl, handlerName);
        const candidate = (typeof fromEl === "function" ? fromEl : fromRoot) as
          | ((e: Event) => void)
          | undefined;

        if (candidate) {
          el.addEventListener(evt, candidate as EventListener);
          // Store cleanup function
          cleanupFns.push(() => {
            el.removeEventListener(evt, candidate as EventListener);
          });
        }
      }

      // data-class-<className> → toggle class based on boolean property
      if (attr.name.startsWith("data-class-")) {
        const cls = attr.name.replace("data-class-", "");
        const boundKey = attr.value;
        const val = safeGet(el, boundKey);
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
      if (UNSAFE_KEYS.has(boundKey)) return;
      const maybeSignal = (el as DynEl)[boundKey];
      if (isSignal(maybeSignal)) {
        const s = maybeSignal as Signal<unknown>;
        // Initial apply
        setDomProp(prop, s.value);
        // Reactive updates
        const unsubscribe = s.subscribe?.((nv) => {
          setDomProp(prop, nv);
        });
        if (unsubscribe) {
          cleanupFns.push(unsubscribe);
        }
      }
    });
  }

  // Return cleanup function that removes all listeners and subscriptions
  return () => {
    cleanupFns.forEach((fn) => fn());
  };
}
