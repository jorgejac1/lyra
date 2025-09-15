import { describe, it, expect } from "vitest";
import type { CompileResult } from "./types";

describe("types", () => {
  it("can reference CompileResult type", () => {
    const result: CompileResult = {
      code: "",
      diagnostics: [],
      meta: { symbols: [], islands: false, a11yErrors: 0, transformed: true },
    };
    expect(result.meta.transformed).toBe(true);
  });
});
