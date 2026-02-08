import { describe, it, expect } from "vitest";
import ts from "typescript";
import { transformReactivity } from "./reactivity";
import type { Diagnostic } from "../types";

function transform(src: string) {
  const sf = ts.createSourceFile(
    "t.tsx",
    src,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const result = ts.transform<ts.SourceFile>(sf, [
    (ctx) => (n) => transformReactivity(n, ctx, "t.tsx"),
  ]);
  const transformed = result.transformed[0];
  const printer = ts.createPrinter();
  const code = printer.printFile(transformed);
  const diags =
    (transformed as unknown as { _lyra_diags?: Diagnostic[] })._lyra_diags ??
    [];
  return { code, diags };
}

describe("transformReactivity", () => {
  it("rewrites on:click", () => {
    const { code } = transform("<button on:click={fn}></button>");
    expect(code).toContain("data-on-click");
  });

  it("rewrites class:done", () => {
    const { code } = transform("<div class:done={x}></div>");
    expect(code).toContain("data-class-done");
  });

  it("keeps spread attributes untouched", () => {
    // triggers !ts.isJsxAttribute branch
    const { code } = transform("<div {...props}></div>");
    expect(code).toContain("{...props}");
  });

  it("handles directive with no initializer (falls back to undefined)", () => {
    // <div on:click /> produces attribute with initializer = undefined
    const { code } = transform("<div on:click />");
    expect(code).toContain("data-on-click");
    // no expression should be emitted
    expect(code).not.toContain("{fn}");
  });

  it("handles self-closing elements", () => {
    // ensures ts.isJsxSelfClosingElement path is taken
    const { code } = transform("<img class:visible={cond} />");
    expect(code).toContain("data-class-visible");
    expect(code).toContain("<img");
    expect(code).toContain("/>");
  });

  it("handles bare class directive with no initializer", () => {
    // This triggers the : undefined branch
    const { code } = transform("<div class:foo />");
    expect(code).toContain("data-class-foo");
    // No explicit expression should be present
    expect(code).not.toContain("{");
  });

  it("falls back to sf.fileName when filename is not provided", () => {
    const sf = ts.createSourceFile(
      "fallback.tsx",
      '<button on:click="handleClick"></button>',
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const result = ts.transform<ts.SourceFile>(sf, [
      (ctx) => (n) => transformReactivity(n, ctx), // no filename
    ]);
    const transformed = result.transformed[0];
    const diags =
      (transformed as unknown as { _lyra_diags?: Diagnostic[] })._lyra_diags ??
      [];
    // Should use sf.fileName as fallback
    expect(diags).toHaveLength(1);
    expect(diags[0].file).toBe("fallback.tsx");
  });

  it("emits diagnostic when directive uses string literal instead of expression", () => {
    // String literal instead of expression - invalid
    const { code, diags } = transform(
      '<button on:click="handleClick"></button>',
    );

    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe("LYRA_DIRECTIVE_STRING");
    expect(diags[0].message).toContain(
      'Directive "on:click" should use an expression {value}',
    );
    expect(diags[0].message).toContain('not a string literal "handleClick"');
    expect(diags[0].severity).toBe("warn");
    expect(diags[0].hint).toContain("on:click={handleClick}");

    // Should still transform it
    expect(code).toContain("data-on-click");
  });

  it("emits diagnostic when class directive uses string literal", () => {
    const { code, diags } = transform('<div class:active="isActive"></div>');

    expect(diags).toHaveLength(1);
    expect(diags[0].code).toBe("LYRA_DIRECTIVE_STRING");
    expect(diags[0].message).toContain('Directive "class:active"');

    expect(code).toContain("data-class-active");
  });
});
