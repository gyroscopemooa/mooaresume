import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test-support/server-only.ts", import.meta.url)),
    },
  },
  test: {
    // A background agent working in a git worktree puts a full second copy of
    // the tree under .claude/worktrees. Without this the suite runs every test
    // twice and reports that session's in-progress failures as this one's.
    exclude: ["**/*.live.test.ts", "**/node_modules/**", "**/.next/**", "**/.claude/worktrees/**"],
  },
});
