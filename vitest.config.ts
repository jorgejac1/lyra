import { defineConfig } from "vitest/config";
import path from "node:path";

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
      exclude: ["**/*.test.ts", "**/dist/**"],
    },
  },
  resolve: {
    alias: {
      "@lyra/compiler": path.resolve(
        __dirname,
        "packages/compiler/src/index.ts",
      ),
      "@lyra/runtime": path.resolve(__dirname, "packages/runtime/src/index.ts"),
    },
  },
});
