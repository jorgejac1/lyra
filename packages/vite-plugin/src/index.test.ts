import { describe, it, expect, vi } from "vitest";
import plugin from "./index";

describe("vite plugin", () => {
  it("transforms .lyra.tsx code", async () => {
    const p = plugin();
    // Add aria-label to avoid a11y compiler error
    const code = `export default function X(){
      return <button aria-label="ok" on:click={fn}></button>;
    }`;

    const ctx = {
      error: (msg: string) => {
        throw new Error("unexpected: " + msg);
      },
      warn: (_: string) => {},
    };

    const res = await (p.transform as any).call(ctx, code, "foo.lyra.tsx");
    expect(res.code).toContain("data-on-click");
  });

  it("returns null for non-lyra files", async () => {
    const p = plugin();
    const res = await (p.transform as any).call(
      { error: () => { throw new Error("fail"); }, warn: () => {} },
      "const a=1;",
      "foo.tsx"
    );
    expect(res).toBeNull();
  });

  it("forwards diagnostics to warn/error (covers the loop)", async () => {
    // Isolate module state so our mock is used only in this test
    vi.resetModules();

    // Mock @lyra/compiler to return 1 warn + 1 error diagnostic
    vi.doMock("@lyra/compiler", () => {
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
          meta: { symbols: [], islands: false, a11yErrors: 1, transformed: true },
        })),
      };
    });

    // Re-import plugin so it picks up the mocked compiler
    const mockedPlugin = (await import("./index")).default;

    const warns: string[] = [];
    const errors: string[] = [];

    const ctx = {
      warn: (msg: string) => { warns.push(msg); },
      // Do not throw here; we want to assert the call happened
      error: (msg: string) => { errors.push(msg); },
    };

    const res = await (mockedPlugin().transform as any).call(
      ctx,
      `export default function X(){ return <div/> }`,
      "foo.lyra.tsx"
    );

    // Transform still returns wrapped code
    expect(res && typeof res.code === "string").toBe(true);

    // Both branches exercised
    expect(warns).toHaveLength(1);
    expect(warns[0]).toContain("LYRA_W: a warning (in f.tsx)");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("LYRA_E: an error (in g.tsx)");

    // Clean up the mock so other tests aren't affected
    vi.doUnmock("@lyra/compiler");
  });
});
