#!/usr/bin/env node
import fs from "node:fs";
import { compile } from "@lyra/compiler";

/**
 * CLI entrypoint.
 * Usage: lyra-compile <file.lyra.tsx>
 */
const file = process.argv[2];
if (!file) {
  console.error("Usage: lyra-compile <file.lyra.tsx>");
  process.exit(1);
}
const src = fs.readFileSync(file, "utf8");
const result = compile({
  filename: file,
  source: src,
  dev: false,
  generateSourceMap: false,
  a11yLevel: "strict",
});
const outFile = file.replace(/\.lyra\.tsx$/, ".tsx");
fs.writeFileSync(outFile, result.code);
if (result.diagnostics.length) {
  const errors = result.diagnostics.filter(
    (d) => d.severity === "error",
  ).length;
  console.log(
    `Lyra: ${result.diagnostics.length} diagnostics (${errors} error${errors === 1 ? "" : "s"})`,
  );
}
console.log(`Emitted: ${outFile}`);
