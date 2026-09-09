import "server-only";
import mammoth from "mammoth";
import { DomainError } from "@/lib/domain/errors";

export const SUPPORTED_EXTENSIONS = ["txt", "md", "pdf", "docx"] as const;
export type SupportedExtension = (typeof SUPPORTED_EXTENSIONS)[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_ACTIVE_MATERIALS = 3;
export const MAX_AGGREGATE_EXTRACTED_CHARS = 60_000;

export function extensionFromFilename(filename: string): string | null {
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
  return match ? match[1].toLowerCase() : null;
}

export function isSupportedExtension(extension: string | null): extension is SupportedExtension {
  return !!extension && (SUPPORTED_EXTENSIONS as readonly string[]).includes(extension);
}

export async function extractText(extension: SupportedExtension, buffer: Buffer): Promise<string> {
  try {
    switch (extension) {
      case "txt":
      case "md":
        return buffer.toString("utf-8");
      case "docx": {
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }
      case "pdf": {
        // pdfjs evaluates browser/canvas globals during module initialization.
        // On Vercel that previously crashed every proposal SSR request with
        // `ReferenceError: DOMMatrix is not defined`, even when no PDF was
        // being processed, because pdf-parse was imported eagerly at module
        // scope. Load the worker/canvas factory first and only initialize the
        // PDF stack when a PDF actually needs extraction.
        const { CanvasFactory } = await import("pdf-parse/worker");
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({
          data: new Uint8Array(buffer),
          CanvasFactory,
        });

        try {
          const result = await parser.getText();
          return result.text;
        } finally {
          await parser.destroy();
        }
      }
    }
  } catch {
    throw new DomainError(
      "MATERIAL_EXTRACTION_FAILED",
      "material-extraction",
      `Could not extract text from this ${extension.toUpperCase()} file. It may be corrupted, scanned/image-only, or password-protected.`,
      true
    );
  }
}
