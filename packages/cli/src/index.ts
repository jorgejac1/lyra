#!/usr/bin/env node
import fs from "node:fs";
import { compile } from "@lyra-dev/compiler";

/**
 * Lyra CLI Entrypoint.
 *
 * This script compiles a `.lyra.tsx` file into a plain `.tsx` file using the Lyra compiler.
 * It validates input, reads the source file, invokes the compiler, writes the result,
 * and prints diagnostic information.
 *
 * Usage:
 * ```bash
 * lyra-compile <file.lyra.tsx>
 * ```
 *
 * @remarks
 * - Exits with status code `1` if no input file is provided.
 * - Writes the compiled output to the same path but with a `.tsx` extension.
 * - Prints diagnostics summary if there are warnings or errors.
 * - Always prints the output path when emitting succeeds.
 */

// The input filename provided by the CLI user.
const file = process.argv[2];

if (!file) {
  console.error("Usage: lyra-compile <file.lyra.tsx>");
  process.exit(1);
}

/**
 * Read the `.lyra.tsx` source file contents as UTF-8 text.
 */
const src: string = fs.readFileSync(file, "utf8");

/**
 * Compile the Lyra source code to a plain `.tsx` file.
 */
const result = compile({
  filename: file,
  source: src,
  dev: false,
  generateSourceMap: false,
  a11yLevel: "strict",
});

/**
 * Derive the output `.tsx` filename from the input path.
 */
const outFile: string = file.replace(/\.lyra\.tsx$/, ".tsx");

/**
 * Write the compiled code to the output file.
 */
fs.writeFileSync(outFile, result.code);

/**
 * If diagnostics exist, log a summary (count of diagnostics and errors).
 */
if (result.diagnostics.length) {
  const errors = result.diagnostics.filter(
    (d) => d.severity === "error",
  ).length;
  console.log(
    `Lyra: ${result.diagnostics.length} diagnostics (${errors} error${errors === 1 ? "" : "s"})`,
  );
}

/**
 * Always log the emitted output file path.
 */
console.log(`Emitted: ${outFile}`);
