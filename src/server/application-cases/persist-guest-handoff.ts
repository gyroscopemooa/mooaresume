import { z } from "zod";
import {
  buildApplicationCasePlan,
  guestApplicationHandoffSchema,
  type ApplicationCasePlan,
} from "@/application/application-case-handoff";

const persistedHandoffSchema = z.object({
  applicationCaseId: z.string().uuid(),
  submissionSnapshotId: z.string().uuid(),
  analysisRunId: z.string().uuid(),
});

export type PersistedHandoff = z.infer<typeof persistedHandoffSchema>;

export type PlanExecutor = (
  plan: ApplicationCasePlan,
) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;

export class ApplicationCasePersistenceError extends Error {
  constructor(
    message: string,
    public readonly code = "PERSISTENCE_FAILED",
  ) {
    super(message);
    this.name = "ApplicationCasePersistenceError";
  }
}

export async function persistGuestApplicationHandoff(
  rawInput: unknown,
  executePlan: PlanExecutor,
): Promise<PersistedHandoff> {
  const input = guestApplicationHandoffSchema.parse(rawInput);
  const plan = buildApplicationCasePlan(input);
  const { data, error } = await executePlan(plan);

  if (error) {
    throw new ApplicationCasePersistenceError(
      "지원 건을 비공개로 저장하지 못했습니다.",
      error.code ?? "PERSISTENCE_FAILED",
    );
  }

  return persistedHandoffSchema.parse(data);
}
