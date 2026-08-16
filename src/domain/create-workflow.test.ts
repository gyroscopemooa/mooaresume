import { describe, expect, it } from "vitest";
import { advanceCreateStage, createWorkflowStateSchema, initialCreateWorkflowState } from "./create-workflow";

describe("CREATE workflow", () => {
  it("stores an explicit stage instead of inferring it from chat", () => {
    const state = initialCreateWorkflowState("case-1");
    expect(state.stage).toBe("JOB_ANALYSIS");
    expect(createWorkflowStateSchema.safeParse(state).success).toBe(true);
    expect(state.rawAdditionalInfo).toBe("");
  });

  it("does not advance without the required structured input", () => {
    const state = initialCreateWorkflowState("case-1");
    expect(advanceCreateStage(state)).toEqual(state);
  });

  it("advances after job information is present", () => {
    const state = { ...initialCreateWorkflowState("case-1"), jobPostingText: "생산관리 직무 채용공고" };
    expect(advanceCreateStage(state).stage).toBe("EXPERIENCE_DISCOVERY");
  });
});
