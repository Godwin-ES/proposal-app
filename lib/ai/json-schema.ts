import { z } from "zod";

/** Converts a Zod schema into a plain JSON Schema object suitable for both
 * Anthropic tool `input_schema` and Gemini `responseSchema`, stripping the
 * `$schema` meta key neither provider expects. */
export function toProviderJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete jsonSchema.$schema;
  return jsonSchema;
}
