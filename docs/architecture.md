# Architecture

- Authoring: TSX with Lyra directives (`on:*`, `class:*`).
- Compiler: TypeScript transformer pass → emits TSX with `data-*` attributes + diagnostics.
- Runtime: Binds signals to DOM properties and toggles classes; minimal event wiring.
- Vite plugin: Runs compiler on `.lyra.tsx` files; surfaces diagnostics in dev/build.
- Example app: Uses Preact just to mount the compiled TSX. Future: pure DOM emission.
