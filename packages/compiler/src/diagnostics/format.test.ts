import { describe, it, expect } from "vitest";
import {
  offsetToLineColumn,
  formatDiagnostic,
  formatCodeFrame,
} from "./format";
import type { Diagnostic } from "../types";

describe("offsetToLineColumn", () => {
  it("returns line 1 col 1 for offset 0", () => {
    expect(offsetToLineColumn("hello", 0)).toEqual({ line: 1, column: 1 });
  });

  it("handles offset in first line", () => {
    expect(offsetToLineColumn("hello", 3)).toEqual({ line: 1, column: 4 });
  });

  it("handles offset at start of second line", () => {
    expect(offsetToLineColumn("hello\nworld", 6)).toEqual({
      line: 2,
      column: 1,
    });
  });

  it("handles offset in third line", () => {
    const src = "aaa\nbbb\nccc";
    // offset 9 = 'c' at start of line 3
    expect(offsetToLineColumn(src, 8)).toEqual({ line: 3, column: 1 });
  });

  it("handles single-line source", () => {
    expect(offsetToLineColumn("abcdef", 5)).toEqual({ line: 1, column: 6 });
  });
});

describe("formatDiagnostic", () => {
  const baseDiag: Diagnostic = {
    code: "LYRA_A11Y_001",
    message: "Interactive <input> lacks an accessible name.",
    file: "test.tsx",
    severity: "error",
  };

  it("formats error diagnostic without source", () => {
    const result = formatDiagnostic(baseDiag);
    expect(result).toContain("error LYRA_A11Y_001");
    expect(result).toContain("--> test.tsx");
  });

  it("includes line/column when source and start are provided", () => {
    const src = "line1\nline2\nline3";
    const diag: Diagnostic = { ...baseDiag, start: 6 }; // start of line 2
    const result = formatDiagnostic(diag, src);
    expect(result).toContain("--> test.tsx:2:1");
  });

  it("includes hint when present", () => {
    const diag: Diagnostic = { ...baseDiag, hint: "Add aria-label." };
    const result = formatDiagnostic(diag);
    expect(result).toContain("hint: Add aria-label.");
  });

  it("includes docUrl when present", () => {
    const diag: Diagnostic = {
      ...baseDiag,
      docUrl: "https://lyra.dev/docs/a11y#LYRA_A11Y_001",
    };
    const result = formatDiagnostic(diag);
    expect(result).toContain("docs: https://lyra.dev/docs/a11y#LYRA_A11Y_001");
  });

  it("formats warning severity", () => {
    const diag: Diagnostic = { ...baseDiag, severity: "warn" };
    const result = formatDiagnostic(diag);
    expect(result).toContain("warning LYRA_A11Y_001");
  });

  it("formats info severity", () => {
    const diag: Diagnostic = { ...baseDiag, severity: "info" };
    const result = formatDiagnostic(diag);
    expect(result).toContain("info LYRA_A11Y_001");
  });
});

describe("formatCodeFrame", () => {
  const src = [
    "import { signal } from '@lyra-dev/runtime';",
    "",
    "export default function App() {",
    "  return (",
    "    <div>",
    "      <input />",
    "      <button>Go</button>",
    "    </div>",
    "  );",
    "}",
  ].join("\n");

  it("highlights the target line with carets", () => {
    // offset of <input /> on line 6
    const offset = src.indexOf("<input />");
    const result = formatCodeFrame(src, offset, 9);
    expect(result).toContain("> ");
    expect(result).toContain("^^^^^^^^^");
  });

  it("shows context lines around the target", () => {
    const offset = src.indexOf("<input />");
    const result = formatCodeFrame(src, offset, 9, 1);
    const lines = result.split("\n");
    // Should have: context before, target, carets, context after = 4 lines
    expect(lines.length).toBe(4);
  });

  it("handles target on first line", () => {
    const small = "const x = 1;\nconst y = 2;";
    const result = formatCodeFrame(small, 0, 5);
    expect(result).toContain("> ");
    expect(result).toContain("^^^^^");
  });

  it("clamps context to file boundaries", () => {
    const small = "line1\nline2";
    const result = formatCodeFrame(small, 6, 5, 5);
    // Should not crash; only 2 lines exist
    const lines = result.split("\n").filter((l) => l.includes("|"));
    expect(lines.length).toBe(2);
  });
});
