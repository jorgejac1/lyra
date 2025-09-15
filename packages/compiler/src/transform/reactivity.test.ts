import { describe, it, expect } from "vitest";
import ts from "typescript";
import { transformReactivity } from "./reactivity";

function transform(src: string) {
  const sf = ts.createSourceFile("t.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const result = ts.transform<ts.SourceFile>(sf, [ctx => n => transformReactivity(n, ctx)]);
  const printer = ts.createPrinter();
  return printer.printFile(result.transformed[0]);
}

describe("transformReactivity", () => {
  it("rewrites on:click", () => {
    const out = transform("<button on:click={fn}></button>");
    expect(out).toContain("data-on-click");
  });

  it("rewrites class:done", () => {
    const out = transform("<div class:done={x}></div>");
    expect(out).toContain("data-class-done");
  });

  it("keeps spread attributes untouched", () => {
    // triggers !ts.isJsxAttribute branch
    const out = transform("<div {...props}></div>");
    expect(out).toContain("{...props}");
  });

  it("handles directive with no initializer (falls back to undefined)", () => {
    // <div on:click /> produces attribute with initializer = undefined
    const out = transform("<div on:click />");
    expect(out).toContain("data-on-click");
    // no expression should be emitted
    expect(out).not.toContain("{fn}");
  });

  it("handles self-closing elements", () => {
    // ensures ts.isJsxSelfClosingElement path is taken
    const out = transform("<img class:visible={cond} />");
    expect(out).toContain("data-class-visible");
    expect(out).toContain("<img");
    expect(out).toContain("/>");
  });

  it("handles bare class directive with no initializer", () => {
    // This triggers the : undefined branch
    const out = transform("<div class:foo />");
    expect(out).toContain("data-class-foo");
    // No explicit expression should be present
    expect(out).not.toContain("{");
  });
});
