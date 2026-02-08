import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["packages/**/src/**/*.test.ts", "packages/**/src/**/*.test.tsx"],
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      all: true,
      include: ["packages/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/dist/**",
        "**/__release-trigger.ts",
        "**/types.ts",
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      "@lyra-dev/compiler": path.resolve(
        __dirname,
        "packages/compiler/src/index.ts",
      ),
      "@lyra-dev/runtime": path.resolve(
        __dirname,
        "packages/runtime/src/index.ts",
      ),
    },
  },
});
