# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Pre-commit hooks with Husky and lint-staged.
- TypeScript project references for packages.
- Initial JSDoc comments across compiler, runtime, and vite-plugin.
- GitHub Actions workflow for linting, typecheck, and tests with coverage.

### Changed

- Compiler now supports env override `LYRA_A11Y=off` to disable accessibility checks.
- Runtime `mount` refactored to remove all `any` usages and cover edge cases (`textarea`, fallback, ariaLabel null).

### Fixed

- TypeScript build errors due to `rootDir` and cross-package imports.
- Coverage reports not including `rules.ts` and `reactivity.ts`.

---

## [0.1.0] - 2024-09-14

### Added

- Initial monorepo setup (`compiler`, `runtime`, `vite-plugin`, `cli`, `examples/todos`).
- `compile` function: parses, runs a11y checks, applies directive transforms.
- `signal` and `mount` reactive runtime.
- Vite plugin to transform `.lyra.tsx` files at build-time.
- CLI entrypoint `lyra-compile` to compile `.lyra.tsx` files manually.
- Vitest configuration with coverage reporting.
- ESLint + Prettier with flat config.
- CONTRIBUTING.md and CODE_OF_CONDUCT.md.
- MIT license.

[Unreleased]: https://github.com/jorgejac1/lyra/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/jorgejac1/lyra/releases/tag/v0.1.0
