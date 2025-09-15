/**
 * Diagnostic produced by the compiler (error/warn/info).
 */
export type Diagnostic = {
  /** Machine-readable code (e.g., "LYRA_A11Y_001"). */
  code: string;
  /** Human-readable message. */
  message: string;
  /** The file where the diagnostic originated. */
  file: string;
  /** Start offset in the file (optional). */
  start?: number;
  /** Span length in the file (optional). */
  length?: number;
  /** Severity level. */
  severity: "error" | "warn" | "info";
  /** Suggested fix or hint (optional). */
  hint?: string;
};

/**
 * Options for a single compile invocation.
 */
export type CompileOptions = {
  /** Virtual/real filename (used for diagnostics, script kind inference). */
  filename: string;
  /** Source code to compile. */
  source: string;
  /** Enable dev-friendly behavior (not used yet; reserved). */
  dev?: boolean;
  /** Whether to generate source maps (not yet implemented). */
  generateSourceMap?: boolean;
  /** A11y enforcement level. */
  a11yLevel?: "strict" | "warn" | "off";
};

/**
 * Result of compiling a module.
 */
export type CompileResult = {
  /** Emitted code string. */
  code: string;
  /** Source map (null until implemented). */
  map?: unknown | null;
  /** Diagnostics generated during the compile. */
  diagnostics: Diagnostic[];
  /** Additional metadata. */
  meta: {
    /** Reserved for future symbol table exports. */
    symbols: string[];
    /** Whether islands were detected (reserved). */
    islands: boolean;
    /** Count of a11y errors. */
    a11yErrors: number;
    /** True when any transform occurred. */
    transformed: boolean;
  };
};
