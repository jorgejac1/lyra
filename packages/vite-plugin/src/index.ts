import type { Plugin, TransformResult } from "vite";
import { compile, offsetToLineColumn } from "@lyra-dev/compiler";
import type { Diagnostic } from "@lyra-dev/compiler";

/**
 * Options for the Lyra Vite plugin.
 */
export type LyraPluginOptions = {
  /** A11y enforcement level passed to the compiler. Default: "strict". */
  a11yLevel?: "strict" | "warn" | "off";
  /** Glob patterns to include (matched against file IDs). Default: all .lyra.tsx/.lyra.ts files. */
  include?: RegExp | string[];
  /** Glob patterns to exclude (matched against file IDs). Default: node_modules. */
  exclude?: RegExp | string[];
};

/** Pre-compiled patterns for runtime detection (avoid recompiling per file). */
const RE_SIGNAL_OR_MOUNT = /\b(signal|mount)\b/;
const RE_DATA_DIRECTIVE = /data-(on|class)-/;
const RE_INVALID_LYRA_IMPORT =
  /from\s+["']@lyra-dev\/(?!compiler|runtime|vite-plugin)[^"']+["']/g;

/**
 * Check if source code uses Lyra runtime features.
 * Only add imports if the code actually uses them to avoid bloat.
 */
function usesLyraRuntime(code: string): boolean {
  return RE_SIGNAL_OR_MOUNT.test(code) || RE_DATA_DIRECTIVE.test(code);
}

function matchesFilter(id: string, filter: RegExp | string[]): boolean {
  if (filter instanceof RegExp) return filter.test(id);
  return filter.some((pattern) => id.includes(pattern));
}

/**
 * Vite plugin for Lyra.
 *
 * Transforms `.lyra.tsx?` modules by invoking the Lyra compiler:
 * - Rewrites directives at compile-time.
 * - Forwards compiler diagnostics to Vite (`warn`/`error`).
 * - Conditionally wraps output with runtime imports if needed.
 *
 * @param options - Optional plugin configuration.
 */
export default function lyraPlugin(options?: LyraPluginOptions): Plugin {
  const a11yLevel = options?.a11yLevel ?? "strict";
  const include = options?.include;
  const exclude = options?.exclude ?? /node_modules/;

  return {
    name: "vite-plugin-lyra",
    enforce: "pre",

    async buildStart(this: { warn(msg: string): void }) {
      try {
        // Dynamic string to avoid TS static module resolution
        const runtimePkg = "@lyra-dev/" + "runtime";
        await import(runtimePkg);
      } catch {
        this.warn(
          "[@lyra-dev/vite-plugin] @lyra-dev/runtime is not installed. " +
            "Lyra components that use signals or mount() will fail at runtime. " +
            "Install it with: pnpm add @lyra-dev/runtime",
        );
      }
    },

    configResolved(config) {
      config.resolve.extensions = config.resolve.extensions || [
        ".mjs",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".json",
      ];
      if (!config.resolve.extensions.includes(".lyra.tsx")) {
        config.resolve.extensions.push(".lyra.tsx");
      }
      if (!config.resolve.extensions.includes(".lyra.ts")) {
        config.resolve.extensions.push(".lyra.ts");
      }
    },

    async transform(
      this: { error(msg: string): never; warn(msg: string): void },
      code: string,
      id: string,
      _options?: { ssr?: boolean },
    ): Promise<TransformResult | null> {
      if (!id.endsWith(".lyra.tsx") && !id.endsWith(".lyra.ts")) return null;

      // Apply include/exclude filters
      if (exclude && matchesFilter(id, exclude)) return null;
      if (include && !matchesFilter(id, include)) return null;

      const res = compile({
        filename: id,
        source: code,
        dev: true,
        generateSourceMap: true,
        a11yLevel,
      });

      if (!res || typeof res.code !== "string") {
        this.error("Lyra compilation failed: no code returned");
      }

      // Check for invalid @lyra-dev/* imports
      RE_INVALID_LYRA_IMPORT.lastIndex = 0;
      const invalidImports = code.match(RE_INVALID_LYRA_IMPORT);
      if (invalidImports) {
        for (const imp of invalidImports) {
          this.warn(
            `[@lyra-dev/vite-plugin] Unknown Lyra package import: ${imp}`,
          );
        }
      }

      const diags: Diagnostic[] = res.diagnostics ?? [];
      for (const d of diags) {
        const where = d.file ?? id;
        const position =
          d.start !== undefined && d.length !== undefined
            ? `:${d.start}+${d.length}`
            : "";
        const tag =
          d.severity === "error"
            ? "LYRA_E"
            : d.severity === "warn"
              ? "LYRA_W"
              : "LYRA_I";
        const msg = `${tag}${d.code ? ` ${d.code}` : ""}: ${d.message} (in ${where}${position})`;

        if (d.severity === "error") {
          // Provide structured error with location for Vite's error overlay
          if (d.start !== undefined) {
            const loc = offsetToLineColumn(code, d.start);
            this.error(
              Object.assign(new Error(msg), {
                id: d.file ?? id,
                loc: { line: loc.line, column: loc.column },
              }) as unknown as string,
            );
          } else {
            this.error(msg);
          }
        } else {
          this.warn(msg);
        }
      }

      const needsRuntime = usesLyraRuntime(res.code);
      const finalCode = needsRuntime
        ? `import { mount, signal } from '@lyra-dev/runtime';\n${res.code}\nexport { mount, signal };`
        : res.code;

      let map: TransformResult["map"] = null;
      if (res.map && typeof res.map === "object") {
        map = res.map as TransformResult["map"];
      }

      return { code: finalCode, map };
    },
  };
}
