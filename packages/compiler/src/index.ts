import ts from "typescript";
import { runA11yChecks } from "./a11y/rules.js";
import { transformReactivity } from "./transform/reactivity.js";
import type { CompileOptions, CompileResult } from "./types.js";

/**
 * Compile a Lyra TSX module.
 *
 * Steps performed:
 *  1. Parse the provided source code into a TypeScript SourceFile.
 *  2. Run static accessibility (a11y) checks on the AST.
 *  3. Apply Lyra directive transforms (e.g. `on:*`, `class:*` → `data-*`).
 *  4. Print the transformed AST back to a string of code.
 *
 * @param options - The {@link CompileOptions} controlling how compilation runs:
 * - `filename`: the file path for context and diagnostics.
 * - `source`: the TSX source code string.
 * - `dev`: whether dev-friendly behavior should be enabled (default: `true`).
 * - `generateSourceMap`: whether to generate source maps (default: `true`, not yet implemented).
 * - `a11yLevel`: strictness of accessibility checks (`"strict" | "warn" | "off"`).
 *
 * @returns A {@link CompileResult} object containing:
 * - `code`: the transformed TSX source as a string.
 * - `map`: a placeholder for source maps (currently `null`).
 * - `diagnostics`: any diagnostics produced by the a11y checks.
 * - `meta`: metadata about the compilation (symbols, islands, error counts, etc).
 *
 * @example
 * ```ts
 * import { compile } from "@lyra-dev/compiler";
 *
 * const result = compile({
 *   filename: "Component.lyra.tsx",
 *   source: "<button on:click={fn}></button>",
 *   a11yLevel: "strict"
 * });
 *
 * console.log(result.code);
 * // => <button data-on-click={fn}></button>
 * ```
 */
export function compile(options: CompileOptions): CompileResult {
  const {
    filename,
    source,
    dev: _dev = true,
    generateSourceMap: _generateSourceMap = true,
    a11yLevel = "strict",
  } = options;

  // Create a TSX source file AST
  const sf = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  // Run a11y checks on the AST
  const diags = runA11yChecks(sf, filename, a11yLevel);

  // Transform AST: rewrite Lyra directives
  const result = ts.transform<ts.SourceFile>(sf, [
    (ctx): ts.Transformer<ts.SourceFile> =>
      (node: ts.SourceFile) =>
        transformReactivity(node, ctx),
  ]);

  // Print the transformed AST back to source code
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });
  const transformed = result.transformed[0] as ts.SourceFile;
  const code = printer.printFile(transformed);

  // Placeholder: source maps not yet supported
  const map: unknown | null = null;

  result.dispose();

  return {
    code,
    map,
    diagnostics: diags,
    meta: {
      symbols: [],
      islands: false,
      a11yErrors: diags.filter((d) => d.severity === "error").length,
      transformed: true,
    },
  };
}
