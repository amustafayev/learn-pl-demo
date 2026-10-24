import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests: `npm test` (or `npm run test:watch`). The browser tests live
// in e2e/ (`npm run test:e2e`, playwright.config.js). See "Tests" in
// CLAUDE.md for what goes where.
export default defineConfig({
  resolve: {
    alias: { "@app": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.js", "student/src/**/*.test.js"],
    // A browser-like DOM, for code that parses HTML (richText.js) or reads
    // browser storage.
    environment: "jsdom",
  },
});
