import "server-only";
import type { ProposalAIProvider } from "@/lib/ai/types";
import { createAnthropicProvider } from "@/lib/ai/anthropic";

export function getProvider(): ProposalAIProvider {
  return createAnthropicProvider();
}
