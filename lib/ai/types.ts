import type { ProposalIntake, ProposalSectionKey, ProposalSnapshot } from "@/lib/domain/types";
import type { GeneratedSections, SectionRegenerationResult } from "@/lib/ai/schemas";

export type SupportingMaterialContext = { id: string; filename: string; text: string };

export type GenerationRequest = {
  model: string;
  intake: ProposalIntake;
  supportingMaterials: SupportingMaterialContext[];
  /** The salesperson's pre-generation declaration that supporting material
   * already contains the answers to some blank intake fields — see
   * `document_provides_fields` on `proposals` and `fieldsFromMaterial` in
   * lib/ai/schemas.ts. */
  documentProvidesFields?: boolean;
};

export type RegenerationRequest = {
  model: string;
  targetSection: ProposalSectionKey;
  instruction: string;
  currentSnapshot: ProposalSnapshot;
  supportingMaterials: SupportingMaterialContext[];
};

export type AIResult<T> = {
  data: T;
  provider: "anthropic";
  model: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
};

export interface ProposalAIProvider {
  generate(request: GenerationRequest): Promise<AIResult<GeneratedSections>>;
  regenerateSection(request: RegenerationRequest): Promise<AIResult<SectionRegenerationResult>>;
}
