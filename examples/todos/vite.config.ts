import { defineConfig, type PluginOption } from "vite";
import preact from "@preact/preset-vite";

// return an async config so we can dynamic-import the ESM-only plugin
export default defineConfig(async () => {
  const { default: lyraPlugin } = await import("@lyra-dev/vite-plugin");

  return {
    plugins: [
      preact(),
      lyraPlugin() as unknown as PluginOption, // cast only to appease TS if needed
    ],
    resolve: {
      alias: {
        "@lyra/runtime": "@lyra-dev/runtime",
        "@lyra/compiler": "@lyra-dev/compiler",
        "@lyra/vite-plugin": "@lyra-dev/vite-plugin",
      },
    },
    // belt & suspenders so Vite doesn't try to prebundle/require it
    optimizeDeps: {
      exclude: ["@lyra-dev/vite-plugin"],
    },
    ssr: {
      noExternal: ["@lyra-dev/vite-plugin"],
    },
  };
});
