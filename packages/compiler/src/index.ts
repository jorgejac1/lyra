import ts from "typescript";
import { runA11yChecks } from "./a11y/rules";
import { transformReactivity } from "./transform/reactivity";
import type { CompileOptions, CompileResult } from "./types";

/**
 * Compile a Lyra TSX module: run a11y checks and directive transforms.
 */
export function compile(options: CompileOptions): CompileResult {
  const {
    filename,
    source,
    dev: _dev = true,
    generateSourceMap: _generateSourceMap = true,
    a11yLevel = "strict",
  } = options;

  const sf = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const diags = runA11yChecks(sf, filename, a11yLevel);

  const result = ts.transform<ts.SourceFile>(sf, [
    (ctx): ts.Transformer<ts.SourceFile> =>
      (node: ts.SourceFile) =>
        transformReactivity(node, ctx),
  ]);

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
