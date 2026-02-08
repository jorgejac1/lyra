import type { SourceMap } from "../types.js";

const VLQ_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode a single integer as a VLQ segment.
 */
export function vlqEncode(value: number): string {
  let vlq = value < 0 ? (-value << 1) + 1 : value << 1;
  let encoded = "";
  do {
    let digit = vlq & 0x1f;
    vlq >>>= 5;
    if (vlq > 0) digit |= 0x20; // continuation bit
    encoded += VLQ_CHARS[digit];
  } while (vlq > 0);
  return encoded;
}

/**
 * Generate a V3 source map with line-level identity mappings.
 *
 * Each output line is mapped to the corresponding input line.
 * This provides accurate line-level debugging for transformed code.
 */
export function generateSourceMap(
  filename: string,
  source: string,
  outputCode: string,
): SourceMap {
  const inputLines = source.split("\n").length;
  const outputLines = outputCode.split("\n").length;
  const linesToMap = Math.min(inputLines, outputLines);

  const segments: string[] = [];
  let prevSourceLine = 0;

  for (let i = 0; i < outputLines; i++) {
    if (i < linesToMap) {
      // Map output column 0 → source file 0, source line i, source column 0
      const sourceLineDelta = i - prevSourceLine;
      prevSourceLine = i;

      // Each segment: [outputCol, sourceIdx, sourceLine, sourceCol]
      // outputCol=0 (start of line), sourceIdx=0 (first source file),
      // sourceLine=delta, sourceCol=0
      const segment =
        vlqEncode(0) + vlqEncode(0) + vlqEncode(sourceLineDelta) + vlqEncode(0);
      segments.push(segment);
    } else {
      // No mapping for extra output lines
      segments.push("");
    }
  }

  return {
    version: 3,
    file: filename.replace(/\.lyra\.tsx$/, ".tsx"),
    sources: [filename],
    sourcesContent: [source],
    mappings: segments.join(";"),
  };
}
