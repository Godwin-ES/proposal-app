import { completeIntake } from "./complete-intake";
import type { ProposalIntake } from "@/lib/domain/types";

export const missingScopeIntake: ProposalIntake = {
  ...completeIntake,
  projectScope: "",
};
