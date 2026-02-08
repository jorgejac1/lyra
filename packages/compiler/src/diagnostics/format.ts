import type { Diagnostic } from "../types.js";

/**
 * Convert a byte offset to 1-based line and column numbers.
 */
export function offsetToLineColumn(
  source: string,
  offset: number,
): { line: number; column: number } {
  let line = 1;
  let column = 1;
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source[i] === "\n") {
      line++;
      column = 1;
    } else {
      column++;
    }
  }
  return { line, column };
}

/**
 * Format a diagnostic into a human-readable string.
 */
export function formatDiagnostic(d: Diagnostic, source?: string): string {
  const tag =
    d.severity === "error"
      ? "error"
      : d.severity === "warn"
        ? "warning"
        : "info";
  let location = d.file;
  if (source && d.start !== undefined) {
    const pos = offsetToLineColumn(source, d.start);
    location = `${d.file}:${pos.line}:${pos.column}`;
  }

  const lines: string[] = [];
  lines.push(`${tag} ${d.code}: ${d.message}`);
  lines.push(`  --> ${location}`);
  if (d.hint) {
    lines.push(`  hint: ${d.hint}`);
  }
  if (d.docUrl) {
    lines.push(`  docs: ${d.docUrl}`);
  }
  return lines.join("\n");
}

/**
 * Generate a codeframe-style output highlighting a span in source code.
 */
export function formatCodeFrame(
  source: string,
  start: number,
  length: number,
  contextLines = 2,
): string {
  const lines = source.split("\n");
  const pos = offsetToLineColumn(source, start);
  const targetLine = pos.line - 1; // 0-based index

  const startLine = Math.max(0, targetLine - contextLines);
  const endLine = Math.min(lines.length - 1, targetLine + contextLines);

  const gutterWidth = String(endLine + 1).length;
  const result: string[] = [];

  for (let i = startLine; i <= endLine; i++) {
    const lineNum = String(i + 1).padStart(gutterWidth, " ");
    const prefix = i === targetLine ? "> " : "  ";
    result.push(`${prefix}${lineNum} | ${lines[i]}`);

    if (i === targetLine) {
      // Calculate underline: column is 1-based, so offset by (column - 1)
      const underlineStart = pos.column - 1;
      // Clamp length to not exceed line length
      const underlineLen = Math.min(length, lines[i].length - underlineStart);
      const padding = " ".repeat(gutterWidth + 3 + underlineStart); // "  N | " prefix
      result.push(`${padding}${"^".repeat(Math.max(1, underlineLen))}`);
    }
  }

  return result.join("\n");
}
