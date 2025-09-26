# lyra-dev

[![CI](https://github.com/jorgejac1/lyra-dev/actions/workflows/ci.yml/badge.svg)](https://github.com/jorgejac1/lyra-dev/actions)
[![npm version](https://img.shields.io/npm/v/@lyra-dev/compiler.svg)](https://www.npmjs.com/package/@lyra-dev/compiler)
[![Coverage](https://img.shields.io/codecov/c/github/jorgejac1/lyra-dev)](https://codecov.io/gh/jorgejac1/lyra-dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **lyra-dev** is a compile-time, a11y-first, signal-driven front-end framework.

---

## ✨ Features

- ⚡ **Zero VDOM** — updates go directly to DOM nodes via signals for maximum speed.
- ♿ **Accessibility-first** — compile-time errors if inputs, roles, or labels are missing.
- 🎯 **Typed routes & loaders** — end-to-end type safety between client and server.
- 🎨 **Atomic CSS emission** — minimal CSS, themeable with tokens.
- 🧪 **First-class testing** — built-in a11y manifest, unit tests, and CI integration.
- 🔌 **Vite plugin** — `.lyra-dev.tsx` files compile on the fly with hot reload.

---

## 📦 Packages

This monorepo includes:

- **`@lyra-dev/compiler`** – TypeScript transformer for directives and a11y rules.
- **`@lyra-dev/runtime`** – Signals, stores, and DOM binding logic.
- **`@lyra-dev/vite-plugin`** – Integrates with Vite to compile `.lyra-dev.tsx` files.
- **`@lyra-dev/cli`** – Command-line tool `lyra-dev-compile` for single-file transforms.
- **`examples/todos`** – Example app using lyra-dev + Vite + Preact (demo scaffold).

---

## 🚀 Getting Started

Clone the repo and install dependencies:

```bash
git clone https://github.com/jorgejac1/lyra-dev.git
cd lyra-dev
npm install
```

### Run the example app

```bash
cd examples/todos
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔍 Usage Scenarios

### 1. Accessible Components by Default

```tsx
// ❌ Compile-time error (missing alt attribute)
<img src="/logo.png" />

// ✅ Compiles (alt attribute included)
<img src="/logo.png" alt="Lyra logo" />
```

👉 **Benefit:** Developers can’t accidentally ship inaccessible UIs — Lyra enforces best practices at compile time.

---

### 2. Reactive State without VDOM

```tsx
import { signal } from "@lyra-dev/runtime";

const count = signal(0);

<button onclick={() => count.value++}>Count: {count}</button>;
```

👉 **How it works:** Signals update DOM nodes directly, no virtual DOM diffing.  
👉 **Benefit:** Faster updates, less runtime overhead.

---

### 3. Typed Routes & Loaders

```tsx
// loader.ts
export const loader = async () => {
  return { message: "Hello from server!" };
};

// page.tsx
const { message } = useLoader<typeof loader>();
```

👉 **Benefit:** End-to-end type safety between server and client, preventing runtime mismatches.

---

### 4. Atomic CSS Emission

```tsx
<div class="p-4 text-lg font-bold">Hello, world!</div>
```

👉 **Benefit:** Only the minimal CSS needed is emitted → smaller bundles and consistent theming with tokens.

---

## 📊 Comparisons

| Feature / Framework     | **Lyra**                      | React                      | Svelte               | SolidJS       |
| ----------------------- | ----------------------------- | -------------------------- | -------------------- | ------------- |
| Rendering Model         | Signals → DOM (no VDOM)       | VDOM diff                  | Compile-time updates | Signals → DOM |
| Accessibility           | **Enforced at compile time**  | Optional (runtime lint)    | Optional             | Optional      |
| Type Safety             | **Built-in loaders & routes** | External libs (tRPC, etc.) | Limited              | Manual        |
| CSS Handling            | **Atomic CSS emission**       | CSS-in-JS / external       | Scoped CSS           | External      |
| DX Speed (build/reload) | **Fast (Vite + signals)**     | Medium                     | Fast                 | Very fast     |
| Learning Curve          | Low (TSX + rules)             | Widely known               | Medium               | Medium        |
| Bundle Size             | **Small by default**          | Larger                     | Small                | Small         |

**Key takeaway:** Lyra blends Svelte’s compile-time optimizations with Solid’s signals, but uniquely **enforces accessibility at compile time**, making the _right thing_ the easy thing.

---

## 🛠 Development Workflow

- Branch from `main`.
- Use **clear commit messages** (`feat:`, `fix:`, `docs:`, etc.).
- Make sure your code is linted and formatted:

  ```bash
  npm run lint
  npm run lint:fix
  ```

- Add or update **unit tests** when fixing or adding features.
- Run the test suite with coverage:

  ```bash
  npm run test
  ```

---

## 🤝 Contributing

Please see our [Contributing Guide](./CONTRIBUTING.md) for setup instructions, coding standards, and how to submit pull requests.

All contributions are welcome: bug reports, feature requests, documentation, or code.

---

## 📖 Reporting Issues

- Use the GitHub **Issues** tab.
- Provide clear reproduction steps, expected behavior, and actual behavior.

---

## 🧑‍🤝‍🧑 Code of Conduct

We follow the [Contributor Covenant](./CODE_OF_CONDUCT.md).  
By participating in this project, you agree to uphold it.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE).

---

## 🌟 Acknowledgements

Lyra is inspired by ideas from **React**, **SolidJS**, and **Svelte** but takes a unique approach by enforcing **accessibility at compile-time** and shipping less code to the client.

---
