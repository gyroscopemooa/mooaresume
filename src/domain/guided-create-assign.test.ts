import { describe, expect, it } from "vitest";
import {
  availableGuidedBlocks,
  createGuidedCreateDraft,
  createGuidedExperience,
  guidedBlockPreview,
  recommendGuidedBlocks,
  type GuidedCreateDraft,
} from "./guided-create";

function draftWithTwoExperiences(): GuidedCreateDraft {
  return {
    ...createGuidedCreateDraft(),
    motivation: "현장실습에서 안전관리자가 하는 일을 처음 보고 관심이 생겼습니다.",
    aspiration: "현장 점검 기준을 정리하는 일을 해보고 싶습니다.",
    strength: "모르는 건 바로 물어보는 편입니다.",
    goal: "반복되는 위험을 기록으로 남기는 사람이 되고 싶습니다.",
    experiences: [
      { ...createGuidedExperience(), category: "현장실습", where: "롯데테크 현장실습 · 2025.03~2025.08 · 안전관리 보조", situation: "같은 불량이 반복됐습니다." },
      { ...createGuidedExperience(), category: "아르바이트", where: "편의점 야간 · 2024.06~2024.12 · 매장 관리", situation: "혼자 마감을 맡았습니다." },
    ],
  };
}

describe("소재 미리보기", () => {
  // Ten steps after typing them, "경험 ①" and "경험 ②" are the same word.
  it("경험은 소속·기간으로 서로 구분된다", () => {
    const draft = draftWithTwoExperiences();
    const first = guidedBlockPreview(draft, "experience-0", 24);
    const second = guidedBlockPreview(draft, "experience-1", 24);

    expect(first).not.toBe(second);
    expect(first).toContain("롯데테크");
    expect(second).toContain("편의점");
  });

  it("길면 잘라서 한 줄로 만든다", () => {
    const preview = guidedBlockPreview(draftWithTwoExperiences(), "motivation", 12);

    expect(preview.endsWith("…")).toBe(true);
    expect(preview).not.toContain("\n");
  });

  it("비어 있으면 빈 문자열을 준다", () => {
    expect(guidedBlockPreview(createGuidedCreateDraft(), "motivation")).toBe("");
  });
});

describe("문항별 소재 추천", () => {
  const draft = draftWithTwoExperiences();
  const blocks = availableGuidedBlocks(draft);

  it("지원 동기 문항에는 계기와 하고 싶은 일을 먼저 권한다", () => {
    const picked = recommendGuidedBlocks("본 직무에 지원하신 동기는 어떻게 되십니까?", blocks);

    expect(picked).toContain("motivation");
    expect(picked).toContain("aspiration");
  });

  it("입사 후 계획 문항에는 목표를 권한다", () => {
    expect(recommendGuidedBlocks("입사 후 계획이 어떻게 되시는지요?", blocks)).toContain("goal");
  });

  it("성격 장단점 문항에는 강점과 경험을 권한다", () => {
    const picked = recommendGuidedBlocks("본인 성격의 장단점을 말씀해 주십시오.", blocks);

    expect(picked).toContain("strength");
    expect(picked.some((block) => block.startsWith("experience-"))).toBe(true);
  });

  it("규칙에 걸리지 않는 문항에는 경험을 권한다", () => {
    // 학교생활·특기사항처럼 사례를 묻는 문항이 나머지의 대부분이고,
    // 주장보다 실제 있었던 일이 낫다.
    const picked = recommendGuidedBlocks("본인의 학교생활 및 특기사항은 어떤 것이 있으십니까?", blocks);

    expect(picked.filter((block) => block.startsWith("experience-"))).toHaveLength(2);
  });

  it("없는 소재는 추천하지 않는다", () => {
    const empty = { ...createGuidedCreateDraft(), motivation: "관심이 생겼습니다." };
    const picked = recommendGuidedBlocks("지원 동기를 서술하세요.", availableGuidedBlocks(empty));

    expect(picked).toEqual(["motivation"]);
  });

  it("추천 순서는 화면에 보이는 순서를 따른다", () => {
    const picked = recommendGuidedBlocks("지원 동기를 서술하세요.", blocks);

    expect(picked).toEqual(blocks.filter((block) => picked.includes(block)));
  });
});
