import type { Plugin, TransformResult } from "vite";
import { compile } from "@lyra/compiler";

/**
 * Vite plugin that compiles `.lyra.tsx` files with Lyra's compiler.
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
      if (!id.endsWith(".lyra.tsx")) {
        return null;
      }

      const res = compile({
        filename: id,
        source: code,
        dev: true,
        generateSourceMap: true,
        a11yLevel: "strict",
      });

      res.diagnostics.forEach((d) => {
        const msg = `${d.code}: ${d.message} (in ${d.file})`;
        if (d.severity === "error") this.error(msg);
        else this.warn(msg);
      });

      const wrapped =
        `import { mount, signal } from '@lyra/runtime';\n` +
        res.code +
        `\nexport { mount, signal };`;

      // No sourcemaps yet → return map: null
      return {
        code: wrapped,
        map: null,
      };
    },
  };
}
