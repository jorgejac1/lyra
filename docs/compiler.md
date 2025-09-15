# Compiler

## Passes
1. Parse: `ts.createSourceFile(...)` (TSX).
2. A11y: Static checks (first rule: accessible name for common interactive controls).
3. Transform: Replace `on:*` and `class:*` with `data-*` attrs.
4. Emit: Print transformed TSX; (TODO) source maps.

## Design Choices
- Keep output as TSX initially for easy integration with existing renderers.
- Favor compile‑time analysis for a11y; errors by default.
