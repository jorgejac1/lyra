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
              severity: "warn" as const,
            },
            {
              code: "LYRA_E",
              message: "an error",
              file: "g.tsx",
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

  it("does not add wrapper for code without runtime features", async () => {
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
      // Code doesn't use runtime features, so no wrapper
      expect(res.code).toBe("export default 123;");
      expect(res.code).not.toContain("import { mount, signal }");
      expect(res.map).toEqual({ mappings: "" });
    }

    vi.doUnmock("@lyra-dev/compiler");
  });

  it("adds wrapper when code uses signals", async () => {
    vi.resetModules();

    vi.doMock("@lyra-dev/compiler", () => {
      return {
        compile: vi.fn(() => ({
          code: "const count = signal(0); export default count;",
          map: null,
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
      "const count = signal(0);",
      "test.lyra.tsx",
    );

    expect(res && typeof res !== "string" && typeof res.code === "string").toBe(
      true,
    );
    if (res && typeof res !== "string") {
      // Code uses 'signal', so wrapper should be added
      expect(res.code).toContain(
        `import { mount, signal } from '@lyra-dev/runtime'`,
      );
      expect(res.code).toContain(`export { mount, signal }`);
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

  it("uses `file` when available and formats position correctly", async () => {
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

  it("covers info severity, code prefix/no-code, position, and fallback to id", async () => {
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
            file: "test.tsx",
            start: 100,
            length: 10,
          },
          {
            message: "info without code but with position",
            severity: "info" as const,
            file: "other.tsx",
            start: 50,
            length: 5,
          },
          {
            code: "WARN_002",
            message: "warn with code",
            severity: "warn" as const,
            file: "warn.tsx",
          },
          {
            message: "diagnostic with no file",
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
    // Position format is :start+length
    expect(warns[0]).toContain(
      "LYRA_I INFO_001: info with code and position (in test.tsx:100+10)",
    );
    expect(warns[1]).toContain(
      "LYRA_I: info without code but with position (in other.tsx:50+5)",
    );
    expect(warns[2]).toContain("LYRA_W WARN_002: warn with code (in warn.tsx)");
    expect(warns[3]).toContain(
      "LYRA_W: diagnostic with no file (in test.lyra.tsx)",
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

  it("throws error when compiler returns invalid result", async () => {
    vi.resetModules();

    vi.doMock("@lyra-dev/compiler", () => ({
      compile: vi.fn(() => ({
        code: 123, // Invalid: code should be a string
        map: null,
        diagnostics: [],
        meta: { symbols: [], islands: false, a11yErrors: 0, transformed: true },
      })),
    }));

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const errors: string[] = [];
    const ctx: Ctx = {
      warn: () => {},
      error: (msg: string) => {
        errors.push(msg);
      },
    };

    const transform = p.transform as TransformFn;
    await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "export default 123",
      "test.lyra.tsx",
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]).toBe("Lyra compilation failed: no code returned");

    vi.doUnmock("@lyra-dev/compiler");
  });
});

describe("vite plugin • buildStart runtime detection", () => {
  it("does not warn when @lyra-dev/runtime is available (workspace)", async () => {
    const p: Plugin = plugin();

    const warns: string[] = [];
    const hook = p.buildStart;

    if (typeof hook === "function") {
      await (hook as (this: { warn(m: string): void }) => Promise<void>).call({
        warn: (msg: string) => warns.push(msg),
      });
    }

    expect(warns).toHaveLength(0);
  });

  it("warns when @lyra-dev/runtime is not installed", async () => {
    vi.resetModules();

    // Mock runtime to throw (simulates it not being installed)
    vi.doMock("@lyra-dev/runtime", () => {
      throw new Error("MODULE_NOT_FOUND");
    });

    vi.doMock("@lyra-dev/compiler", () => ({
      compile: vi.fn(),
      offsetToLineColumn: vi.fn(),
    }));

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const warns: string[] = [];
    const hook = p.buildStart;

    if (typeof hook === "function") {
      await (hook as (this: { warn(m: string): void }) => Promise<void>).call({
        warn: (msg: string) => warns.push(msg),
      });
    }

    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain("@lyra-dev/runtime is not installed");

    vi.doUnmock("@lyra-dev/runtime");
    vi.doUnmock("@lyra-dev/compiler");
  });
});

describe("vite plugin • invalid import detection", () => {
  it("warns on invalid @lyra-dev/* imports", async () => {
    vi.resetModules();

    vi.doMock("@lyra-dev/compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 0;",
        map: null,
        diagnostics: [],
        meta: { symbols: [], islands: false, a11yErrors: 0, transformed: true },
      })),
      offsetToLineColumn: vi.fn(() => ({ line: 1, column: 1 })),
    }));

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const warns: string[] = [];
    const ctx: Ctx = {
      warn: (msg: string) => warns.push(msg),
      error: () => {},
    };

    const transform = p.transform as TransformFn;
    await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      'import { foo } from "@lyra-dev/nonexistent";',
      "test.lyra.tsx",
    );

    expect(warns.some((w) => w.includes("Unknown Lyra package import"))).toBe(
      true,
    );

    vi.doUnmock("@lyra-dev/compiler");
  });
});

describe("vite plugin • plugin options", () => {
  it("passes a11yLevel option to compiler", async () => {
    vi.resetModules();

    const compileSpy = vi.fn(() => ({
      code: "export default 0;",
      map: null,
      diagnostics: [],
      meta: { symbols: [], islands: false, a11yErrors: 0, transformed: true },
    }));

    vi.doMock("@lyra-dev/compiler", () => ({
      compile: compileSpy,
      offsetToLineColumn: vi.fn(() => ({ line: 1, column: 1 })),
    }));

    const mockedPlugin = (await import("./index")).default;
    const p = mockedPlugin({ a11yLevel: "off" });

    const ctx: Ctx = { warn: () => {}, error: () => {} };
    const transform = p.transform as TransformFn;
    await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "export default 0",
      "test.lyra.tsx",
    );

    expect(compileSpy).toHaveBeenCalledWith(
      expect.objectContaining({ a11yLevel: "off" }),
    );

    vi.doUnmock("@lyra-dev/compiler");
  });

  it("provides structured error with loc for error diagnostics with position", async () => {
    vi.resetModules();

    vi.doMock("@lyra-dev/compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 0;",
        map: null,
        diagnostics: [
          {
            code: "LYRA_A11Y_001",
            message: "an error with position",
            file: "test.tsx",
            severity: "error" as const,
            start: 10,
            length: 5,
          },
        ],
        meta: { symbols: [], islands: false, a11yErrors: 1, transformed: true },
      })),
      offsetToLineColumn: vi.fn(() => ({ line: 2, column: 5 })),
    }));

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const errors: unknown[] = [];
    const ctx: Ctx = {
      warn: () => {},
      error: ((msg: unknown) => {
        errors.push(msg);
      }) as Ctx["error"],
    };

    const transform = p.transform as TransformFn;
    await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "export default 0",
      "test.lyra.tsx",
    );

    expect(errors).toHaveLength(1);
    // The error should be an Error object with loc property
    const err = errors[0] as Error & {
      loc?: { line: number; column: number };
    };
    expect(err).toBeInstanceOf(Error);
    expect(err.loc).toEqual({ line: 2, column: 5 });

    vi.doUnmock("@lyra-dev/compiler");
  });

  it("falls back to transform id when error diagnostic has no file", async () => {
    vi.resetModules();

    vi.doMock("@lyra-dev/compiler", () => ({
      compile: vi.fn(() => ({
        code: "export default 0;",
        map: null,
        diagnostics: [
          {
            code: "LYRA_ERR",
            message: "error without file",
            severity: "error" as const,
            start: 5,
            length: 3,
          },
        ],
        meta: { symbols: [], islands: false, a11yErrors: 1, transformed: true },
      })),
      offsetToLineColumn: vi.fn(() => ({ line: 1, column: 6 })),
    }));

    const mockedPlugin: () => Plugin = (await import("./index")).default;
    const p = mockedPlugin();

    const errors: unknown[] = [];
    const ctx: Ctx = {
      warn: () => {},
      error: ((msg: unknown) => {
        errors.push(msg);
      }) as Ctx["error"],
    };

    const transform = p.transform as TransformFn;
    await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "export default 0",
      "fallback-id.lyra.tsx",
    );

    expect(errors).toHaveLength(1);
    const err = errors[0] as Error & { id?: string };
    expect(err).toBeInstanceOf(Error);
    // Falls back to the transform id when d.file is undefined
    expect(err.id).toBe("fallback-id.lyra.tsx");

    vi.doUnmock("@lyra-dev/compiler");
  });

  it("excludes files matching exclude pattern", async () => {
    const p: Plugin = plugin({ exclude: /node_modules/ });

    const ctx: Ctx = {
      error: () => {
        throw new Error("should not be called");
      },
      warn: () => {},
    };

    const transform = p.transform as TransformFn;
    const res = await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "const a=1;",
      "node_modules/pkg/file.lyra.tsx",
    );

    expect(res).toBeNull();
  });

  it("excludes files not matching include pattern", async () => {
    const p: Plugin = plugin({ include: ["src/"], exclude: undefined });

    const ctx: Ctx = {
      error: () => {
        throw new Error("should not be called");
      },
      warn: () => {},
    };

    const transform = p.transform as TransformFn;
    const res = await (transform as Exclude<TransformFn, undefined>).call(
      ctx,
      "const a=1;",
      "lib/other.lyra.tsx",
    );

    expect(res).toBeNull();
  });
});
