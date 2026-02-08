import ts from "typescript";
import { runA11yChecks } from "./a11y/rules.js";
import { generateSourceMap } from "./sourcemap/generate.js";
import { transformReactivity } from "./transform/reactivity.js";
import type { CompileOptions, CompileResult, Diagnostic } from "./types.js";

/**
 * Internal parsing helper used by the compiler to obtain a `ts.SourceFile`.
 *
 * @remarks
 * Exported primarily for testing and tooling. In production usage you should not
 * need to call this directly—use {@link compile}.
 *
 * @internal
 * @param filename - The virtual/real filename used by TypeScript for diagnostics.
 * @param source - The TypeScript/TSX source text to parse.
 * @returns A `ts.SourceFile` parsed in `TSX` mode with latest script target.
 */
export function parseSourceFile(
  filename: string,
  source: string,
): ts.SourceFile {
  return ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
}

/**
 * Augments {@link CompileOptions} with an **internal** parser override.
 *
 * @remarks
 * This is intentionally **not** part of the public `CompileOptions` type to avoid
 * coupling external callers to our internal parsing mechanism. It exists to make
 * error paths and catastrophic failure scenarios easily testable (e.g. injecting
 * a parser that throws a non-`Error` value).
 *
 * @internal
 */
type _WithParser = { parser?: typeof parseSourceFile };

/**
 * Compile a Lyra TSX module.
 *
 * @remarks
 * The compiler parses the given `source`, optionally emits a11y diagnostics
 * according to `a11yLevel`, transforms Lyra directives (e.g. `on:*`, `class:*`)
 * into runtime-friendly attributes, and prints the transformed program back to
 * source code. Source maps are currently not emitted.
 *
 * ### Error handling
 * - **Parse diagnostics** (syntax errors reported by TypeScript) are returned as
 *   `TSxxxx` diagnostics and the original `source` is returned with
 *   `meta.transformed = false`.
 * - **Catastrophic parse failures** (exceptions thrown while parsing) are caught.
 *   If the thrown value is an `Error`, its message is used; otherwise a stable
 *   message `"Failed to parse source file"` is reported under `LYRA_PARSE_ERROR`.
 *
 * ### Accessibility checks
 * A11y rules run on the parsed AST and report diagnostics based on `a11yLevel`.
 *
 * ### Transform
 * The transform rewrites Lyra reactivity/directives via {@link transformReactivity}.
 *
 * @param options - {@link CompileOptions} controlling parsing, a11y, and printing.
 * @param options.filename - Virtual/real filename for diagnostics.
 * @param options.source - The TSX source to compile.
 * @param options.a11yLevel - A11y strictness: `"off"` | `"relaxed"` | `"strict"`.
 * @param options.dev - Enables dev-mode behavior (reserved for future use). Default: `true`.
 * @param options.generateSourceMap - Placeholder flag (currently no source maps). Default: `true`.
 * @param options.parser - **Internal/testing hook** to override the parser. Not part of public API. @internal
 *
 * @returns {@link CompileResult} including transformed `code`, `diagnostics`, and `meta`.
 */
export function compile(options: CompileOptions & _WithParser): CompileResult {
  const {
    filename,
    source,
    generateSourceMap: shouldGenerateMap = false,
    a11yLevel = "strict",
    parser, // ⬅️ injected parser (optional, internal for tests)
  } = options;

  const diags: Diagnostic[] = [];

  // Use injected parser when provided (great for tests)
  const _parse = parser ?? parseSourceFile;

  // Parse source code and catch syntax errors
  let sf: ts.SourceFile;
  try {
    sf = _parse(filename, source);

    const parseDiagnostics = (
      sf as unknown as { parseDiagnostics?: ts.Diagnostic[] }
    ).parseDiagnostics;

    if (parseDiagnostics && parseDiagnostics.length > 0) {
      parseDiagnostics.forEach((d) => {
        diags.push({
          code: `TS${d.code}`,
          message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
          file: filename,
          start: d.start,
          length: d.length,
          severity: "error",
        });
      });

      return {
        code: source,
        map: null,
        diagnostics: diags,
        meta: {
          symbols: [],
          islands: false,
          a11yErrors: diags.filter((d) => d.severity === "error").length,
          transformed: false,
        },
      };
    }
  } catch (err) {
    diags.push({
      code: "LYRA_PARSE_ERROR",
      message:
        err instanceof Error ? err.message : "Failed to parse source file",
      file: filename,
      severity: "error",
    });
    return {
      code: source,
      map: null,
      diagnostics: diags,
      meta: {
        symbols: [],
        islands: false,
        a11yErrors: 1,
        transformed: false,
      },
    };
  }

  // a11y + transforms unchanged
  diags.push(...runA11yChecks(sf, filename, a11yLevel));

  const result = ts.transform<ts.SourceFile>(sf, [
    (ctx): ts.Transformer<ts.SourceFile> =>
      (node: ts.SourceFile) =>
        transformReactivity(node, ctx, filename),
  ]);

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });
  const transformed = result.transformed[0] as ts.SourceFile;
  const code = printer.printFile(transformed);

  // Collect diagnostics emitted during the transform (always set by transformReactivity)
  diags.push(
    ...(transformed as unknown as { _lyra_diags: Diagnostic[] })._lyra_diags,
  );

  result.dispose();

  const map = shouldGenerateMap
    ? generateSourceMap(filename, source, code)
    : null;

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

export { runA11yChecks } from "./a11y/rules.js";
export {
  offsetToLineColumn,
  formatDiagnostic,
  formatCodeFrame,
} from "./diagnostics/format.js";
export type {
  CompileOptions,
  CompileResult,
  Diagnostic,
  SourceMap,
} from "./types.js";
