import "server-only";
import type { GenerationProvider } from "@/lib/domain/types";
import type { ProposalAIProvider } from "@/lib/ai/types";
import { createAnthropicProvider } from "@/lib/ai/anthropic";
import { createGeminiProvider } from "@/lib/ai/gemini";

export function getProvider(provider: GenerationProvider): ProposalAIProvider {
  return provider === "google" ? createGeminiProvider() : createAnthropicProvider();
}

export function defaultModelFor(provider: GenerationProvider): string {
  if (provider === "google") return process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
}
