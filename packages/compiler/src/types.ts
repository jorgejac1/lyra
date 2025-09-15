export type Diagnostic = {
  code: string;
  message: string;
  file: string;
  start?: number;
  length?: number;
  severity: "error" | "warn" | "info";
  hint?: string;
};

export type CompileOptions = {
  filename: string;
  source: string;
  dev?: boolean;
  generateSourceMap?: boolean;
  a11yLevel?: "strict" | "warn" | "off";
};

export type CompileResult = {
  code: string;
  map?: unknown | null;
  diagnostics: Diagnostic[];
  meta: {
    symbols: string[];
    islands: boolean;
    a11yErrors: number;
    transformed: boolean;
  };
};
