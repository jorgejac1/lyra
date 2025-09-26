import { describe, it, expect, vi } from "vitest";
import type { Plugin, TransformResult } from "vite";
import plugin from "./index";

type Ctx = { error(msg: string): never | void; warn(msg: string): void };
type TransformFn =
  | ((
      this: Ctx,
      code: string,
      id: string,
      options?: { ssr?: boolean },
    ) => TransformResult | null | Promise<TransformResult | null>)
  | undefined;

describe("vite plugin", () => {
  it("transforms .lyra.tsx code", async () => {
    const p: Plugin = plugin();

    // Add aria-label to avoid a11y compiler error
    const code = `export default function X(){
      return <button aria-label="ok" on:click={fn}></button>;
    }`;

    const ctx: Ctx = {
      error: (msg: string) => {
        throw new Error("unexpected: " + msg);
      },
      warn: () => {},
    };

    const transform = p.transform as TransformFn;
    expect(transform).toBeInstanceOf(Function);

    const res = await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      code,
      "foo.lyra.tsx",
    );

    expect(res && typeof res.code === "string").toBe(true);
    if (res && typeof res !== "string") {
      expect(res.code).toContain("data-on-click");
    }
  });

  it("returns null for non-lyra files", async () => {
    const p: Plugin = plugin();

    const ctx: Ctx = {
      error: () => {
        throw new Error("fail");
      },
      warn: () => {},
    };

    const transform = p.transform as TransformFn;
    expect(transform).toBeInstanceOf(Function);

    const res = await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "const a=1;",
      "foo.tsx",
    );

    expect(res).toBeNull();
  });

  it("forwards diagnostics to warn/error (covers the loop)", async () => {
    // Isolate module state so our mock is used only in this test
    vi.resetModules();

    // Mock @lyra-dev/compiler to return 1 warn + 1 error diagnostic
    vi.doMock("@lyra-dev/compiler", () => {
      return {
        compile: vi.fn(() => ({
          code: "export default 0;",
          map: null,
          diagnostics: [
            {
              code: "LYRA_W",
              message: "a warning",
              file: "f.tsx",
              filename: "f.tsx",
              severity: "warn" as const,
            },
            {
              code: "LYRA_E",
              message: "an error",
              file: "g.tsx",
              filename: "g.tsx",
              severity: "error" as const,
            },
          ],
          meta: {
            symbols: [],
            islands: false,
            a11yErrors: 1,
            transformed: true,
          },
        })),
      };
    });

    // Re-import plugin so it picks up the mocked compiler
    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const warns: string[] = [];
    const errors: string[] = [];

    const ctx: Ctx = {
      warn: (msg: string) => {
        warns.push(msg);
      },
      // Do not throw here; we want to assert the call happened
      error: (msg: string) => {
        errors.push(msg);
      },
    };

    const transform = p.transform as TransformFn;
    expect(transform).toBeInstanceOf(Function);

    const res = await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      `export default function X(){ return <div/> }`,
      "foo.lyra.tsx",
    );

    expect(res && typeof res.code === "string").toBe(true);

    // Both branches exercised
    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain("LYRA_W: a warning (in f.tsx)");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("LYRA_E: an error (in g.tsx)");

    // Clean up the mock so other tests aren't affected
    vi.doUnmock("@lyra-dev/compiler");
  });

  it("transforms .lyra.ts (not .tsx), preserves map, and exposes wrapper exports", async () => {
    vi.resetModules();

    // Mock compiler to return code + minimal source map
    vi.doMock("@lyra-dev/compiler", () => {
      return {
        compile: vi.fn(() => ({
          code: "export default 123;",
          map: { mappings: "" }, // vite accepts this shape
          diagnostics: [],
          meta: {
            symbols: [],
            islands: false,
            a11yErrors: 0,
            transformed: true,
          },
        })),
      };
    });

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const ctx: Ctx = { warn: () => {}, error: () => {} };
    const transform = p.transform as TransformFn;
    const res = await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "export default 123",
      "bar.lyra.ts",
    );

    expect(res && typeof res !== "string" && typeof res.code === "string").toBe(
      true,
    );
    if (res && typeof res !== "string") {
      // wrapper import+export present
      expect(res.code).toContain(
        `import { mount, signal } from '@lyra-dev/runtime'`,
      );
      expect(res.code).toContain(`export { mount, signal }`);
      // map forwarded
      expect(res.map).toEqual({ mappings: "" });
    }

    vi.doUnmock("@lyra-dev/compiler");
  });

  it("handles missing diagnostics (undefined) with no logs", async () => {
    vi.resetModules();

    // No `diagnostics` field -> exercises `res.diagnostics ?? []`
    vi.doMock("@lyra-dev/compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 0;",
        map: null,
        // diagnostics intentionally omitted
        meta: { symbols: [], islands: false, a11yErrors: 0, transformed: true },
      })),
    }));

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const warn = vi.fn();
    const error = vi.fn();
    const ctx: Ctx = { warn, error };

    const transform = p.transform as TransformFn;
    const res = await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "export default 0",
      "no-diags.lyra.tsx",
    );

    expect(res && typeof res.code === "string").toBe(true);
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();

    vi.doUnmock("@lyra-dev/compiler");
  });

  it("uses `file` when `filename` is missing and omits code prefix", async () => {
    vi.resetModules();

    // Only `file` provided; no `code` -> exercises filename/file chain and code-less branch
    vi.doMock("@lyra-dev/compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 0;",
        map: null,
        diagnostics: [
          { message: "file-only", file: "h.tsx", severity: "warn" as const },
        ],
        meta: { symbols: [], islands: false, a11yErrors: 0, transformed: true },
      })),
    }));

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const warns: string[] = [];
    const ctx: Ctx = { warn: (m) => warns.push(m), error: () => {} };

    const transform = p.transform as TransformFn;
    const res = await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "export default 0",
      "z.lyra.tsx",
    );

    expect(res && typeof res.code === "string").toBe(true);

    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain(" (in h.tsx)");
    expect(warns[0].startsWith("LYRA_W: ")).toBe(true);

    vi.doUnmock("@lyra-dev/compiler");
  });

  it("covers all diagnostic formatting branches (info severity, code prefix, line/col)", async () => {
    vi.resetModules();

    // Mock compiler to return diagnostics that exercise uncovered branches
    vi.doMock("@lyra-dev/compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 0;",
        map: null,
        diagnostics: [
          {
            code: "INFO_001",
            message: "info with code and position",
            severity: "info" as const,
            filename: "test.tsx",
            start: { line: 10, column: 5 },
          },
          {
            message: "info without code but with position",
            severity: "info" as const,
            file: "other.tsx",
            start: { line: 2, column: 1 },
          },
          {
            code: "WARN_002",
            message: "warn with code",
            severity: "warn" as const,
            filename: "warn.tsx",
          },
          {
            message: "diagnostic with no filename or file",
            severity: "warn" as const,
            // No filename or file property - will fallback to id
          },
        ],
        meta: { symbols: [], islands: false, a11yErrors: 0, transformed: true },
      })),
    }));

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const warns: string[] = [];
    const ctx: Ctx = {
      warn: (msg: string) => warns.push(msg),
      error: () => {},
    };

    const transform = p.transform as TransformFn;
    const res = await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "export default 0",
      "test.lyra.tsx",
    );

    expect(res && typeof res.code === "string").toBe(true);

    // All diagnostics should be warnings since info and warn both go to warn()
    expect(warns).toHaveLength(4);

    // Check that LYRA_I tag is used for info severity
    expect(warns[0]).toContain(
      "LYRA_I INFO_001: info with code and position (in test.tsx:10:5)",
    );

    // Check that LYRA_I is used when no code is present, and line:col formatting works
    expect(warns[1]).toContain(
      "LYRA_I: info without code but with position (in other.tsx:2:1)",
    );

    // Check that LYRA_W with code works (no line:col since start is missing)
    expect(warns[2]).toContain("LYRA_W WARN_002: warn with code (in warn.tsx)");

    // Check that fallback to id works when neither filename nor file is provided
    expect(warns[3]).toContain(
      "LYRA_W: diagnostic with no filename or file (in test.lyra.tsx)",
    );

    vi.doUnmock("@lyra-dev/compiler");
  });
});
