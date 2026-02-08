# Compiler

## Passes

1. **Parse**: `ts.createSourceFile(...)` in TSX mode with `ScriptTarget.Latest`.
2. **A11y**: Static accessibility checks (8 rules — see [a11y.md](./a11y.md)).
3. **Transform**: Replace `on:*` and `class:*` directives with `data-*` attributes.
4. **Emit**: Print transformed TSX via `ts.createPrinter()`. Source maps generated when `generateSourceMap: true`.

## CompileOptions

| Option              | Type                          | Default    | Description                           |
| ------------------- | ----------------------------- | ---------- | ------------------------------------- |
| `filename`          | `string`                      | required   | Virtual/real filename for diagnostics |
| `source`            | `string`                      | required   | TSX source code to compile            |
| `a11yLevel`         | `"strict" \| "warn" \| "off"` | `"strict"` | A11y enforcement level                |
| `generateSourceMap` | `boolean`                     | `false`    | Generate V3 source map                |
| `dev`               | `boolean`                     | `true`     | Dev-mode behavior (reserved)          |

## Diagnostics

Each diagnostic includes:

- `code` — Machine-readable identifier (e.g., `LYRA_A11Y_001`, `LYRA_DIRECTIVE_STRING`, `LYRA_PARSE_ERROR`)
- `message` — Human-readable description
- `file` — Source filename
- `start` / `length` — Byte offset and span in source (optional)
- `severity` — `"error"` | `"warn"` | `"info"`
- `hint` — Suggested fix (optional)
- `docUrl` — Link to documentation (optional)

### Transform Diagnostics

The transform pass can also emit diagnostics. Currently:

- **`LYRA_DIRECTIVE_STRING`** (warn) — Fired when a directive like `on:click` or `class:active` uses a string literal instead of an expression. For example, `<button on:click="handleClick">` should be `<button on:click={handleClick}>`. The transform still proceeds, but the diagnostic warns the developer to use the correct syntax.

## Formatting Utilities

The compiler exports formatting helpers for CLI and tooling:

- `formatDiagnostic(d, source?)` — Human-readable diagnostic with location, hint, and doc link
- `formatCodeFrame(source, start, length)` — Codeframe output with line numbers and underline
- `offsetToLineColumn(source, offset)` — Convert byte offset to 1-based line/column

## Source Maps

When `generateSourceMap: true`, the compiler returns a V3 source map with line-level identity mappings. Each output line maps to the corresponding input line, providing accurate line-level debugging.

## Design Choices

- Keep output as TSX for easy integration with existing renderers.
- Favor compile-time analysis for a11y; errors by default.
- Zero external dependencies in the compiler.
