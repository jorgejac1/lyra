# lyra-dev

[![CI](https://github.com/jorgejac1/lyra-dev/actions/workflows/ci.yml/badge.svg)](https://github.com/jorgejac1/lyra-dev/actions)
[![npm version](https://img.shields.io/npm/v/@lyra-dev/compiler.svg)](https://www.npmjs.com/package/@lyra-dev/compiler)
[![Coverage](https://img.shields.io/codecov/c/github/<your-username>/<your-repo>)](https://codecov.io/gh/<your-username>/<your-repo>)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> **lyra-dev** is a compile-time, a11y-first, signal-driven front-end framework.

---

## ✨ Features

- ⚡ **Zero VDOM** — updates go directly to DOM nodes via signals.
- ♿ **Accessibility-first** — build errors if inputs, roles, or labels are missing.
- 🎯 **Typed routes & loaders** — end-to-end type safety between client and server.
- 🎨 **Atomic CSS emission** — minimal CSS, themeable with tokens.
- 🧪 **First-class testing** — built-in a11y manifest, unit tests, and CI integration.
- 🔌 **Vite plugin** — `.lyra-dev.tsx` files compile on the fly.

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
cd <your-repo>
npm install
```

## 🚀 Run the example app

```bash
cd examples/todos
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

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

  ## 🤝 Contributing
  ```

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

lyra-dev is inspired by ideas from **React**, **SolidJS**, and **Svelte** but takes a unique approach by enforcing accessibility at compile-time and shipping less code to the client.
