# @lyra-dev/compiler

The Lyra compiler parses TSX source, runs accessibility checks, transforms Lyra directives (`on:*`, `class:*`) into `data-*` attributes, and emits the result with optional source maps.

## Installation

```bash
pnpm add @lyra-dev/compiler
```

**Peer dependency:** TypeScript >= 5.0.0

## Usage

```ts
import { compile } from "@lyra-dev/compiler";

const result = compile({
  filename: "app.lyra.tsx",
  source: `<button on:click={handleClick} aria-label="Save">Save</button>`,
  a11yLevel: "strict",
  generateSourceMap: true,
});

console.log(result.code);
// <button data-on-click={handleClick} aria-label="Save">Save</button>

console.log(result.diagnostics);
// [] (no issues)

console.log(result.meta);
// { symbols: [], islands: false, a11yErrors: 0, transformed: true }
```

## API

### `compile(options: CompileOptions): CompileResult`

Main entry point. Parses, checks accessibility, transforms directives, and emits code.

#### `CompileOptions`

| Option              | Type                          | Default    | Description                           |
| ------------------- | ----------------------------- | ---------- | ------------------------------------- |
| `filename`          | `string`                      | required   | Virtual/real filename for diagnostics |
| `source`            | `string`                      | required   | TSX source code to compile            |
| `a11yLevel`         | `"strict" \| "warn" \| "off"` | `"strict"` | A11y enforcement level                |
| `generateSourceMap` | `boolean`                     | `false`    | Generate V3 source map                |
| `dev`               | `boolean`                     | `true`     | Dev-mode behavior (reserved)          |

#### `CompileResult`

```ts
{
  code: string;              // Emitted code
  map: SourceMap | null;     // V3 source map (when requested)
  diagnostics: Diagnostic[]; // All diagnostics (a11y, parse, transform)
  meta: {
    symbols: string[];       // Reserved
    islands: boolean;        // Reserved
    a11yErrors: number;      // Count of error-severity diagnostics
    transformed: boolean;    // Whether any transform occurred
  };
}
```

### `Diagnostic`

```ts
{
  code: string;         // e.g. "LYRA_A11Y_001", "LYRA_PARSE_ERROR"
  message: string;      // Human-readable description
  file: string;         // Source filename
  start?: number;       // Byte offset in source
  length?: number;      // Span length
  severity: "error" | "warn" | "info";
  hint?: string;        // Suggested fix
  docUrl?: string;      // Link to documentation
}
```

### `runA11yChecks(sf, filename, level): Diagnostic[]`

Run accessibility checks independently (used by the CLI `a11y-check` command).

```ts
import { parseSourceFile, runA11yChecks } from "@lyra-dev/compiler";

const sf = parseSourceFile("app.tsx", source);
const diags = runA11yChecks(sf, "app.tsx", "strict");
```

## Formatting Utilities

### `formatDiagnostic(d: Diagnostic, source?: string): string`

Format a diagnostic into a human-readable string with location, hint, and doc link.

```
error LYRA_A11Y_002: <img> is missing an alt attribute.
  --> app.tsx:5:10
  hint: Add alt="description" to describe the image.
  docs: https://lyra.dev/docs/a11y#LYRA_A11Y_002
```

### `formatCodeFrame(source, start, length, contextLines?): string`

Generate a codeframe highlighting a span in source code.

```
  3 | <div>
> 4 |   <img src="/logo.png" />
      ^^^^^^^^^^^^^^^^^^^^^^^^
  5 | </div>
```

### `offsetToLineColumn(source, offset): { line, column }`

Convert a byte offset to 1-based line and column numbers.

## A11y Rules

The compiler enforces 8 accessibility rules. See [docs/a11y.md](../../docs/a11y.md) for full details.

| Code            | Rule                                      |
| --------------- | ----------------------------------------- |
| `LYRA_A11Y_001` | Interactive controls need accessible name |
| `LYRA_A11Y_002` | `<img>` needs `alt`                       |
| `LYRA_A11Y_003` | `<button>` needs text or label            |
| `LYRA_A11Y_004` | Form controls need matching `<label>`     |
| `LYRA_A11Y_005` | `<a>` needs `href`                        |
| `LYRA_A11Y_006` | `tabindex` must not be > 0                |
| `LYRA_A11Y_007` | Headings must not be empty                |
| `LYRA_A11Y_008` | `<iframe>` needs `title`                  |

## Source Maps

When `generateSourceMap: true`, the compiler returns a V3 source map with line-level identity mappings. Each output line maps to the corresponding input line.

```ts
const result = compile({
  filename: "app.lyra.tsx",
  source,
  generateSourceMap: true,
});

// result.map is a SourceMap: { version: 3, file, sources, sourcesContent, mappings }
```

## License

[MIT](../../LICENSE)
