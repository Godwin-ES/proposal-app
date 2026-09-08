import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { loadEnv } from "vite";

process.env = { ...process.env, ...loadEnv("", process.cwd(), "") };

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Next.js aliases these to no-ops for the correct bundle at build
      // time; vitest has no equivalent, so do it manually for tests.
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
      "client-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    environment: "jsdom",
    testTimeout: 20_000,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/component/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
  },
});
