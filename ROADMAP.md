# 🚀 Lyra Roadmap

This roadmap outlines upcoming features, fixes, and improvements for the Lyra ecosystem.  
Lyra’s mission is to improve **Developer Experience (DX)** while promoting **Accessibility (A11y) by default**.

---

## ✅ Recently Shipped

- Initial publish of `@lyra-dev/compiler`, `@lyra-dev/runtime`, `@lyra-dev/vite-plugin`, and `@lyra-dev/cli`
- CI workflow for building & publishing with provenance
- First version of CLI + compiler builds

---

## 🛠️ Next Milestones

### 1. Developer Experience (DX)

- [ ] **Zero-config setup** → scaffold a project with `npx @lyra-dev/cli create my-app`
- [ ] **Improved error messages** → human-friendly compiler/runtime errors with doc links
- [ ] **Plugin ecosystem** → allow community-driven extensions
- [ ] **Hot-reload integration** for faster dev feedback
- [ ] **Dev server diagnostics** → detect missing deps, invalid imports, etc.

### 2. Accessibility (A11y)

- [ ] **Static analysis rules** in the compiler
  - Warn on `<img>` without `alt` text
  - Detect `<button>` without visible text
  - Flag missing form labels
- [ ] **CLI accessibility audits** → `lyra a11y-check` command
- [ ] **Accessible starter templates** (semantic HTML, ARIA-ready)

### 3. Runtime / Compiler Improvements

- [ ] Smarter **tree-shaking** → smaller bundles
- [ ] Better **source maps** for debugging
- [ ] Stronger **TypeScript support** → types auto-generated
- [ ] Optimize **reactivity engine** for performance

### 4. Ecosystem Integration

- [ ] React + Vue adapters
- [ ] Auto-config for Vite (`vite.config.ts`)
- [ ] Storybook integration
- [ ] Framework helpers (Next.js, Astro)

### 5. Quality & Security

- [ ] Add lint, typecheck, unit tests in CI
- [ ] Integrate accessibility testing in CI
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
