import { describe, it, expect, vi, afterEach } from "vitest";
import type { Plugin, TransformResult, ResolvedConfig } from "vite";
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

// Minimal shape we care about for configResolved tests
type Resolvable = { resolve: { extensions?: string[] } };

afterEach(() => {
  vi.restoreAllMocks();
});

/** Invoke configResolved regardless of function vs. { handler } form (no `any`). */
function runConfigResolved(p: Plugin, cfg: Resolvable): void {
  const hook = p.configResolved;
  expect(hook).toBeTruthy();
  // Cast once to the Vite type; operate on the same object reference
  const rc = cfg as unknown as ResolvedConfig;
  if (typeof hook === "function") {
    (hook as (c: ResolvedConfig) => void)(rc);
  } else {
    (hook as { handler: (c: ResolvedConfig) => void }).handler(rc);
  }
}

describe("vite plugin", () => {
  it("transforms .lyra.tsx code", async () => {
    const p: Plugin = plugin();

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
    vi.resetModules();

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

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const warns: string[] = [];
    const errors: string[] = [];

    const ctx: Ctx = {
      warn: (msg: string) => {
        warns.push(msg);
      },
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

    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain("LYRA_W: a warning (in f.tsx)");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("LYRA_E: an error (in g.tsx)");

    vi.doUnmock("@lyra-dev/compiler");
  });

  it("transforms .lyra.ts (not .tsx), preserves map, and exposes wrapper exports", async () => {
    vi.resetModules();

    vi.doMock("@lyra-dev/compiler", () => {
      return {
        compile: vi.fn(() => ({
          code: "export default 123;",
          map: { mappings: "" },
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
      expect(res.code).toContain(
        `import { mount, signal } from '@lyra-dev/runtime'`,
      );
      expect(res.code).toContain(`export { mount, signal }`);
      expect(res.map).toEqual({ mappings: "" });
    }

    vi.doUnmock("@lyra-dev/compiler");
  });

  it("handles missing diagnostics (undefined) with no logs", async () => {
    vi.resetModules();

    vi.doMock("@lyra-dev/compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 0;",
        map: null,
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

  it("covers info severity, code prefix/no-code, line/col, and fallback to id", async () => {
    vi.resetModules();

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

    expect(warns).toHaveLength(4);
    expect(warns[0]).toContain(
      "LYRA_I INFO_001: info with code and position (in test.tsx:10:5)",
    );
    expect(warns[1]).toContain(
      "LYRA_I: info without code but with position (in other.tsx:2:1)",
    );
    expect(warns[2]).toContain("LYRA_W WARN_002: warn with code (in warn.tsx)");
    expect(warns[3]).toContain(
      "LYRA_W: diagnostic with no filename or file (in test.lyra.tsx)",
    );

    vi.doUnmock("@lyra-dev/compiler");
  });
});

describe("vite plugin • configResolved extensions", () => {
  it("adds .lyra.tsx and .lyra.ts when missing", () => {
    const p: Plugin = plugin();

    const cfg: Resolvable = {
      resolve: {
        extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
      },
    };

    expect(cfg.resolve.extensions).not.toContain(".lyra.tsx");
    expect(cfg.resolve.extensions).not.toContain(".lyra.ts");

    runConfigResolved(p, cfg);

    const exts = cfg.resolve.extensions ?? [];
    expect(exts).toContain(".lyra.tsx");
    expect(exts).toContain(".lyra.ts");
  });

  it("does not duplicate entries if .lyra.tsx / .lyra.ts already exist", () => {
    const p: Plugin = plugin();

    const cfg: Resolvable = {
      resolve: {
        extensions: [
          ".mjs",
          ".js",
          ".ts",
          ".jsx",
          ".tsx",
          ".json",
          ".lyra.tsx",
          ".lyra.ts",
        ],
      },
    };

    runConfigResolved(p, cfg);

    const exts = cfg.resolve.extensions ?? [];
    const count = (ext: string) => exts.filter((e) => e === ext).length;

    expect(count(".lyra.tsx")).toBe(1);
    expect(count(".lyra.ts")).toBe(1);
  });

  it("initializes extensions when undefined and appends lyra ones", () => {
    const p: Plugin = plugin();

    const cfg: Resolvable = {
      resolve: {},
    };

    runConfigResolved(p, cfg);

    const exts = cfg.resolve.extensions ?? [];
    expect(Array.isArray(exts)).toBe(true);
    expect(exts).toEqual(
      expect.arrayContaining([
        ".mjs",
        ".js",
        ".ts",
        ".jsx",
        ".tsx",
        ".json",
        ".lyra.tsx",
        ".lyra.ts",
      ]),
    );
  });
});
