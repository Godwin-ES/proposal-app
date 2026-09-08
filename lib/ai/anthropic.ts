import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { generatedSectionsSchema, REGENERATION_SCHEMA_BY_SECTION } from "@/lib/ai/schemas";
import { buildGenerationPrompt, buildRegenerationPrompt } from "@/lib/ai/prompts";
import { toProviderJsonSchema } from "@/lib/ai/json-schema";
import { DomainError } from "@/lib/domain/errors";
import type { AIResult, GenerationRequest, ProposalAIProvider, RegenerationRequest } from "@/lib/ai/types";

const GENERATE_TOOL_NAME = "submit_proposal_sections";
const REGENERATE_TOOL_NAME = "submit_section_revision";

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function callTool(model: string, system: string, user: string, toolName: string, schema: Record<string, unknown>) {
  const anthropic = client();
  const started = Date.now();

  let response;
  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
      tools: [{ name: toolName, description: "Submit the structured proposal content.", input_schema: schema as Anthropic.Tool.InputSchema }],
      tool_choice: { type: "tool", name: toolName },
    });
  } catch (error) {
    throw new DomainError(
      "AI_PROVIDER_FAILED",
      "ai-generation",
      `Claude request failed: ${error instanceof Error ? error.message : "unknown error"}.`,
      true
    );
  }

  const latencyMs = Date.now() - started;
  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");

  if (!toolUse) {
    throw new DomainError("AI_PROVIDER_FAILED", "ai-generation", "Claude did not return a structured tool call.", true);
  }

  return {
    input: toolUse.input,
    latencyMs,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}

export function createAnthropicProvider(): ProposalAIProvider {
  return {
    async generate(request: GenerationRequest): Promise<AIResult<import("@/lib/ai/schemas").GeneratedSections>> {
      const { system, user } = buildGenerationPrompt(request.intake, request.supportingMaterials);
      const schema = toProviderJsonSchema(generatedSectionsSchema);
      const result = await callTool(request.model, system, user, GENERATE_TOOL_NAME, schema);

      const parsed = generatedSectionsSchema.safeParse(result.input);
      if (!parsed.success) {
        throw new DomainError(
          "AI_OUTPUT_INVALID",
          "ai-generation",
          "Claude returned a proposal structure that did not pass validation.",
          true
        );
      }

      return {
        data: parsed.data,
        provider: "anthropic",
        model: request.model,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    },

    async regenerateSection(request: RegenerationRequest) {
      const { system, user } = buildRegenerationPrompt(
        request.targetSection,
        request.instruction,
        request.currentSnapshot,
        request.supportingMaterials
      );
      const sectionSchema = REGENERATION_SCHEMA_BY_SECTION[request.targetSection];
      const schema = toProviderJsonSchema(sectionSchema);
      const result = await callTool(request.model, system, user, REGENERATE_TOOL_NAME, schema);

      const parsed = sectionSchema.safeParse(result.input);
      if (!parsed.success) {
        throw new DomainError(
          "AI_OUTPUT_INVALID",
          "ai-generation",
          "Claude returned a section revision that did not pass validation.",
          true
        );
      }

      return {
        data: parsed.data,
        provider: "anthropic" as const,
        model: request.model,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    },
  };
}
