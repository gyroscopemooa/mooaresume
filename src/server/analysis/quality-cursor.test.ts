import { describe, expect, it } from "vitest";
import { formatQualityCursor, parseQualityCursor, type QualityCursor } from "./quality-cursor";

describe("quality cursor", () => {
  const samples: QualityCursor[] = [
    { stage: "writer", writerId: "resp_w" },
    { stage: "review-claim", writerId: "resp_w", claimedAt: 1_700_000_000_000 },
    { stage: "review", writerId: "resp_w", reviewId: "resp_r1" },
    { stage: "repair-claim", writerId: "resp_w", reviewId: "resp_r1", claimedAt: 1_700_000_100_000 },
    { stage: "repair", writerId: "resp_w", reviewId: "resp_r1", repairId: "resp_p", startedAt: 1_700_000_200_000 },
    { stage: "repair-review-claim", writerId: "resp_w", reviewId: "resp_r1", repairId: "resp_p", startedAt: 1_700_000_200_000, claimedAt: 1_700_000_300_000 },
    { stage: "repair-review", writerId: "resp_w", reviewId: "resp_r1", repairId: "resp_p", startedAt: 1_700_000_200_000, repairReviewId: "resp_r2" },
  ];

  it.each(samples)("round-trips the %s stage", (cursor) => {
    expect(parseQualityCursor(formatQualityCursor(cursor))).toEqual(cursor);
  });

  it("keeps the three stages that existed before byte for byte", () => {
    expect(formatQualityCursor({ stage: "writer", writerId: "resp_w" })).toBe("resp_w");
    expect(formatQualityCursor({ stage: "review-claim", writerId: "resp_w", claimedAt: 5 })).toBe("quality-v1|resp_w|starting|5");
    expect(formatQualityCursor({ stage: "review", writerId: "resp_w", reviewId: "resp_r1" })).toBe("quality-v1|resp_w|resp_r1");
  });

  it("a plain response id is the writer stage", () => {
    expect(parseQualityCursor("resp_abc")).toEqual({ stage: "writer", writerId: "resp_abc" });
  });

  it("an older reader of a repair cursor sees the first review (so an old worker finishes with the first pass)", () => {
    // 예전 코드는 "quality-v1|"로 시작하면 parts[1]=작성, parts[2]=첫 검토로만 읽는다.
    for (const cursor of samples.filter((item) => item.stage.startsWith("repair"))) {
      const parts = formatQualityCursor(cursor).split("|");
      expect(parts[0]).toBe("quality-v1");
      expect(parts[1]).toBe("resp_w");
      expect(parts[2]).toBe("resp_r1");
      expect(parts[2]).not.toBe("starting");
    }
  });

  it("an unparsable timestamp reads as NaN so a lease check treats the claim as expired", () => {
    const parsed = parseQualityCursor("quality-v1|resp_w|starting|oops");
    expect(parsed.stage).toBe("review-claim");
    expect(parsed.stage === "review-claim" && Number.isNaN(parsed.claimedAt)).toBe(true);
  });
});
