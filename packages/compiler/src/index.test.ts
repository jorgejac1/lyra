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

  it("types are consumable", () => {
    const result: CompileResult = {
      code: "",
      diagnostics: [],
      meta: { symbols: [], islands: false, a11yErrors: 0, transformed: true },
    };
    expect(result.meta.transformed).toBe(true);
  });
});
