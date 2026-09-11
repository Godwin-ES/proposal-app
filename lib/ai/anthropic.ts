import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { generatedSectionsSchema, REGENERATION_SCHEMA_BY_SECTION } from "@/lib/ai/schemas";
import { buildGenerationPrompt, buildRegenerationPrompt } from "@/lib/ai/prompts";
import { toProviderJsonSchema } from "@/lib/ai/json-schema";
import { DomainError } from "@/lib/domain/errors";
import type { AIResult, GenerationRequest, ProposalAIProvider, RegenerationRequest } from "@/lib/ai/types";

const GENERATE_TOOL_NAME = "submit_proposal_sections";
const REGENERATE_TOOL_NAME = "submit_section_revision";

/** One automatic self-correction round-trip on a schema-invalid response,
 * before giving up — this is the single highest-leverage fix for the
 * "output was in the wrong format" errors users occasionally hit,
 * especially on Haiku: rather than fail immediately, show the model its own
 * mistake and give it one more chance to correct it via the same tool. */
const MAX_ATTEMPTS = 2;

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function callToolOnce(
  anthropic: Anthropic,
  model: string,
  messages: Anthropic.MessageParam[],
  system: string,
  toolName: string,
  schema: Record<string, unknown>
) {
  let response;
  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages,
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

  const toolUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) {
    throw new DomainError("AI_PROVIDER_FAILED", "ai-generation", "Claude did not return a structured tool call.", true);
  }

  return {
    toolUseId: toolUse.id,
    input: toolUse.input,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}

/**
 * Calls the tool, validates the result against `schema`, and — only on a
 * validation failure — retries once with the model's own prior (invalid)
 * tool call plus the exact Zod error fed back as a tool result, asking it to
 * call the tool again corrected. Throws AI_OUTPUT_INVALID only if the retry
 * also fails validation.
 */
async function callToolValidated<T extends z.ZodTypeAny>(
  model: string,
  system: string,
  user: string,
  toolName: string,
  jsonSchema: Record<string, unknown>,
  zodSchema: T
): Promise<{ data: z.infer<T>; latencyMs: number; inputTokens: number | null; outputTokens: number | null }> {
  const anthropic = client();
  const started = Date.now();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: user }];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let lastIssues = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await callToolOnce(anthropic, model, messages, system, toolName, jsonSchema);
    totalInputTokens += result.inputTokens ?? 0;
    totalOutputTokens += result.outputTokens ?? 0;

    const parsed = zodSchema.safeParse(result.input);
    if (parsed.success) {
      return {
        data: parsed.data,
        latencyMs: Date.now() - started,
        inputTokens: totalInputTokens || null,
        outputTokens: totalOutputTokens || null,
      };
    }

    lastIssues = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");

    if (attempt < MAX_ATTEMPTS) {
      messages.push(
        { role: "assistant", content: [{ type: "tool_use", id: result.toolUseId, name: toolName, input: result.input }] },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: result.toolUseId,
              is_error: true,
              content: `Your last call to ${toolName} did not match the required structure: ${lastIssues}. Call ${toolName} again with a corrected, fully valid input.`,
            },
          ],
        }
      );
    }
  }

  throw new DomainError(
    "AI_OUTPUT_INVALID",
    "ai-generation",
    `Claude's response did not pass validation after ${MAX_ATTEMPTS} attempts: ${lastIssues}`,
    true
  );
}

export function createAnthropicProvider(): ProposalAIProvider {
  return {
    async generate(request: GenerationRequest): Promise<AIResult<import("@/lib/ai/schemas").GeneratedSections>> {
      const { system, user } = buildGenerationPrompt(
        request.intake,
        request.supportingMaterials,
        request.documentProvidesFields
      );
      const schema = toProviderJsonSchema(generatedSectionsSchema);
      const result = await callToolValidated(request.model, system, user, GENERATE_TOOL_NAME, schema, generatedSectionsSchema);

      return {
        data: result.data,
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
      const result = await callToolValidated(request.model, system, user, REGENERATE_TOOL_NAME, schema, sectionSchema);

      return {
        data: result.data,
        provider: "anthropic" as const,
        model: request.model,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    },
  };
}
