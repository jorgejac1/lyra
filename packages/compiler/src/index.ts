import ts from "typescript";
import { runA11yChecks } from "./a11y/rules";
import { transformReactivity } from "./transform/reactivity";
import type { CompileOptions, CompileResult } from "./types";

/**
 * Compile a Lyra TS/TSX module.
 *
 * Pipeline:
 *  1) Parse to {@link ts.SourceFile}.
 *  2) Run a11y static checks (emit diagnostics).
 *  3) Apply directive transforms (`on:*`, `class:*` → `data-*`).
 *  4) Print to string (no source maps yet).
 *
 * @param options - Compile options (filename, source, dev flags, a11y level).
 * @returns Transformed code, diagnostics, and meta info.
 */
export function compile(options: CompileOptions): CompileResult {
  const {
    filename,
    source,
    dev: _dev = true,
    generateSourceMap: _generateSourceMap = true,
    a11yLevel = "strict",
  } = options;

  const isTSX =
    filename.endsWith(".tsx") ||
    filename.endsWith(".lyra.tsx") ||
    filename.endsWith(".jsx");

  // 1) Parse
  const sf = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ true,
    isTSX ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  // 2) A11y checks
  const diags = runA11yChecks(sf, filename, a11yLevel);

  // 3) Transform directives
  const result = ts.transform<ts.SourceFile>(sf, [
    (ctx): ts.Transformer<ts.SourceFile> =>
      (node: ts.SourceFile) =>
        transformReactivity(node, ctx),
  ]);

  // 4) Print
  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });
  const transformed = result.transformed[0] as ts.SourceFile;
  const code = printer.printFile(transformed);
  const map: unknown | null = null; // TODO: add source maps later

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
