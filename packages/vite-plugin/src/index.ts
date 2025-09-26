import type { Plugin, TransformResult } from "vite";
import { compile } from "@lyra-dev/compiler";

type Severity = "error" | "warn" | "info" | undefined;
type Diagnostic = {
  code?: string | number;
  message: string;
  severity?: Severity;
  filename?: string; // preferred field
  file?: string; // legacy field (still supported)
  start?: { line: number; column: number };
};

/**
 * Vite plugin for Lyra.
 *
 * Transforms `.lyra.tsx?` modules by invoking the Lyra compiler:
 * - Rewrites directives at compile-time.
 * - Forwards compiler diagnostics to Vite (`warn`/`error`).
 * - Wraps output so consumers can import `{ mount, signal }` from `@lyra-dev/runtime`.
 */
export default function lyraPlugin(): Plugin {
  return {
    name: "vite-plugin-lyra",
    enforce: "pre",

    async transform(
      this: { error(msg: string): never; warn(msg: string): void },
      code: string,
      id: string,
      _options?: { ssr?: boolean },
    ): Promise<TransformResult | null> {
      if (!id.endsWith(".lyra.tsx") && !id.endsWith(".lyra.ts")) return null;

      const res = compile({
        filename: id,
        source: code,
        dev: true,
        generateSourceMap: true,
        a11yLevel: "strict",
      }) as {
        code: string;
        map?: unknown;
        diagnostics?: Diagnostic[];
      };

      // Forward diagnostics to Vite logger (support filename | file)
      const diags = res.diagnostics ?? [];
      for (const d of diags) {
        const where = d.filename ?? d.file ?? id;
        const lineCol = d.start ? `:${d.start.line}:${d.start.column}` : "";
        const tag =
          d.severity === "error"
            ? "LYRA_E"
            : d.severity === "warn"
              ? "LYRA_W"
              : "LYRA_I";
        const msg = `${tag}${d.code ? ` ${d.code}` : ""}: ${d.message} (in ${where}${lineCol})`;

        // explicit call (no-unused-expressions compliant)
        if (d.severity === "error") {
          this.error(msg);
        } else {
          this.warn(msg);
        }
      }

      const wrapped =
        `import { mount, signal } from '@lyra-dev/runtime';\n` +
        res.code +
        `\nexport { mount, signal };`;

      // Cast to Vite's map type (avoids importing 'rollup')
      const map = (res.map ?? null) as TransformResult["map"];
      return { code: wrapped, map };
    },
  };
}
