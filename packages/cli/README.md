# @lyra-dev/cli

Command-line tool for compiling Lyra files and running accessibility checks.

## Installation

```bash
pnpm add -D @lyra-dev/cli
```

Or run directly:

```bash
npx @lyra-dev/cli compile src/app.lyra.tsx
```

## Commands

### `lyra compile <file> [output]`

Compile a `.lyra.tsx` file to standard TSX.

```bash
# Output to src/app.tsx (replaces .lyra.tsx with .tsx)
lyra compile src/app.lyra.tsx

# Output to a custom path
lyra compile src/app.lyra.tsx dist/app.tsx
```

Displays a diagnostic summary if any issues are found:

```
Lyra: 2 diagnostics (1 error)
Emitted: src/app.tsx
```

### `lyra a11y-check <file>`

Run accessibility checks without compiling. Outputs formatted diagnostics with codeframes.

```bash
lyra a11y-check src/app.lyra.tsx
```

Example output:

```
error LYRA_A11Y_002: <img> is missing an alt attribute.
  --> src/app.lyra.tsx:5:10
  hint: Add alt="description" to describe the image, or alt="" for decorative images.
  docs: https://lyra.dev/docs/a11y#LYRA_A11Y_002

  3 | <div>
> 4 |   <img src="/logo.png" />
      ^^^^^^^^^^^^^^^^^^^^^^^^
  5 | </div>

Found 1 issue(s) (1 error).
```

### Backward Compatibility

Passing a `.lyra.tsx` or `.lyra.ts` file directly (without a subcommand) is treated as `compile`:

```bash
lyra src/app.lyra.tsx
# equivalent to: lyra compile src/app.lyra.tsx
```

## Exit Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| `0`  | Success (no errors, warnings are OK) |
| `1`  | Errors found or invalid usage        |

## License

[MIT](../../LICENSE)
