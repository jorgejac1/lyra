import ts from "typescript";

/**
 * Transform Lyra directives to data-* attributes.
 * - on:click={fn}   -> data-on-click={fn}
 * - class:done={x}  -> data-class-done={x}
 */
export function transformReactivity(
  sf: ts.SourceFile,
  ctx: ts.TransformationContext,
): ts.SourceFile {
  const factory = ctx.factory;

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

  // Important: return the same type (SourceFile)
  return ts.visitEachChild(sf, visit, ctx);
}
