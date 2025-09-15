import ts from "typescript";

/**
 * Transform Lyra-specific JSX directives into `data-*` attributes
 * that can later be picked up at runtime.
 *
 * Supported rewrites:
 * - `on:click={fn}`   → `data-on-click={fn}`
 * - `class:done={x}`  → `data-class-done={x}`
 *
 * @param sf - The TypeScript SourceFile representing the TSX code to transform.
 * @param ctx - The TransformationContext provided by the TypeScript compiler API.
 *
 * @returns A new {@link ts.SourceFile} with JSX attributes rewritten.
 *
 * @example
 * ```tsx
 * // Input
 * <button on:click={handleClick} class:active={isActive} />
 *
 * // After transform
 * <button data-on-click={handleClick} data-class-active={isActive} />
 * ```
 */
export function transformReactivity(
  sf: ts.SourceFile,
  ctx: ts.TransformationContext,
): ts.SourceFile {
  const factory = ctx.factory;

  /**
   * Visit a node and transform JSX attributes if necessary.
   *
   * @param node - The AST node to visit.
   * @returns The transformed node or the node itself.
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

        // Transform `on:event` into `data-on-event`
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

        // Transform `class:name` into `data-class-name`
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

        // Preserve other attributes unchanged
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

  // Important: return the same type (SourceFile) after traversal
  return ts.visitEachChild(sf, visit, ctx);
}
