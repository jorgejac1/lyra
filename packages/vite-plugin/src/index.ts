import type { Plugin, TransformResult } from "vite";
import { compile } from "@lyra-dev/compiler";

/**
 * Vite plugin for Lyra.
 *
 * Transforms `.lyra.tsx` modules by invoking the Lyra compiler:
 * - Rewrites directives at compile-time.
 * - Forwards compiler diagnostics to Vite (`warn`/`error`).
 * - Wraps output so consumers can import `{ mount, signal }` from `@lyra-dev/runtime`.
 */
export default function lyraPlugin(): Plugin {
  return {
    name: "vite-plugin-lyra",
    enforce: "pre",

    /**
     * Vite transform hook — runs for matched modules.
     * @returns transformed module or `null` to skip.
     */
    async transform(
      this: { error(msg: string): never; warn(msg: string): void },
      code: string,
      id: string,
      _options?: { ssr?: boolean },
    ): Promise<TransformResult | null> {
      if (!id.endsWith(".lyra.tsx")) return null;

      const res = compile({
        filename: id,
        source: code,
        dev: true,
        generateSourceMap: true,
        a11yLevel: "strict",
      });

      // Forward diagnostics to Vite logger
      res.diagnostics.forEach((d) => {
        const msg = `${d.code}: ${d.message} (in ${d.file})`;
        if (d.severity === "error") this.error(msg);
        else this.warn(msg);
      });

      const wrapped =
        `import { mount, signal } from '@lyra-dev/runtime';\n` +
        res.code +
        `\nexport { mount, signal };`;

      return { code: wrapped, map: null };
    },
  };
}
