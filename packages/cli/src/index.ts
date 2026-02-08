#!/usr/bin/env node
import fs from "node:fs";
import {
  compile,
  parseSourceFile,
  runA11yChecks,
  formatDiagnostic,
  formatCodeFrame,
} from "@lyra-dev/compiler";

const args = process.argv.slice(2);
const subcommand = args[0];

function printUsage(): void {
  console.error("Usage:");
  console.error("  lyra compile <file.lyra.tsx> [out.tsx]");
  console.error("  lyra a11y-check <file.lyra.tsx>");
  process.exit(1);
}

function runCompile(file: string, outFile?: string): void {
  const src: string = fs.readFileSync(file, "utf8");

  const result = compile({
    filename: file,
    source: src,
    dev: false,
    generateSourceMap: false,
    a11yLevel: "strict",
  });

  const out: string = outFile ?? file.replace(/\.lyra\.tsx$/, ".tsx");
  fs.writeFileSync(out, result.code);

  if (result.diagnostics.length) {
    const errors = result.diagnostics.filter(
      (d) => d.severity === "error",
    ).length;
    console.log(
      `Lyra: ${result.diagnostics.length} diagnostics (${errors} error${errors === 1 ? "" : "s"})`,
    );
  }

  console.log(`Emitted: ${out}`);
}

function runA11yCheck(file: string): void {
  const src: string = fs.readFileSync(file, "utf8");
  const sf = parseSourceFile(file, src);
  const diags = runA11yChecks(sf, file, "strict");

  if (diags.length === 0) {
    console.log("No accessibility issues found.");
    process.exit(0);
  }

  for (const d of diags) {
    console.log(formatDiagnostic(d, src));
    if (d.start !== undefined && d.length !== undefined) {
      console.log(formatCodeFrame(src, d.start, d.length));
    }
    console.log();
  }

  const errors = diags.filter((d) => d.severity === "error").length;
  console.log(
    `Found ${diags.length} issue(s) (${errors} error${errors === 1 ? "" : "s"}).`,
  );
  process.exit(errors > 0 ? 1 : 0);
}

// Route subcommands
if (!subcommand) {
  printUsage();
} else if (subcommand === "compile") {
  if (!args[1]) printUsage();
  runCompile(args[1], args[2]);
} else if (subcommand === "a11y-check") {
  if (!args[1]) printUsage();
  runA11yCheck(args[1]);
} else if (
  subcommand.endsWith(".lyra.tsx") ||
  subcommand.endsWith(".lyra.ts")
) {
  // Backward compatibility: lyra <file.lyra.tsx>
  runCompile(subcommand, args[1]);
} else {
  printUsage();
}
