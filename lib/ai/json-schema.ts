import { z } from "zod";

/** Converts a Zod schema into a plain JSON Schema object suitable for
 * Anthropic tool `input_schema`, stripping the `$schema` meta key Anthropic
 * doesn't expect. */
export function toProviderJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete jsonSchema.$schema;
  return jsonSchema;
}
