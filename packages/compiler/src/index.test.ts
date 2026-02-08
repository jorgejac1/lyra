import { describe, it, expect } from "vitest";
import { compile } from "./index";
import type { CompileResult } from "./types";

describe("compile", () => {
  it("transforms directives", () => {
    const src =
      "export default function X(){ return <button on:click={fn} class:active={ok}></button>; }";
    const out = compile({
      filename: "x.lyra.tsx",
      source: src,
      a11yLevel: "off",
    });
    expect(out.code).toContain("data-on-click");
    expect(out.code).toContain("data-class-active");
  });

  it("emits a11y diagnostics", () => {
    const src = "export default function X(){ return <button>Go</button>; }";
    const out = compile({
      filename: "x.lyra.tsx",
      source: src,
      a11yLevel: "strict",
    });
    expect(out.diagnostics.some((d) => d.code === "LYRA_A11Y_001")).toBe(true);
  });

  it("handles parse errors and returns diagnostics", () => {
    const src = "export default function X( { return <div>; }";
    const out = compile({
      filename: "invalid.lyra.tsx",
      source: src,
      a11yLevel: "strict",
    });

    expect(out.diagnostics.length).toBeGreaterThan(0);
    expect(out.diagnostics[0].severity).toBe("error");
    expect(out.diagnostics[0].code).toMatch(/^TS\d+$/);
    expect(out.meta.transformed).toBe(false);
    expect(out.code).toBe(src);
  });

  it("handles catastrophic parse failure gracefully", () => {
    // Deeply nested malformed code that could cause parser issues
    const src = "(".repeat(1000) + "export default function X() {}";
    const out = compile({
      filename: "catastrophic.lyra.tsx",
      source: src,
      a11yLevel: "strict",
    });

    expect(out.diagnostics.length).toBeGreaterThan(0);
    expect(out.diagnostics.some((d) => d.severity === "error")).toBe(true);
    expect(out.meta.transformed).toBe(false);
  });

  it("types are consumable", () => {
    const result: CompileResult = {
      code: "",
      diagnostics: [],
      meta: { symbols: [], islands: false, a11yErrors: 0, transformed: true },
    };
    expect(result.meta.transformed).toBe(true);
  });

  it("handles non-Error exceptions in parse failure", () => {
    const src = "export default function X() { return <div>test</div>; }";
    const out = compile({
      filename: "test.lyra.tsx",
      source: src,
      a11yLevel: "strict",
    });

    expect(out.meta.transformed).toBe(true);
  });

  it("includes error message in diagnostic when parse fails", () => {
    const src = "export default function X( { return <div>; }";
    const out = compile({
      filename: "invalid.lyra.tsx",
      source: src,
      a11yLevel: "strict",
    });

    expect(out.diagnostics.length).toBeGreaterThan(0);
    expect(out.diagnostics[0].message).toBeTruthy();
    expect(typeof out.diagnostics[0].message).toBe("string");
  });

  it("generates source map when generateSourceMap is true", () => {
    const src =
      "export default function X(){ return <button on:click={fn} aria-label='go'>Go</button>; }";
    const out = compile({
      filename: "x.lyra.tsx",
      source: src,
      a11yLevel: "off",
      generateSourceMap: true,
    });
    expect(out.map).not.toBeNull();
    expect(out.map!.version).toBe(3);
    expect(out.map!.sources).toEqual(["x.lyra.tsx"]);
    expect(out.map!.sourcesContent).toEqual([src]);
    expect(typeof out.map!.mappings).toBe("string");
  });

  it("returns null map when generateSourceMap is false", () => {
    const src = "export default function X(){ return <div />; }";
    const out = compile({
      filename: "x.lyra.tsx",
      source: src,
      a11yLevel: "off",
      generateSourceMap: false,
    });
    expect(out.map).toBeNull();
  });

  it("handles non-Error exceptions in catastrophic parse failure", () => {
    const out = compile({
      filename: "test.lyra.tsx",
      source: "export default function X() {}",
      a11yLevel: "strict",
      // Inject a parser that throws a string (non-Error)
      parser: () => {
        throw "Some string error";
      },
    });

    expect(out.diagnostics.length).toBeGreaterThan(0);
    expect(out.diagnostics[0].code).toBe("LYRA_PARSE_ERROR");
    expect(out.diagnostics[0].message).toBe("Failed to parse source file");
    expect(out.meta.transformed).toBe(false);
  });
});
