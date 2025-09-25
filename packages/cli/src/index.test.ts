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

/** Mock both sync and async fs APIs, whichever the CLI uses. */
function mockFsBoth({
  source = "export default function X(){ return <button on:click={fn}/> }",
}: { source?: string } = {}) {
  // async
  const writeFile = vi.fn(async () => {});
  const readFile = vi.fn(async () => source);
  vi.doMock("node:fs/promises", () => ({
    default: { readFile, writeFile },
    readFile,
    writeFile,
  }));

  // sync
  const writeFileSync = vi.fn(() => {});
  const readFileSync = vi.fn(() => source);
  vi.doMock("node:fs", () => ({
    default: { readFileSync, writeFileSync },
    readFileSync,
    writeFileSync,
  }));

  return { writeFile, readFile, writeFileSync, readFileSync };
}

describe("cli top-level script", () => {
  it("prints usage and exits with code 1 when no filename is provided", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli"];

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw Object.assign(new Error("EXIT"), { code });
    }) as unknown as () => never);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const err = await importCliCatching();

    expect(errorSpy).toHaveBeenCalledTimes(1);

    // Accept either "lyra-compile" (old) or "lyra" (new), with optional [out.tsx]
    expect(String(errorSpy.mock.calls[0][0])).toMatch(
      /Usage: (lyra-compile|lyra) <file\.lyra\.tsx>( \[out\.tsx\])?/,
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(err).toBeTruthy();

    process.argv = origArgv;
  });

  it("reads .lyra.tsx, compiles, writes .tsx, and logs diagnostics + emitted path", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "/tmp/foo.lyra.tsx"];

    const { writeFile, readFile, writeFileSync, readFileSync } = mockFsBoth({
      source: "export default function X(){ return <button on:click={fn}/> }",
    });

    // Mock compiler to return transformed code + diagnostics
    const compile = vi.fn(() => ({
      code: "/* transformed */ export default 0;",
      diagnostics: [
        {
          code: "LYRA_W",
          message: "warn",
          file: "x.tsx",
          filename: "x.tsx",
          severity: "warn" as const,
        },
        {
          code: "LYRA_E",
          message: "err",
          file: "y.tsx",
          filename: "y.tsx",
          severity: "error" as const,
        },
      ],
      meta: { symbols: [], islands: false, a11yErrors: 1, transformed: true },
      map: null,
    }));
    vi.doMock("@lyra-dev/compiler", () => ({ compile }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const err = await importCliCatching();
    expect(err).toBeNull();

    // Assert: read input (either sync or async path)
    // Assert: read input (either sync or async path)
    const asyncCalled = readFile.mock.calls.length > 0;
    const syncCalled = readFileSync.mock.calls.length > 0;
    expect(asyncCalled || syncCalled).toBe(true);

    if (asyncCalled) {
      expect(readFile).toHaveBeenCalledWith("/tmp/foo.lyra.tsx", "utf8");
    } else {
      expect(readFileSync).toHaveBeenCalledWith("/tmp/foo.lyra.tsx", "utf8");
    }

    // Assert: compile called with file + source
    const calls = (compile as unknown as { mock: { calls: unknown[][] } }).mock
      .calls;
    expect(calls.length).toBe(1);
    const [compileArgs] = calls[0] as [{ filename: string; source: string }];
    expect(compileArgs.filename).toBe("/tmp/foo.lyra.tsx");
    expect(typeof compileArgs.source).toBe("string");

    // Assert: wrote the .tsx output next to input (sync or async)
    const asyncWrote = writeFile.mock.calls.length > 0;
    const syncWrote = writeFileSync.mock.calls.length > 0;
    expect(asyncWrote || syncWrote).toBe(true);

    if (asyncWrote) {
      expect(writeFile).toHaveBeenCalledWith(
        "/tmp/foo.tsx",
        expect.stringContaining("/* transformed */"),
      );
    } else {
      expect(writeFileSync).toHaveBeenCalledWith(
        "/tmp/foo.tsx",
        expect.stringContaining("/* transformed */"),
      );
    }

    // Diagnostics summary & emitted path logs
    const joinedLogs = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joinedLogs).toMatch(/Lyra:\s*2 diagnostics \(1 error\)/);
    expect(joinedLogs).toMatch(/Emitted:\s*\/tmp\/foo\.tsx/);

    process.argv = origArgv;
  });

  it("logs singular '1 error' when only one error diagnostic exists", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "/tmp/foo.lyra.tsx"];

    const { readFile, readFileSync } = mockFsBoth({
      source: "export default function X(){ return <div/> }",
    });

    const compile = vi.fn(() => ({
      code: "/* transformed */ export default 0;",
      diagnostics: [
        {
          code: "LYRA_E",
          message: "err",
          file: "x.tsx",
          filename: "x.tsx",
          severity: "error" as const,
        },
      ],
      meta: { symbols: [], islands: false, a11yErrors: 1, transformed: true },
      map: null,
    }));
    vi.doMock("@lyra-dev/compiler", () => ({ compile }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const err = await importCliCatching();
    expect(err).toBeNull();

    // confirm it read something (either API)
    const readCalled =
      readFile.mock.calls.length > 0 || readFileSync.mock.calls.length > 0;
    expect(readCalled).toBe(true);

    const joinedLogs = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joinedLogs).toMatch(/Lyra: 1 diagnostics \(1 error\)/);

    process.argv = origArgv;
  });

  it("logs plural 'errors' when there are multiple error diagnostics", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "/tmp/foo.lyra.tsx"];

    vi.resetModules();

    const { readFile, readFileSync } = mockFsBoth({
      source: "export default function X(){ return <div/> }",
    });

    // Mock compiler -> TWO errors (so "errors" must be plural)
    const compile = vi.fn(() => ({
      code: "/* transformed */ export default 0;",
      diagnostics: [
        {
          code: "E1",
          message: "err1",
          file: "a.tsx",
          filename: "a.tsx",
          severity: "error" as const,
        },
        {
          code: "E2",
          message: "err2",
          file: "b.tsx",
          filename: "b.tsx",
          severity: "error" as const,
        },
      ],
      meta: { symbols: [], islands: false, a11yErrors: 2, transformed: true },
      map: null,
    }));
    vi.doMock("@lyra-dev/compiler", () => ({ compile }));

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const importCliCatchingLocal = async () => {
      try {
        await import("./index");
        return null;
      } catch (e) {
        return e as Error | null;
      }
    };
    const err = await importCliCatchingLocal();
    expect(err).toBeNull();

    // confirm it read (either API)
    const readCalled =
      readFile.mock.calls.length > 0 || readFileSync.mock.calls.length > 0;
    expect(readCalled).toBe(true);

    // Assert plural branch used: "... 2 diagnostics (2 errors)"
    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toMatch(/Lyra:\s*2 diagnostics \(2 errors\)/);

    process.argv = origArgv;
  });
});
