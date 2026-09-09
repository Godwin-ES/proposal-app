import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse/pdfjs loads native canvas helpers on the server. Keeping these
  // packages external ensures Vercel traces the worker/native runtime instead
  // of bundling pdfjs without its DOMMatrix/ImageData/Path2D polyfills.
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
};

export default nextConfig;
