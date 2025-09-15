import ts from "typescript";

/**
 * Transform Lyra JSX directives into `data-*` attributes for runtime wiring.
 *
 * Supported rewrites:
 * - `on:click={fn}`   → `data-on-click={fn}`
 * - `class:done={x}`  → `data-class-done={x}`
 *
 * @param sf - Source file to transform.
 * @param ctx - TypeScript transformation context.
 * @returns A new {@link ts.SourceFile} with attributes rewritten.
 */
export function transformReactivity(
  sf: ts.SourceFile,
  ctx: ts.TransformationContext,
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

  return ts.visitEachChild(sf, visit, ctx);
}
