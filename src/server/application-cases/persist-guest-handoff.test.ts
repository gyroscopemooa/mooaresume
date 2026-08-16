import { describe, expect, it, vi } from "vitest";
import {
  ApplicationCasePersistenceError,
  persistGuestApplicationHandoff,
} from "./persist-guest-handoff";

const validInput = {
  title: "생산관리 지원",
  product: "QUICK",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 500,
  questions: [{
    id: "q1",
    order: 1,
    title: "지원동기",
    prompt: "지원동기를 작성해 주세요.",
    answer: "현장 경험을 바탕으로 지원했습니다.",
    targetLength: 500,
  }],
};

describe("persist guest handoff", () => {
  it("does not call the repository for invalid input", async () => {
    const execute = vi.fn();
    await expect(persistGuestApplicationHandoff({}, execute)).rejects.toBeTruthy();
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns only validated ownership-bound identifiers", async () => {
    const execute = vi.fn().mockResolvedValue({
      data: {
        applicationCaseId: "11111111-1111-4111-8111-111111111111",
        submissionSnapshotId: "22222222-2222-4222-8222-222222222222",
        analysisRunId: "33333333-3333-4333-8333-333333333333",
      },
      error: null,
    });
    const result = await persistGuestApplicationHandoff(validInput, execute);
    expect(result.applicationCaseId).toBe("11111111-1111-4111-8111-111111111111");
    expect(execute).toHaveBeenCalledOnce();
  });

  it("does not expose database error details to the caller", async () => {
    const execute = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "sensitive database detail", code: "42501" },
    });
    await expect(persistGuestApplicationHandoff(validInput, execute)).rejects.toMatchObject({
      name: "ApplicationCasePersistenceError",
      message: "지원 건을 비공개로 저장하지 못했습니다.",
      code: "42501",
    } satisfies Partial<ApplicationCasePersistenceError>);
  });
});
