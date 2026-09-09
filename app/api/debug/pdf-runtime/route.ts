import "server-only";

export const runtime = "nodejs";

export async function GET() {
  const { CanvasFactory } = await import("pdf-parse/worker");
  const { PDFParse } = await import("pdf-parse");

  return Response.json({
    ok: true,
    canvasFactory: typeof CanvasFactory === "function",
    pdfParse: typeof PDFParse === "function",
    domMatrix: typeof globalThis.DOMMatrix !== "undefined",
  });
}
