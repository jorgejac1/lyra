import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Reset module cache each test so the CLI's top-level code re-runs.
beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function importCliCatching() {
  try {
    await import("./index");
    return null;
  } catch (e) {
    return e as Error | null;
  }
}

describe("cli top-level script", () => {
  it("prints usage and exits with code 1 when no filename is provided", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli"];

    // Match the broader process.exit signature used by Node types
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      // throw to stop module execution after exit is called
      throw Object.assign(new Error("EXIT"), { code });
    }) as unknown as () => never);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const err = await importCliCatching();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0][0])).toMatch(
      /Usage: lyra-compile <file\.lyra\.tsx>/,
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(err).toBeTruthy();

    process.argv = origArgv;
  });

  it("reads .lyra.tsx, compiles, writes .tsx, and logs diagnostics + emitted path", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "/tmp/foo.lyra.tsx"];

    // Mock fs
    const writeFileSync = vi.fn();
    const readFileSync = vi.fn(
      () => "export default function X(){ return <button on:click={fn}/> }",
    );
    vi.doMock("node:fs", () => ({
      default: { readFileSync, writeFileSync },
      readFileSync,
      writeFileSync,
    }));

    // Mock compiler to return transformed code + diagnostics
    const compile = vi.fn(() => ({
      code: "/* transformed */ export default 0;",
      diagnostics: [
        {
          code: "LYRA_W",
          message: "warn",
          file: "x.tsx",
          severity: "warn" as const,
        },
        {
          code: "LYRA_E",
          message: "err",
          file: "y.tsx",
          severity: "error" as const,
        },
      ],
      meta: { symbols: [], islands: false, a11yErrors: 1, transformed: true },
      map: null,
    }));
    vi.doMock("@lyra/compiler", () => ({ compile }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const err = await importCliCatching();
    expect(err).toBeNull();

    // Assert: read input
    expect(readFileSync).toHaveBeenCalledWith("/tmp/foo.lyra.tsx", "utf8");

    // Assert: compile called with file + source (safe access to mock calls)
    const calls = (compile as unknown as { mock: { calls: unknown[][] } }).mock
      .calls;
    expect(calls.length).toBe(1);
    const [compileArgs] = calls[0] as [{ filename: string; source: string }];
    expect(compileArgs.filename).toBe("/tmp/foo.lyra.tsx");
    expect(typeof compileArgs.source).toBe("string");

    // Assert: wrote the .tsx output next to input
    expect(writeFileSync).toHaveBeenCalledTimes(1);
    expect(writeFileSync.mock.calls[0][0]).toBe("/tmp/foo.tsx");
    expect(String(writeFileSync.mock.calls[0][1])).toContain(
      "/* transformed */",
    );

    // Diagnostics summary & emitted path logs
    const joinedLogs = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joinedLogs).toMatch(/Lyra:\s*2 diagnostics \(1 error\)/);
    expect(joinedLogs).toMatch(/Emitted:\s*\/tmp\/foo\.tsx/);

    process.argv = origArgv;
  });

  it("logs singular '1 error' when only one error diagnostic exists", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "/tmp/foo.lyra.tsx"];

    const writeFileSync = vi.fn();
    const readFileSync = vi.fn(
      () => "export default function X(){ return <div/> }",
    );
    vi.doMock("node:fs", () => ({
      default: { readFileSync, writeFileSync },
      readFileSync,
      writeFileSync,
    }));

    const compile = vi.fn(() => ({
      code: "/* transformed */ export default 0;",
      diagnostics: [
        {
          code: "LYRA_E",
          message: "err",
          file: "x.tsx",
          severity: "error" as const,
        },
      ],
      meta: { symbols: [], islands: false, a11yErrors: 1, transformed: true },
      map: null,
    }));
    vi.doMock("@lyra/compiler", () => ({ compile }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const err = await importCliCatching();
    expect(err).toBeNull();

    const joinedLogs = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joinedLogs).toMatch(/Lyra: 1 diagnostics \(1 error\)/);

    process.argv = origArgv;
  });

  it("logs plural 'errors' when there are multiple error diagnostics", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "/tmp/foo.lyra.tsx"];

    // fresh module graph for this test
    vi.resetModules();

    // Mock fs
    const writeFileSync = vi.fn();
    const readFileSync = vi.fn(
      () => "export default function X(){ return <div/> }",
    );
    vi.doMock("node:fs", () => ({
      default: { readFileSync, writeFileSync },
      readFileSync,
      writeFileSync,
    }));

    // Mock compiler -> TWO errors (so "errors" must be plural)
    const compile = vi.fn(() => ({
      code: "/* transformed */ export default 0;",
      diagnostics: [
        {
          code: "E1",
          message: "err1",
          file: "a.tsx",
          severity: "error" as const,
        },
        {
          code: "E2",
          message: "err2",
          file: "b.tsx",
          severity: "error" as const,
        },
      ],
      meta: { symbols: [], islands: false, a11yErrors: 2, transformed: true },
      map: null,
    }));
    vi.doMock("@lyra/compiler", () => ({ compile }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const importCliCatching = async () => {
      try {
        await import("./index");
        return null;
      } catch (e) {
        return e as Error | null;
      }
    };
    const err = await importCliCatching();
    expect(err).toBeNull();

    // Assert plural branch used: "... 2 diagnostics (2 errors)"
    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toMatch(/Lyra:\s*2 diagnostics \(2 errors\)/);

    process.argv = origArgv;
  });
});
