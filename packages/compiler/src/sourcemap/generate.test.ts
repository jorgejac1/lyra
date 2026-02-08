import { describe, it, expect } from "vitest";
import { vlqEncode, generateSourceMap } from "./generate";

describe("vlqEncode", () => {
  it("encodes 0", () => {
    expect(vlqEncode(0)).toBe("A");
  });

  it("encodes 1", () => {
    expect(vlqEncode(1)).toBe("C");
  });

  it("encodes -1", () => {
    expect(vlqEncode(-1)).toBe("D");
  });

  it("encodes 16 (requires continuation)", () => {
    // 16 << 1 = 32 = 0b100000
    // First digit: 0b00000 | 0x20 = 0b100000 = 32 -> 'g'
    // Second digit: 0b00001 = 1 -> 'B'
    expect(vlqEncode(16)).toBe("gB");
  });

  it("encodes larger values", () => {
    const result = vlqEncode(100);
    expect(result.length).toBeGreaterThan(1);
  });
});

describe("generateSourceMap", () => {
  it("produces valid V3 format", () => {
    const source = "line1\nline2\nline3";
    const output = "line1\nline2\nline3";
    const map = generateSourceMap("test.lyra.tsx", source, output);

    expect(map.version).toBe(3);
    expect(map.file).toBe("test.tsx");
    expect(map.sources).toEqual(["test.lyra.tsx"]);
    expect(map.sourcesContent).toEqual([source]);
  });

  it("has correct number of semicolons for output lines", () => {
    const source = "a\nb\nc";
    const output = "a\nb\nc";
    const map = generateSourceMap("x.lyra.tsx", source, output);

    // 3 lines → 2 semicolons separating them
    const semicolons = (map.mappings.match(/;/g) || []).length;
    expect(semicolons).toBe(2);
  });

  it("handles output with more lines than input", () => {
    const source = "a\nb";
    const output = "a\nb\nc\nd";
    const map = generateSourceMap("x.lyra.tsx", source, output);

    // 4 output lines → 3 semicolons
    const semicolons = (map.mappings.match(/;/g) || []).length;
    expect(semicolons).toBe(3);
  });

  it("handles single-line source", () => {
    const source = "const x = 1;";
    const output = "const x = 1;";
    const map = generateSourceMap("x.lyra.tsx", source, output);

    expect(map.mappings).not.toContain(";");
    expect(map.mappings.length).toBeGreaterThan(0);
  });

  it("includes source content for inline source maps", () => {
    const source = "hello world";
    const map = generateSourceMap("a.lyra.tsx", source, source);
    expect(map.sourcesContent[0]).toBe(source);
  });
});
