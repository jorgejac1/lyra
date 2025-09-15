import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config(
  // 1) Global ignores
  {
    ignores: [
      'node_modules/',
      'dist/',
      '**/dist/',
      '**/*.d.ts',
      '.vite/',
      '**/.vite/',
    ],
  },

  // 2) JS base rules
  js.configs.recommended,

  // 3) TypeScript recommended (no type-checking rules to keep it fast)
  ...tseslint.configs.recommended,

  // 4) Project rules for TS/TSX files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      // Enable type-aware linting later by uncommenting projectService.
      // It’s off by default to avoid perf and config friction.
      // parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    plugins: { prettier },
    rules: {
      // Keep code style consistent with Prettier, but don’t block on formatting.
      'prettier/prettier': 'warn',

      // Useful TS tidy-ups
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],

      // Reasonable JS defaults
      'no-console': 'off',
      'no-debugger': 'warn',
    },
  }
);
