import ts from "typescript";
import type { Diagnostic } from "../types";

/** Regex to strip surrounding quotes from attribute values. */
const STRIP_QUOTES = /^["']|["']$/g;

/** Pre-compiled regex for heading tags. */
const RE_HEADING = /^h[1-6]$/;

/**
 * Type guard: returns true if the node is a JSX opening or self-closing element.
 */
function isJsxElementNode(
  node: ts.Node,
): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement {
  return ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node);
}

/**
 * Extract JSX attributes from a JSX element into a Map.
 */
function getAttributes(
  node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
): Map<string, string> {
  const props = new Map<string, string>();
  node.attributes.properties.forEach((p: ts.JsxAttributeLike) => {
    if (ts.isJsxAttribute(p)) {
      const name = p.name.getText();
      const val = p.initializer ? p.initializer.getText() : "";
      props.set(name, val);
    }
  });
  return props;
}

/**
 * Check whether a JsxElement has non-empty child content
 * (text, expressions, or nested elements).
 */
function hasChildContent(element: ts.JsxElement): boolean {
  return element.children.some((child) => {
    if (ts.isJsxText(child)) return child.text.trim() !== "";
    if (ts.isJsxExpression(child)) return true;
    if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child))
      return true;
    return false;
  });
}

/**
 * Collect all `<label htmlFor="...">` values in the source file.
 */
function collectLabelTargets(sf: ts.SourceFile): Set<string> {
  const targets = new Set<string>();
  const visit = (n: ts.Node) => {
    if (isJsxElementNode(n)) {
      if (n.tagName.getText() === "label") {
        const props = getAttributes(n);
        const htmlFor = props.get("htmlFor") ?? props.get("for");
        if (htmlFor) {
          targets.add(htmlFor.replace(STRIP_QUOTES, ""));
        }
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return targets;
}

/**
 * Run static accessibility rules on a TSX source file.
 *
 * Rules:
 * - **LYRA_A11Y_001**: Interactive controls must have an accessible name.
 * - **LYRA_A11Y_002**: `<img>` must have an `alt` attribute.
 * - **LYRA_A11Y_003**: `<button>` must have visible text or an accessible label.
 * - **LYRA_A11Y_004**: Form controls with `id` must have a matching `<label htmlFor>`.
 * - **LYRA_A11Y_005**: `<a>` must have an `href` and accessible text.
 * - **LYRA_A11Y_006**: `tabindex` must not be greater than 0.
 * - **LYRA_A11Y_007**: Headings (`<h1>`-`<h6>`) must not be empty.
 * - **LYRA_A11Y_008**: `<iframe>` must have a `title` attribute.
 *
 * @param sf - Source file to check.
 * @param filename - File name for reporting.
 * @param level - Enforcement level ("strict" | "warn" | "off").
 * @returns Diagnostics for any violations found.
 */
export function runA11yChecks(
  sf: ts.SourceFile,
  filename: string,
  level: "strict" | "warn" | "off",
): Diagnostic[] {
  if (level === "off") return [];
  const diags: Diagnostic[] = [];
  const severity = level === "strict" ? "error" : "warn";
  const labelTargets = collectLabelTargets(sf);

  const visit = (n: ts.Node) => {
    if (isJsxElementNode(n)) {
      const tag = n.tagName.getText();
      const props = getAttributes(n);

      // LYRA_A11Y_001: Interactive controls must have an accessible name.
      if (
        tag === "input" ||
        tag === "select" ||
        tag === "textarea" ||
        tag === "button"
      ) {
        const hasName =
          props.has("aria-label") ||
          props.has("aria-labelledby") ||
          props.has("title") ||
          props.has("id");

        if (!hasName) {
          diags.push({
            code: "LYRA_A11Y_001",
            message: `Interactive <${tag}> lacks an accessible name (aria-label, aria-labelledby, title, or id).`,
            file: filename,
            start: n.getStart(),
            length: n.getWidth(),
            severity,
            hint: "Add aria-label, aria-labelledby, title, or associate a <label> using htmlFor and an id on the control.",
            docUrl: "https://lyra.dev/docs/a11y#LYRA_A11Y_001",
          });
        }
      }

      // LYRA_A11Y_002: `<img>` must have an `alt` attribute.
      if (tag === "img") {
        if (
          !props.has("alt") &&
          !props.has("aria-label") &&
          !props.has("aria-labelledby")
        ) {
          diags.push({
            code: "LYRA_A11Y_002",
            message:
              "<img> is missing an alt attribute. Images must have alternative text for accessibility.",
            file: filename,
            start: n.getStart(),
            length: n.getWidth(),
            severity,
            hint: 'Add alt="description" to describe the image, or alt="" for decorative images.',
            docUrl: "https://lyra.dev/docs/a11y#LYRA_A11Y_002",
          });
        }
      }

      // LYRA_A11Y_003: `<button>` must have visible text or an accessible label.
      if (tag === "button") {
        if (!props.has("aria-label") && !props.has("aria-labelledby")) {
          if (ts.isJsxSelfClosingElement(n)) {
            diags.push({
              code: "LYRA_A11Y_003",
              message:
                "<button> has no visible text or accessible label. Buttons must be labelled.",
              file: filename,
              start: n.getStart(),
              length: n.getWidth(),
              severity,
              hint: "Add text content inside the button, or add aria-label or aria-labelledby.",
              docUrl: "https://lyra.dev/docs/a11y#LYRA_A11Y_003",
            });
          } else if (!hasChildContent(n.parent as ts.JsxElement)) {
            diags.push({
              code: "LYRA_A11Y_003",
              message:
                "<button> has no visible text or accessible label. Buttons must be labelled.",
              file: filename,
              start: n.getStart(),
              length: n.getWidth(),
              severity,
              hint: "Add text content inside the button, or add aria-label or aria-labelledby.",
            });
          }
        }
      }

      // LYRA_A11Y_004: Form controls with `id` must have a matching `<label htmlFor>`.
      if (tag === "input" || tag === "select" || tag === "textarea") {
        if (!props.has("aria-label") && !props.has("aria-labelledby")) {
          if (props.has("id")) {
            const idValue = props.get("id")!.replace(STRIP_QUOTES, "");
            if (idValue && !labelTargets.has(idValue)) {
              diags.push({
                code: "LYRA_A11Y_004",
                message: `<${tag}> with id="${idValue}" has no associated <label htmlFor="${idValue}">.`,
                file: filename,
                start: n.getStart(),
                length: n.getWidth(),
                severity,
                hint: `Add <label htmlFor="${idValue}"> or use aria-label / aria-labelledby instead.`,
                docUrl: "https://lyra.dev/docs/a11y#LYRA_A11Y_004",
              });
            }
          }
        }
      }

      // LYRA_A11Y_005: `<a>` must have an `href` and accessible text.
      if (tag === "a") {
        if (!props.has("href")) {
          diags.push({
            code: "LYRA_A11Y_005",
            message:
              "<a> is missing an href attribute. Anchors without href are not keyboard-accessible.",
            file: filename,
            start: n.getStart(),
            length: n.getWidth(),
            severity,
            hint: 'Add href="..." to make the link navigable, or use a <button> for actions.',
            docUrl: "https://lyra.dev/docs/a11y#LYRA_A11Y_005",
          });
        }
      }

      // LYRA_A11Y_006: `tabindex` must not be greater than 0.
      const tabindexRaw = props.get("tabIndex") ?? props.get("tabindex");
      if (tabindexRaw) {
        const stripped = tabindexRaw.replace(/^["'{]|[}"']$/g, "");
        const num = Number(stripped);
        if (!Number.isNaN(num) && num > 0) {
          diags.push({
            code: "LYRA_A11Y_006",
            message: `tabindex="${stripped}" is greater than 0. Positive tabindex values disrupt natural tab order.`,
            file: filename,
            start: n.getStart(),
            length: n.getWidth(),
            severity,
            hint: 'Use tabindex="0" to make an element focusable in DOM order, or tabindex="-1" for programmatic focus only.',
            docUrl: "https://lyra.dev/docs/a11y#LYRA_A11Y_006",
          });
        }
      }

      // LYRA_A11Y_007: Headings (`<h1>`-`<h6>`) must not be empty.
      if (ts.isJsxOpeningElement(n) && RE_HEADING.test(tag)) {
        if (!props.has("aria-label") && !props.has("aria-labelledby")) {
          const parent = n.parent as ts.JsxElement;
          if (!hasChildContent(parent)) {
            diags.push({
              code: "LYRA_A11Y_007",
              message: `<${tag}> is empty. Headings must have text content for screen readers.`,
              file: filename,
              start: n.getStart(),
              length: n.getWidth(),
              severity,
              hint: `Add text content inside <${tag}>, or remove the empty heading.`,
              docUrl: "https://lyra.dev/docs/a11y#LYRA_A11Y_007",
            });
          }
        }
      }

      // LYRA_A11Y_008: `<iframe>` must have a `title` attribute.
      if (tag === "iframe") {
        if (
          !props.has("title") &&
          !props.has("aria-label") &&
          !props.has("aria-labelledby")
        ) {
          diags.push({
            code: "LYRA_A11Y_008",
            message:
              "<iframe> is missing a title attribute. Frames must have a title for accessibility.",
            file: filename,
            start: n.getStart(),
            length: n.getWidth(),
            severity,
            hint: 'Add title="description" to describe the iframe content.',
            docUrl: "https://lyra.dev/docs/a11y#LYRA_A11Y_008",
          });
        }
      }
    }

    ts.forEachChild(n, visit);
  };

  visit(sf);
  return diags;
}
