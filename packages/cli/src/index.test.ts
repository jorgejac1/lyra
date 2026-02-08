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

function mockCompiler(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  }));

  const parseSourceFile = vi.fn(() => ({}));
  const runA11yChecks = vi.fn(
    () =>
      [] as {
        code: string;
        message: string;
        file: string;
        start?: number;
        length?: number;
        severity: string;
        hint?: string;
      }[],
  );
  const formatDiagnostic = vi.fn(
    (d: { code: string; message: string }) => `${d.code}: ${d.message}`,
  );
  const formatCodeFrame = vi.fn(() => "  > code frame");

  vi.doMock("@lyra-dev/compiler", () => ({
    compile,
    parseSourceFile,
    runA11yChecks,
    formatDiagnostic,
    formatCodeFrame,
  }));

  return {
    compile,
    parseSourceFile,
    runA11yChecks,
    formatDiagnostic,
    formatCodeFrame,
  };
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

    expect(errorSpy).toHaveBeenCalled();
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/Usage:/);
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

    const { compile } = mockCompiler();

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const err = await importCliCatching();
    expect(err).toBeNull();

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

    mockFsBoth({
      source: "export default function X(){ return <div/> }",
    });

    mockCompiler({
      diagnostics: [
        {
          code: "LYRA_E",
          message: "err",
          file: "x.tsx",
          severity: "error" as const,
        },
      ],
    });

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

    vi.resetModules();

    mockFsBoth({
      source: "export default function X(){ return <div/> }",
    });

    mockCompiler({
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
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const err = await importCliCatching();
    expect(err).toBeNull();

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toMatch(/Lyra:\s*2 diagnostics \(2 errors\)/);

    process.argv = origArgv;
  });
});

describe("unknown subcommand", () => {
  it("prints usage and exits with code 1 for unknown subcommand", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "unknown-command"];

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw Object.assign(new Error("EXIT"), { code });
    }) as unknown as () => never);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await importCliCatching();

    expect(errorSpy).toHaveBeenCalled();
    expect(String(errorSpy.mock.calls[0][0])).toMatch(/Usage:/);
    expect(exitSpy).toHaveBeenCalledWith(1);

    process.argv = origArgv;
  });
});

describe("compile subcommand with explicit output", () => {
  it("writes to custom output file when specified", async () => {
    const origArgv = process.argv.slice();
    process.argv = [
      "node",
      "cli",
      "compile",
      "/tmp/foo.lyra.tsx",
      "/tmp/custom-out.tsx",
    ];

    mockFsBoth();
    mockCompiler({ diagnostics: [] });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const err = await importCliCatching();
    expect(err).toBeNull();

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toMatch(/Emitted:\s*\/tmp\/custom-out\.tsx/);

    process.argv = origArgv;
  });
});

describe("compile subcommand missing file", () => {
  it("prints usage when compile has no file argument", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "compile"];

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw Object.assign(new Error("EXIT"), { code });
    }) as unknown as () => never);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await importCliCatching();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();

    process.argv = origArgv;
  });
});

describe("backward compat with .lyra.ts extension", () => {
  it("treats .lyra.ts file as compile command", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "/tmp/foo.lyra.ts"];

    mockFsBoth();
    mockCompiler({ diagnostics: [] });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const err = await importCliCatching();
    expect(err).toBeNull();

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toMatch(/Emitted:/);

    process.argv = origArgv;
  });
});

describe("a11y-check warnings only", () => {
  it("exits with code 0 when only warnings (no errors)", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "a11y-check", "/tmp/warn.lyra.tsx"];

    mockFsBoth({ source: "<div />" });
    const { runA11yChecks, formatDiagnostic } = mockCompiler();
    runA11yChecks.mockReturnValue([
      {
        code: "LYRA_A11Y_006",
        message: "tabindex warning",
        file: "/tmp/warn.lyra.tsx",
        severity: "warn",
      },
    ]);
    formatDiagnostic.mockReturnValue("warn LYRA_A11Y_006: tabindex warning");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw Object.assign(new Error("EXIT"), { code });
    }) as unknown as () => never);

    await importCliCatching();

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("Found 1 issue(s) (0 errors).");
    expect(exitSpy).toHaveBeenCalledWith(0);

    process.argv = origArgv;
  });
});

describe("lyra compile subcommand", () => {
  it("works with explicit compile subcommand", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "compile", "/tmp/foo.lyra.tsx"];

    mockFsBoth();
    mockCompiler({ diagnostics: [] });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const err = await importCliCatching();
    expect(err).toBeNull();

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toMatch(/Emitted:\s*\/tmp\/foo\.tsx/);

    process.argv = origArgv;
  });
});

describe("lyra a11y-check subcommand", () => {
  it("prints 'No accessibility issues found' when clean", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "a11y-check", "/tmp/clean.lyra.tsx"];

    mockFsBoth({ source: '<img alt="ok" />' });
    const { runA11yChecks } = mockCompiler();
    runA11yChecks.mockReturnValue([]);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw Object.assign(new Error("EXIT"), { code });
    }) as unknown as () => never);

    await importCliCatching();

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("No accessibility issues found.");
    expect(exitSpy).toHaveBeenCalledWith(0);

    process.argv = origArgv;
  });

  it("prints diagnostics and exits with code 1 on a11y errors", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "a11y-check", "/tmp/bad.lyra.tsx"];

    mockFsBoth({ source: "<img />" });
    const { runA11yChecks, formatDiagnostic } = mockCompiler();
    runA11yChecks.mockReturnValue([
      {
        code: "LYRA_A11Y_002",
        message: "<img> is missing an alt attribute.",
        file: "/tmp/bad.lyra.tsx",
        start: 0,
        length: 7,
        severity: "error",
        hint: 'Add alt="..."',
      },
    ]);
    formatDiagnostic.mockReturnValue(
      "error LYRA_A11Y_002: <img> is missing an alt attribute.",
    );

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw Object.assign(new Error("EXIT"), { code });
    }) as unknown as () => never);

    await importCliCatching();

    const joined = logSpy.mock.calls.map((c) => String(c[0])).join("\n");
    expect(joined).toContain("LYRA_A11Y_002");
    expect(joined).toContain("Found 1 issue(s) (1 error).");
    expect(exitSpy).toHaveBeenCalledWith(1);

    process.argv = origArgv;
  });

  it("prints usage when a11y-check has no file argument", async () => {
    const origArgv = process.argv.slice();
    process.argv = ["node", "cli", "a11y-check"];

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null | undefined,
    ) => {
      throw Object.assign(new Error("EXIT"), { code });
    }) as unknown as () => never);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await importCliCatching();

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();

    process.argv = origArgv;
  });
});
