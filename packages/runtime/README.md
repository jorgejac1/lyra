# @lyra-dev/runtime

Minimal reactive runtime for Lyra. Provides signals, computed values, batching, effects, and DOM mounting with zero external dependencies.

## Installation

```bash
pnpm add @lyra-dev/runtime
```

## API

### `signal<T>(initial: T): Signal<T>`

Create a reactive signal. Reading `.value` gets the current value; writing `.value` notifies subscribers.

Uses `Object.is` equality to skip notifications when the value hasn't changed.

```ts
import { signal } from "@lyra-dev/runtime";

const count = signal(0);

console.log(count.value); // 0

count.subscribe?.((v) => console.log("changed:", v));

count.value = 1; // logs "changed: 1"
count.value = 1; // no notification (same value)
```

### `computed<T>(fn: () => T, deps: Signal<unknown>[]): Signal<T>`

Create a derived signal that recomputes when any dependency changes.

```ts
import { signal, computed } from "@lyra-dev/runtime";

const price = signal(10);
const quantity = signal(3);
const total = computed(() => price.value * quantity.value, [price, quantity]);

console.log(total.value); // 30

quantity.value = 5;
console.log(total.value); // 50
```

### `batch(fn: () => void): void`

Batch multiple signal updates so subscribers are notified only after the outermost `batch()` completes. Without `batch()`, notifications fire immediately (backward compatible).

```ts
import { signal, batch } from "@lyra-dev/runtime";

const a = signal(0);
const b = signal(0);

a.subscribe?.((v) => console.log("a:", v));
b.subscribe?.((v) => console.log("b:", v));

batch(() => {
  a.value = 1;
  b.value = 2;
  // No notifications yet
});
// Now both fire: "a: 1", "b: 2"
```

Nested `batch()` calls are supported — notifications fire only after the outermost batch completes.

### `effect(fn: () => void, deps: Signal<unknown>[]): () => void`

Run a side-effect whenever any dependency changes. Returns a cleanup function that stops the effect.

```ts
import { signal, effect } from "@lyra-dev/runtime";

const query = signal("");

const dispose = effect(() => {
  console.log("Search:", query.value);
}, [query]);

query.value = "lyra"; // logs "Search: lyra"

dispose(); // stops the effect
query.value = "test"; // no log
```

### `mount(root: HTMLElement): () => void`

Wire Lyra `data-*` directive attributes under the given root element. Returns a cleanup function that removes all event listeners and signal subscriptions.

#### Supported attributes

| Attribute                | Behavior                                                              |
| ------------------------ | --------------------------------------------------------------------- |
| `data-on-<event>`        | Looks up handler by name on element or root, calls `addEventListener` |
| `data-class-<className>` | Reads boolean property, adds/removes class                            |
| `data-value`             | Binds a `Signal` to `.value` (inputs, textareas, or fallback)         |
| `data-checked`           | Binds a `Signal` to `.checked` (checkboxes, radios)                   |
| `data-disabled`          | Binds a `Signal` to `.disabled`                                       |
| `data-ariaLabel`         | Binds a `Signal` to `.ariaLabel`                                      |

On initial mount, the current signal value is applied. Subsequent updates are propagated via subscription.

```ts
import { signal, mount } from "@lyra-dev/runtime";

const name = signal("world");
const input = document.querySelector("input")!;
input.setAttribute("data-value", "name");
(input as any).name = name;

const cleanup = mount(document.body);

// input.value is now "world"
name.value = "Lyra";
// input.value is now "Lyra"

cleanup(); // removes all listeners and subscriptions
```

## Types

### `Signal<T>`

```ts
type Signal<T> = {
  value: T;
  __isSignal: true;
  subscribe?: (fn: (v: T) => void) => Unsubscribe;
};
```

### `Unsubscribe`

```ts
type Unsubscribe = () => void;
```

## License

[MIT](../../LICENSE)
