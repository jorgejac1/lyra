# Lyra

[![CI](https://github.com/jorgejac1/lyra-dev/actions/workflows/test.yml/badge.svg)](https://github.com/jorgejac1/lyra-dev/actions)
[![npm version](https://img.shields.io/npm/v/@lyra-dev/compiler.svg)](https://www.npmjs.com/package/@lyra-dev/compiler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> A compile-time, a11y-first, signal-driven front-end framework.

---

## Features

- **Zero VDOM** — signals update DOM nodes directly, no virtual DOM diffing.
- **Accessibility-first** — 8 compile-time a11y rules catch missing labels, alt text, and more before your code ships.
- **Signal-driven reactivity** — `signal()`, `computed()`, `batch()`, and `effect()` for fine-grained updates.
- **Vite plugin** — `.lyra.tsx` files compile on the fly with hot reload and error overlay.
- **CLI tooling** — `lyra compile` and `lyra a11y-check` for standalone builds and audits.
- **Source maps** — V3 source map generation for accurate debugging.
- **Zero runtime dependencies** — compiler and runtime have no external dependencies.

---

## Installation

```bash
# Compiler + runtime + Vite plugin (typical setup)
pnpm add @lyra-dev/compiler @lyra-dev/runtime @lyra-dev/vite-plugin

# CLI (optional, for standalone compilation)
pnpm add -D @lyra-dev/cli
```

---

## Quick Start

### 1. Configure Vite

```ts
// vite.config.ts
import { defineConfig } from "vite";
import lyra from "@lyra-dev/vite-plugin";

export default defineConfig({
  plugins: [lyra()],
});
```

### 2. Write a Lyra component

```tsx
// src/counter.lyra.tsx
import { signal, mount } from "@lyra-dev/runtime";

const count = signal(0);

export default function Counter() {
  return (
    <div>
      <button on:click={() => count.value++} aria-label="Increment">
        Count: {count.value}
      </button>
      <img src="/logo.png" alt="App logo" />
    </div>
  );
}
```

The compiler transforms `on:click` into `data-on-click` and enforces that `<button>` has an accessible label and `<img>` has `alt` text — all at compile time.

### 3. Run

```bash
pnpm vite dev
```

---

## Packages

| Package                                            | Description                                                   | Docs                                       |
| -------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------ |
| [`@lyra-dev/compiler`](./packages/compiler/)       | TypeScript transformer for directives and a11y rules          | [README](./packages/compiler/README.md)    |
| [`@lyra-dev/runtime`](./packages/runtime/)         | Signals, computed values, batching, effects, and DOM mounting | [README](./packages/runtime/README.md)     |
| [`@lyra-dev/vite-plugin`](./packages/vite-plugin/) | Vite integration with hot reload and error overlay            | [README](./packages/vite-plugin/README.md) |
| [`@lyra-dev/cli`](./packages/cli/)                 | CLI for `lyra compile` and `lyra a11y-check`                  | [README](./packages/cli/README.md)         |

---

## Directives

Lyra uses JSX directives that the compiler transforms into `data-*` attributes:

| Directive                  | Compiled output     | Purpose                  |
| -------------------------- | ------------------- | ------------------------ |
| `on:<event>={handler}`     | `data-on-<event>`   | Event binding            |
| `class:<name>={condition}` | `data-class-<name>` | Conditional class toggle |

---

## A11y Rules

The compiler enforces 8 accessibility rules at compile time:

| Code            | Rule                                                   |
| --------------- | ------------------------------------------------------ |
| `LYRA_A11Y_001` | Interactive controls must have an accessible name      |
| `LYRA_A11Y_002` | `<img>` must have an `alt` attribute                   |
| `LYRA_A11Y_003` | `<button>` must have visible text or accessible label  |
| `LYRA_A11Y_004` | Form controls with `id` must have a matching `<label>` |
| `LYRA_A11Y_005` | `<a>` must have an `href` attribute                    |
| `LYRA_A11Y_006` | `tabindex` must not be greater than 0                  |
| `LYRA_A11Y_007` | Headings (`<h1>`-`<h6>`) must not be empty             |
| `LYRA_A11Y_008` | `<iframe>` must have a `title` attribute               |

See [docs/a11y.md](./docs/a11y.md) for full details with pass/fail examples and WCAG references.

---

## CLI

```bash
# Compile a single file
lyra compile src/app.lyra.tsx

# Compile with custom output path
lyra compile src/app.lyra.tsx dist/app.tsx

# Run accessibility checks only
lyra a11y-check src/app.lyra.tsx
```

See the [CLI README](./packages/cli/README.md) for details.

---

## Documentation

- [Architecture](./docs/architecture.md) — how the compiler pipeline works
- [Compiler](./docs/compiler.md) — `CompileOptions`, diagnostics, source maps
- [Accessibility Rules](./docs/a11y.md) — all 8 rules with WCAG references
- [Roadmap](./docs/roadmap.md) — planned features

---

## Comparisons

| Feature       | **Lyra**                     | React           | Svelte       | SolidJS        |
| ------------- | ---------------------------- | --------------- | ------------ | -------------- |
| Rendering     | Signals to DOM (no VDOM)     | VDOM diff       | Compile-time | Signals to DOM |
| Accessibility | **Enforced at compile time** | Optional (lint) | Optional     | Optional       |
| Bundle Size   | Small by default             | Larger          | Small        | Small          |
| DX Speed      | Fast (Vite + signals)        | Medium          | Fast         | Very fast      |

---

## Development

```bash
git clone https://github.com/jorgejac1/lyra-dev.git
cd lyra-dev
pnpm install

# Run tests
pnpm test

# Lint
pnpm run lint

# Type check
pnpm run typecheck

# Build all packages
pnpm run build
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and guidelines.

---

## License

[MIT](./LICENSE)
