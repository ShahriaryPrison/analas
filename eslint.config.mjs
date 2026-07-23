import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Auto-generated Prisma client — not hand-written, not ours to lint.
    "generated/**",
    // Minified esbuild bundle of src/lib/session-recorder.ts, checked in as
    // build output (see package.json's `build` script) — lint the source, not the bundle.
    "public/session-recorder.js",
    // Agent worktrees under .claude/ are full nested checkouts of the repo;
    // without this, `eslint .` recurses into each one and re-lints (and
    // multiplies error counts for) the entire src tree once per worktree.
    ".claude/worktrees/**",
  ]),
  {
    // Mocking Prisma's generated return types exactly is impractical in test fixtures —
    // relax no-explicit-any for test files only, production code still enforces it.
    files: ["src/**/*.test.ts", "src/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
