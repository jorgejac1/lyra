# 🚀 Lyra Roadmap

This roadmap outlines upcoming features, fixes, and improvements for the Lyra ecosystem.  
Lyra’s mission is to improve **Developer Experience (DX)** while promoting **Accessibility (A11y) by default**.

---

## ✅ Recently Shipped

- Initial publish of `@lyra-dev/compiler`, `@lyra-dev/runtime`, `@lyra-dev/vite-plugin`, and `@lyra-dev/cli`
- CI workflow for building & publishing with provenance
- First version of CLI + compiler builds
- 8 a11y rules (001–008) with doc links, hints, and configurable severity
- Signal equality check (`Object.is`), `effect()`, `batch()`, `computed()`
- Prototype pollution guards in `mount()`
- Transform diagnostics (`LYRA_DIRECTIVE_STRING`)
- Vite plugin options (`LyraPluginOptions` with include/exclude/a11yLevel)
- Package metadata improvements (`sideEffects`, `files`, `engines`, `peerDependencies`)

---

## 🛠️ Next Milestones

### 1. Developer Experience (DX)

- [ ] **Zero-config setup** → scaffold a project with `npx @lyra-dev/cli create my-app`
- [x] **Improved error messages** → human-friendly compiler/runtime errors with doc links
- [ ] **Plugin ecosystem** → allow community-driven extensions
- [ ] **Hot-reload integration** for faster dev feedback
- [x] **Dev server diagnostics** → detect missing deps, invalid imports, etc.

### 2. Accessibility (A11y)

- [x] **Static analysis rules** in the compiler (8 rules)
  - Warn on `<img>` without `alt` text
  - Detect `<button>` without visible text
  - Flag missing form labels
  - Detect `<a>` without `href`
  - Flag positive `tabindex` values
  - Detect empty headings (`<h1>`–`<h6>`)
  - Flag `<iframe>` without `title`
- [x] **CLI accessibility audits** → `lyra a11y-check` command
- [ ] **Accessible starter templates** (semantic HTML, ARIA-ready)

### 3. Runtime / Compiler Improvements

- [ ] Smarter **tree-shaking** → smaller bundles
- [x] Better **source maps** for debugging
- [ ] Stronger **TypeScript support** → types auto-generated
- [x] Optimize **reactivity engine** for performance

### 4. Ecosystem Integration

- [ ] React + Vue adapters
- [ ] Auto-config for Vite (`vite.config.ts`)
- [ ] Storybook integration
- [ ] Framework helpers (Next.js, Astro)

### 5. Quality & Security

- [x] Add lint, typecheck, unit tests in CI
- [x] Integrate accessibility testing in CI (`lyra a11y-check` + 8 compile-time rules)
- [ ] Supply chain scanning (npm audit / Snyk)
- [ ] SBOM + provenance metadata

### 6. Docs & Community

- [ ] **Getting Started** guide
- [ ] **Recipes/examples** (TodoMVC, blog starter)
- [ ] CONTRIBUTING.md with local dev guide
- [ ] Open discussions board or Discord

---

## 💡 How to Contribute

- Pick any unchecked item above and open an issue/PR
- Suggest new features in [Discussions](https://github.com/jorgejac1/lyra/discussions) (coming soon)
- Share feedback on npm or GitHub

---

## 🌟 Vision

Make **modern frontend workflows faster, simpler, and more inclusive** by combining world-class **DX** with built-in **Accessibility best practices**.
