import { describe, it, expect } from "vitest";
import ts from "typescript";
import { runA11yChecks } from "./rules";

function check(src: string, level: "strict" | "warn" | "off" = "strict") {
  const sf = ts.createSourceFile("x.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return runA11yChecks(sf, "x.tsx", level);
}

describe("a11y rules", () => {
  it("flags input without accessible name", () => {
    const diags = check("export default () => <input />;");
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].code).toBe("LYRA_A11Y_001");
  });

  it("returns early for non-interactive tags (covers tag filter)", () => {
    const diags = check("export default () => <div />;");
    // Should return no diagnostics because <div> is not in the interactive set
    expect(diags.length).toBe(0);
  });

  it("handles attribute without initializer (covers : \"\")", () => {
    const diags = check("export default () => <input aria-label />;");
    // Attribute exists but has no value; initializer is undefined
    expect(diags.length).toBe(0); // no error, because aria-label is present
  });

  it('sets severity to "warn" when level="warn" (covers ternary else branch)', () => {
    const diags = check("export default () => <input />;", "warn");
    expect(diags.length).toBeGreaterThan(0);
    expect(diags[0].severity).toBe("warn"); // <-- covers "error" : "warn"
  });
});
