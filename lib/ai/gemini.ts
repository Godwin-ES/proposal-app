import "server-only";
import { GoogleGenAI } from "@google/genai";
import { generatedSectionsSchema, REGENERATION_SCHEMA_BY_SECTION } from "@/lib/ai/schemas";
import { buildGenerationPrompt, buildRegenerationPrompt } from "@/lib/ai/prompts";
import { toProviderJsonSchema } from "@/lib/ai/json-schema";
import { DomainError } from "@/lib/domain/errors";
import type { AIResult, GenerationRequest, ProposalAIProvider, RegenerationRequest } from "@/lib/ai/types";

function client() {
  return new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
}

async function callStructured(model: string, system: string, user: string, schema: Record<string, unknown>) {
  const ai = client();
  const started = Date.now();

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: user,
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
  } catch (error) {
    throw new DomainError(
      "AI_PROVIDER_FAILED",
      "ai-generation",
      `Gemini request failed: ${error instanceof Error ? error.message : "unknown error"}.`,
      true
    );
  }

  const latencyMs = Date.now() - started;
  const text = response.text;

  if (!text) {
    throw new DomainError("AI_PROVIDER_FAILED", "ai-generation", "Gemini did not return a response.", true);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new DomainError("AI_OUTPUT_INVALID", "ai-generation", "Gemini returned output that was not valid JSON.", true);
  }

  return {
    json: parsedJson,
    latencyMs,
    inputTokens: response.usageMetadata?.promptTokenCount ?? null,
    outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
  };
}

export function createGeminiProvider(): ProposalAIProvider {
  return {
    async generate(request: GenerationRequest): Promise<AIResult<import("@/lib/ai/schemas").GeneratedSections>> {
      const { system, user } = buildGenerationPrompt(request.intake, request.supportingMaterials);
      const schema = toProviderJsonSchema(generatedSectionsSchema);
      const result = await callStructured(request.model, system, user, schema);

      const parsed = generatedSectionsSchema.safeParse(result.json);
      if (!parsed.success) {
        throw new DomainError(
          "AI_OUTPUT_INVALID",
          "ai-generation",
          "Gemini returned a proposal structure that did not pass validation.",
          true
        );
      }

      return {
        data: parsed.data,
        provider: "google",
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
      const result = await callStructured(request.model, system, user, schema);

      const parsed = sectionSchema.safeParse(result.json);
      if (!parsed.success) {
        throw new DomainError(
          "AI_OUTPUT_INVALID",
          "ai-generation",
          "Gemini returned a section revision that did not pass validation.",
          true
        );
      }

      return {
        data: parsed.data,
        provider: "google" as const,
        model: request.model,
        latencyMs: result.latencyMs,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      };
    },
  };
}
