import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { restoreWorkStyleScores, scoreWorkStyle, workStyleItems, type WorkStyleAnswer, type WorkStyleDimension, type WorkStyleScore } from "./career-assessment";
import { getCareerAiSample } from "./career-ai-sample";
import { computeReportHero } from "./career-report-hero";
import { classifyWorkStyleType, getWorkStyleTypeById, pulledPrototype, workStyleTypeCode, workStyleTypeDistance, workStyleTypeImagePath, type WorkStyleTypeConfig } from "./work-style-type";
import { WORK_STYLE_PROTOTYPE_ORDER, WORK_STYLE_TYPE_CONFIG, WORK_STYLE_TYPES, type WorkStyleTypeDefinition } from "./work-style-type-config";

const scoresOf = (values: readonly number[]): WorkStyleScore[] =>
  WORK_STYLE_PROTOTYPE_ORDER.map((dimension, index) => ({
    dimension,
    label: dimension,
    score: values[index],
    rawScore: 0,
    level: "보통",
    summary: "",
    careerPrompt: "",
  }));

const config: WorkStyleTypeConfig = WORK_STYLE_TYPE_CONFIG;

// 결정적 의사난수(테스트 재현용). 판정 로직에는 랜덤이 없다.
function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

describe("업무성향 유형 설정", () => {
  it("has 30 unique, correctly numbered types with valid prototypes", () => {
    expect(WORK_STYLE_TYPES).toHaveLength(30);
    expect(WORK_STYLE_TYPES.map((type) => type.id)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    expect(new Set(WORK_STYLE_TYPES.map((type) => type.name)).size).toBe(30);
    expect(new Set(WORK_STYLE_TYPES.map((type) => type.prototype.join(","))).size).toBe(30);
    for (const type of WORK_STYLE_TYPES) {
      expect(type.prototype.every((value) => value >= 0 && value <= 100)).toBe(true);
      expect(type.core.every((dimension) => WORK_STYLE_PROTOTYPE_ORDER.includes(dimension))).toBe(true);
    }
  });

  it("uses the agreed settings and final names", () => {
    expect(WORK_STYLE_TYPE_CONFIG.pullToCenter).toBe(0.25);
    expect(WORK_STYLE_TYPE_CONFIG.coreWeight).toBe(2);
    expect(WORK_STYLE_TYPE_CONFIG.otherWeight).toBe(1);
    expect(WORK_STYLE_TYPE_CONFIG.nearTypeGap).toBe(0.41);
    const name = (id: number) => WORK_STYLE_TYPES.find((type) => type.id === id)?.name;
    expect([4, 5, 10, 12, 14, 28, 29].map(name)).toEqual(["논리형 전략가", "소통형 연결가", "워라밸형 조화가", "근거형 의사결정가", "네트워크형 중재가", "데이터형 분석가", "세심형 완성가"]);
  });

  it("links every type to an existing WebP file", () => {
    for (const type of WORK_STYLE_TYPES) {
      const filePath = path.join(process.cwd(), "public", workStyleTypeImagePath(type));
      expect(type.image.file).toBe(`type-${String(type.id).padStart(2, "0")}.webp`);
      expect(existsSync(filePath), filePath).toBe(true);
    }
  });
});

describe("classifyWorkStyleType", () => {
  it("can reach all 30 types", () => {
    const reached = new Set<number>();
    for (const type of WORK_STYLE_TYPES) {
      // 각 유형의 (당김 적용) 프로토타입 자체, 그리고 정수로 반올림한 실제 점수 모양 둘 다 자기 유형이 나와야 한다.
      const exact = pulledPrototype(type);
      expect(classifyWorkStyleType(scoresOf(exact)).primary.id).toBe(type.id);
      expect(classifyWorkStyleType(scoresOf(exact.map(Math.round))).primary.id).toBe(type.id);
      reached.add(classifyWorkStyleType(scoresOf(exact)).primary.id);
    }
    expect(reached.size).toBe(30);
  });

  it("reaches every type from actual questionnaire-shaped scores too", () => {
    const random = lcg(20260920);
    const reached = new Set<number>();
    for (let sample = 0; sample < 20000; sample += 1) {
      reached.add(classifyWorkStyleType(scoresOf(WORK_STYLE_PROTOTYPE_ORDER.map(() => Math.round(random() * 40) * 2.5))).primary.id);
    }
    expect(reached.size).toBe(30);
  });

  it("returns the same result for the same input and ignores score order", () => {
    const random = lcg(7);
    for (let sample = 0; sample < 300; sample += 1) {
      const values = WORK_STYLE_PROTOTYPE_ORDER.map(() => Math.round(random() * 100));
      const scores = scoresOf(values);
      const first = classifyWorkStyleType(scores);
      for (let repeat = 0; repeat < 5; repeat += 1) expect(classifyWorkStyleType(scores)).toEqual(first);
      expect(classifyWorkStyleType([...scores].reverse())).toEqual(first);
    }
  });

  it("shows a near type only when the first-second gap is below the configured value", () => {
    const random = lcg(99);
    let withNear = 0;
    const total = 2000;
    for (let sample = 0; sample < total; sample += 1) {
      const result = classifyWorkStyleType(scoresOf(WORK_STYLE_PROTOTYPE_ORDER.map(() => Math.round(random() * 40) * 2.5)));
      const gap = result.secondDistance - result.primaryDistance;
      expect(result.nearType !== null).toBe(gap < config.nearTypeGap);
      if (result.nearType) {
        withNear += 1;
        expect(result.nearType.id).not.toBe(result.primary.id);
      }
    }
    expect(withNear).toBeGreaterThan(0);
    expect(withNear).toBeLessThan(total);
  });

  it("treats the near-type gap as a strict boundary", () => {
    const scores = scoresOf([61, 68, 66, 63, 57]);
    const { primaryDistance, secondDistance } = classifyWorkStyleType(scores);
    const gap = secondDistance - primaryDistance;
    expect(gap).toBeGreaterThan(0);
    expect(classifyWorkStyleType(scores, { ...config, nearTypeGap: gap }).nearType).toBeNull();
    expect(classifyWorkStyleType(scores, { ...config, nearTypeGap: gap + 1e-6 }).nearType).not.toBeNull();
  });

  it("breaks exact distance ties by the type's own core-dimension level, then by lower id", () => {
    const equalWeights: WorkStyleTypeConfig = { ...config, coreWeight: 1, pullToCenter: 0 };
    const make = (id: number, core: readonly WorkStyleDimension[], prototype: WorkStyleTypeDefinition["prototype"]): WorkStyleTypeDefinition => ({
      id,
      name: `t${id}`,
      tagline: "",
      core,
      prototype,
      image: { file: `type-${String(id).padStart(2, "0")}.webp`, width: 1, height: 1 },
    });
    // 두 유형이 점수 벡터에서 정확히 같은 거리(핵심 가중치를 1로 맞춰 대칭).
    const scores = scoresOf([80, 40, 50, 50, 50]);
    const higherCoreWins = [make(1, ["agreeableness"], [85, 40, 50, 50, 50]), make(2, ["extraversion"], [80, 45, 50, 50, 50])];
    expect(workStyleTypeDistance([80, 40, 50, 50, 50], higherCoreWins[0], equalWeights)).toBe(workStyleTypeDistance([80, 40, 50, 50, 50], higherCoreWins[1], equalWeights));
    // 2번의 핵심 성향(E=80)이 1번의 핵심 성향(A=40)보다 높으므로 번호와 상관없이 2번이 앞선다.
    expect(classifyWorkStyleType(scores, equalWeights, higherCoreWins).primary.id).toBe(2);
    // 핵심 수준까지 같으면 번호가 낮은 쪽.
    const identicalLevel = [make(9, ["extraversion"], [85, 40, 50, 50, 50]), make(4, ["extraversion"], [75, 40, 50, 50, 50])];
    expect(classifyWorkStyleType(scores, equalWeights, identicalLevel).primary.id).toBe(4);
    // 두 유형이 완전히 같은 프로토타입이어도 항상 낮은 번호.
    const twins = [make(7, [], [60, 60, 60, 60, 60]), make(3, [], [60, 60, 60, 60, 60])];
    expect(classifyWorkStyleType(scoresOf([60, 60, 60, 60, 60]), equalWeights, twins).primary.id).toBe(3);
  });

  it("rejects missing or invalid scores", () => {
    expect(() => classifyWorkStyleType(scoresOf([50, 50, 50, 50, 50]).slice(0, 4))).toThrow("5개 점수");
    expect(() => classifyWorkStyleType(scoresOf([50, 50, Number.NaN, 50, 50]))).toThrow("5개 점수");
  });

  it("makes middle answers land on a type without a random or stored state", () => {
    const answers = Object.fromEntries(workStyleItems.map((item) => [item.id, 3])) as Record<string, WorkStyleAnswer>;
    const scores = scoreWorkStyle(answers);
    const result = classifyWorkStyleType(scores);
    expect(result.primary.id).toBeGreaterThanOrEqual(1);
    expect(classifyWorkStyleType(scoreWorkStyle(answers)).primary.id).toBe(result.primary.id);
  });
});

describe("기존 5개 성향 점수 계산 회귀", () => {
  const dimensions = ["extraversion", "agreeableness", "conscientiousness", "emotionalStability", "openness"] as const;

  it("keeps the documented 0–100 normalization for all-neutral answers", () => {
    const answers = Object.fromEntries(workStyleItems.map((item) => [item.id, 3])) as Record<string, WorkStyleAnswer>;
    const scores = scoreWorkStyle(answers);
    expect(scores.map((score) => score.dimension)).toEqual([...dimensions]);
    expect(scores.map((score) => score.score)).toEqual([50, 50, 50, 50, 50]);
    expect(scores.every((score) => score.rawScore === 30 && score.level === "보통")).toBe(true);
  });

  it("matches an independent reimplementation of the scoring formula on mixed answers", () => {
    const answers = Object.fromEntries(workStyleItems.map((item, index) => [item.id, ((index * 7) % 5) + 1])) as Record<string, WorkStyleAnswer>;
    const scores = scoreWorkStyle(answers);
    for (const score of scores) {
      const items = workStyleItems.filter((item) => item.dimension === score.dimension);
      const raw = items.reduce((sum, item) => sum + (item.direction === 1 ? answers[item.id] : 6 - answers[item.id]), 0);
      const expected = Math.round(((raw - items.length) / (items.length * 4)) * 100);
      expect(score.rawScore).toBe(raw);
      expect(score.score).toBe(expected);
      expect(score.level).toBe(expected >= 67 ? "높음" : expected <= 33 ? "낮음" : "보통");
    }
  });

  it("does not let the type step modify the score objects", () => {
    const answers = Object.fromEntries(workStyleItems.map((item, index) => [item.id, ((index * 3) % 5) + 1])) as Record<string, WorkStyleAnswer>;
    const scores = scoreWorkStyle(answers);
    const snapshot = JSON.stringify(scores);
    classifyWorkStyleType(scores);
    expect(JSON.stringify(scores)).toBe(snapshot);
  });
});

describe("유형 조회와 리포트 히어로", () => {
  it("looks up a type by number and falls back safely", () => {
    expect(getWorkStyleTypeById("02").name).toBe("차근차근 조율가");
    expect(getWorkStyleTypeById(30).name).toBe("균형형 조정가");
    expect(getWorkStyleTypeById("99").id).toBe(1);
    expect(getWorkStyleTypeById(undefined).id).toBe(1);
    expect(workStyleTypeCode(getWorkStyleTypeById(7))).toBe("07");
  });

  it("points the work-style AI sample at an existing type", () => {
    expect(getWorkStyleTypeById(getCareerAiSample("work_style").code).name).toBe(getCareerAiSample("work_style").typeName);
  });

  it("builds the paid-report hero only from a complete work-style answer set", () => {
    const answers = Object.fromEntries(workStyleItems.map((item) => [item.id, 3]));
    const hero = computeReportHero("work_style", null, null, JSON.stringify(answers));
    expect(hero?.badge).toBe("업무성향 유형");
    expect(hero?.imagePath).toMatch(/^\/images\/career-work-style-types\/type-\d{2}\.webp$/);
    expect(computeReportHero("work_style", null, null, null)).toBeNull();
    expect(computeReportHero("work_style", null, null, "{}")).toBeNull();
    expect(computeReportHero("combined", null, null, JSON.stringify(answers))).toBeNull();
  });
});

describe("저장된 결과 복원", () => {
  it("restores the same scores and levels the scorer produced, so a saved record looks like the original", () => {
    const answers = Object.fromEntries(workStyleItems.map((item, index) => [item.id, ((index * 7) % 5) + 1])) as Record<string, WorkStyleAnswer>;
    const original = scoreWorkStyle(answers);
    const restored = restoreWorkStyleScores(original.map((score) => ({ code: score.dimension, score: score.score })));
    expect(restored?.map((score) => [score.dimension, score.score, score.level, score.label])).toEqual(original.map((score) => [score.dimension, score.score, score.level, score.label]));
    expect(restored && classifyWorkStyleType(restored).primary.id).toBe(classifyWorkStyleType(original).primary.id);
  });

  it("refuses incomplete or out-of-range saved scores", () => {
    expect(restoreWorkStyleScores([])).toBeNull();
    expect(restoreWorkStyleScores(WORK_STYLE_PROTOTYPE_ORDER.map((code, index) => ({ code, score: index === 2 ? 140 : 50 })))).toBeNull();
  });
});
