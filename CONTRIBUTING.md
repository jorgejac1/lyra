# Contributing to Lyra

🎉 Thanks for your interest in contributing! Contributions are welcome whether they are bug reports, feature requests, documentation improvements, or code changes.

## Getting Started

1. Fork the repository and clone it locally.
2. Install dependencies:
   ```bash
   npm install
3. Run tests to ensure everything is green:
   ```bash
   npm test

## Development Workflow

- Branch from `main`.
- Use **clear commit messages** (`feat:`, `fix:`, `docs:`, etc.).
- Make sure your code is linted and formatted:
  ```bash
  npm run lint
  npm run lint:fix

- Add or update **unit tests** when fixing or adding features.
- Run the test suite with coverage:
  ```bash
  npm run test

## Pull Requests

- Open PRs against `main`.
- Ensure all tests and coverage pass in CI.
- Describe **why** the change is needed and **what** it does.
- If fixing a bug, link the relevant issue.

## Reporting Issues

- Use the GitHub Issues tab.
- Provide reproduction steps, expected behavior, and actual behavior.

## Code of Conduct

Please note that this project follows our [Code of Conduct](./CODE_OF_CONDUCT.md).
By participating, you agree to uphold it.
