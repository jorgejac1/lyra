import ts from "typescript";
import type { Diagnostic } from "../types";

/**
 * Run static accessibility rules on a TSX source file.
 * Currently implements LYRA_A11Y_001: common interactive controls must have an accessible name.
 */
export function runA11yChecks(
  sf: ts.SourceFile,
  filename: string,
  level: "strict" | "warn" | "off",
): Diagnostic[] {
  if (level === "off") return [];
  const diags: Diagnostic[] = [];

  const checkHasAccessibleName = (node: ts.Node) => {
    if (!ts.isJsxSelfClosingElement(node) && !ts.isJsxOpeningElement(node))
      return;
    const tag = node.tagName.getText();
    if (!["input", "select", "textarea", "button"].includes(tag)) return;
    const props = new Map<string, string>();
    node.attributes.properties.forEach((p: ts.JsxAttributeLike) => {
      if (ts.isJsxAttribute(p) && p.name) {
        const name = p.name.getText();
        const val = p.initializer ? p.initializer.getText() : "";
        props.set(name, val);
      }
    });
    const hasName =
      props.has("aria-label") ||
      props.has("aria-labelledby") ||
      props.has("title") ||
      props.has("id");
    if (!hasName) {
      diags.push({
        code: "LYRA_A11Y_001",
        message: `Interactive <${tag}> lacks an accessible name (aria-label, aria-labelledby, title, or associated <label>).`,
        file: filename,
        start: node.getStart(),
        length: node.getWidth(),
        severity: level === "strict" ? "error" : "warn",
        hint: "Add aria-label or associate a <label for> with the control id.",
      });
    }
  };

  const visit = (n: ts.Node) => {
    checkHasAccessibleName(n);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return diags;
}
