# @lyra-dev/vite-plugin

Vite plugin for Lyra. Transforms `.lyra.tsx` and `.lyra.ts` modules at build time, forwarding compiler diagnostics to Vite's dev server and error overlay.

## Installation

```bash
pnpm add @lyra-dev/vite-plugin @lyra-dev/compiler @lyra-dev/runtime
```

**Peer dependency:** Vite ^5.4.20, ^6.0.0, or ^7.0.0

## Setup

```ts
// vite.config.ts
import { defineConfig } from "vite";
import lyra from "@lyra-dev/vite-plugin";

export default defineConfig({
  plugins: [lyra()],
});
```

That's it. Any file ending in `.lyra.tsx` or `.lyra.ts` will be compiled by Lyra automatically.

## Options

Pass options to customize behavior:

```ts
lyra({
  a11yLevel: "warn",
  include: [/src\//],
  exclude: /node_modules/,
});
```

### `LyraPluginOptions`

| Option      | Type                          | Default             | Description                                   |
| ----------- | ----------------------------- | ------------------- | --------------------------------------------- |
| `a11yLevel` | `"strict" \| "warn" \| "off"` | `"strict"`          | A11y enforcement level passed to the compiler |
| `include`   | `RegExp \| string[]`          | all `.lyra.tsx/.ts` | Only transform files matching this pattern    |
| `exclude`   | `RegExp \| string[]`          | `/node_modules/`    | Skip files matching this pattern              |

## What It Does

1. **Transforms directives** — `on:click={fn}` becomes `data-on-click={fn}`, `class:active={bool}` becomes `data-class-active={bool}`.

2. **Runs a11y checks** — The compiler's 8 accessibility rules run during transformation. Errors appear in Vite's error overlay with line/column positions.

3. **Auto-injects runtime** — If the compiled output uses `signal` or `mount`, the plugin prepends `import { mount, signal } from '@lyra-dev/runtime'`.

4. **Source maps** — The plugin requests source maps from the compiler and passes them to Vite for accurate debugging.

5. **Runtime detection** — On `buildStart`, the plugin checks if `@lyra-dev/runtime` is installed and warns if it's missing.

6. **Import validation** — Warns if your code imports from unknown `@lyra-dev/*` packages.

## Diagnostics

Compiler diagnostics are forwarded to Vite:

- **Errors** (`severity: "error"`) call `this.error()` with structured location data for the error overlay.
- **Warnings** (`severity: "warn"`) call `this.warn()` and appear in the terminal.

## Example

```tsx
// src/greeting.lyra.tsx
export default function Greeting() {
  return (
    <div>
      <h1>Hello, Lyra!</h1>
      <button on:click={() => alert("hi")} aria-label="Greet">
        Click me
      </button>
    </div>
  );
}
```

Compile errors (missing `alt`, empty headings, etc.) show up directly in the browser overlay during development.

## License

[MIT](../../LICENSE)
