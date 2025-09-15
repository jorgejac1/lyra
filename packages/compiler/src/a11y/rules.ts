import ts from "typescript";
import type { Diagnostic } from "../types";

/**
 * Run static accessibility rules on a TSX source file.
 *
 * Currently implements rule **LYRA_A11Y_001**:
 * Ensures common interactive controls (`<input>`, `<select>`, `<textarea>`, `<button>`)
 * have an accessible name attribute (`aria-label`, `aria-labelledby`, `title`, or `id`).
 *
 * @param sf - The TypeScript SourceFile to check.
 * @param filename - The filename for diagnostics reporting.
 * @param level - The enforcement level:
 * - `"strict"` → errors are reported as `"error"`.
 * - `"warn"` → issues are reported as `"warn"`.
 * - `"off"` → no checks are run.
 *
 * @returns An array of {@link Diagnostic} entries for any violations found.
 */
export function runA11yChecks(
  sf: ts.SourceFile,
  filename: string,
  level: "strict" | "warn" | "off",
): Diagnostic[] {
  if (level === "off") return [];
  const diags: Diagnostic[] = [];

  /**
   * Check whether a given JSX element node has an accessible name.
   * Pushes a diagnostic if missing.
   *
   * @param node - The TypeScript AST node to analyze.
   */
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

  /**
   * Recursively visit all child nodes in the AST and run checks.
   *
   * @param n - The node to visit.
   */
  const visit = (n: ts.Node) => {
    checkHasAccessibleName(n);
    ts.forEachChild(n, visit);
  };

  visit(sf);
  return diags;
}
