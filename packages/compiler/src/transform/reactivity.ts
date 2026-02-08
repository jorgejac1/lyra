import ts from "typescript";
import type { Diagnostic } from "../types.js";

/**
 * Transform Lyra JSX directives into `data-*` attributes for runtime wiring.
 *
 * Supported rewrites:
 * - `on:click={fn}`   → `data-on-click={fn}`
 * - `class:done={x}`  → `data-class-done={x}`
 *
 * Validates that directive values are JsxExpressions (not string literals).
 * Returns diagnostics for invalid directive usage instead of using console.warn.
 *
 * @param sf - Source file to transform.
 * @param ctx - TypeScript transformation context.
 * @param filename - File name for diagnostic reporting.
 * @returns The transformed source file and any diagnostics.
 */
export function transformReactivity(
  sf: ts.SourceFile,
  ctx: ts.TransformationContext,
  filename?: string,
): ts.SourceFile {
  const factory = ctx.factory;

  /**
   * Visit a node and transform JSX attributes if necessary.
   */
  const visit = (node: ts.Node): ts.Node => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const newAttrs: ts.JsxAttributeLike[] = [];
      node.attributes.properties.forEach((prop) => {
        if (!ts.isJsxAttribute(prop)) {
          newAttrs.push(prop);
          return;
        }
        const name = prop.name.getText();
        const init = prop.initializer;

        // Validate that directives use expressions, not string literals
        if ((name.startsWith("on:") || name.startsWith("class:")) && init) {
          if (ts.isStringLiteral(init)) {
            _diagnostics.push({
              code: "LYRA_DIRECTIVE_STRING",
              message: `Directive "${name}" should use an expression {value}, not a string literal "${init.text}". This will not work at runtime.`,
              file: filename ?? sf.fileName,
              start: prop.getStart(),
              length: prop.getWidth(),
              severity: "warn",
              hint: `Change ${name}="${init.text}" to ${name}={${init.text}}.`,
            });
          }
        }

        // on:event → data-on-event
        if (name.startsWith("on:")) {
          const evt = name.split(":")[1];
          const runtimeAttr = factory.createJsxAttribute(
            factory.createIdentifier(`data-on-${evt}`),
            init && ts.isJsxExpression(init)
              ? factory.createJsxExpression(undefined, init.expression)
              : undefined,
          );
          newAttrs.push(runtimeAttr);
          return;
        }

        // class:name → data-class-name
        if (name.startsWith("class:")) {
          const cls = name.split(":")[1];
          const runtimeAttr = factory.createJsxAttribute(
            factory.createIdentifier(`data-class-${cls}`),
            init && ts.isJsxExpression(init)
              ? factory.createJsxExpression(undefined, init.expression)
              : undefined,
          );
          newAttrs.push(runtimeAttr);
          return;
        }

        // passthrough
        newAttrs.push(prop);
      });

      if (ts.isJsxSelfClosingElement(node)) {
        return factory.updateJsxSelfClosingElement(
          node,
          node.tagName,
          node.typeArguments,
          factory.updateJsxAttributes(node.attributes, newAttrs),
        );
      }

      return factory.updateJsxOpeningElement(
        node,
        node.tagName,
        node.typeArguments,
        factory.updateJsxAttributes(node.attributes, newAttrs),
      );
    }
    return ts.visitEachChild(node, visit, ctx);
  };

  const _diagnostics: Diagnostic[] = [];
  const result = ts.visitEachChild(sf, visit, ctx);
  // Attach diagnostics to the source file for retrieval by the compiler
  (result as unknown as { _lyra_diags?: Diagnostic[] })._lyra_diags =
    _diagnostics;
  return result;
}
