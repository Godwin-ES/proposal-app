// @vitest-environment node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel PDF runtime compatibility", () => {
  it("keeps pdf-parse out of eager module evaluation and externalizes its canvas runtime", async () => {
    const extractSource = await readFile(resolve(process.cwd(), "lib/materials/extract.ts"), "utf8");
    const nextConfigSource = await readFile(resolve(process.cwd(), "next.config.ts"), "utf8");

    // pdfjs evaluates DOMMatrix at module load time. In Vercel's bundled server
    // runtime that crashes the whole proposal route if pdf-parse is imported
    // eagerly, even when no PDF is being processed.
    expect(extractSource).not.toMatch(/^import\s+.*from\s+["']pdf-parse["'];?/m);
    expect(extractSource).toContain('await import("pdf-parse/worker")');
    expect(extractSource).toContain('await import("pdf-parse")');

    // Keep the native canvas/polyfill packages resolvable in the serverless
    // function instead of letting Turbopack absorb/trace them incorrectly.
    expect(nextConfigSource).toContain("serverExternalPackages");
    expect(nextConfigSource).toContain('"pdf-parse"');
    expect(nextConfigSource).toContain('"@napi-rs/canvas"');
  });
});
