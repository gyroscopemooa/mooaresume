import { describe, expect, it } from "vitest";
import {
  WORK_VALUE_DIMENSIONS,
  WORK_VALUE_ITEMS,
  WORK_VALUE_BASE_CARDS,
  WORK_VALUE_PAIR_PROFILES,
  scoreWorkValues,
  getWorkValueCharacterProfile,
  getWorkValueProfile,
  type WorkValueAnswer,
} from "./career-work-values";

function answerAll(byDimensionValue: Partial<Record<string, WorkValueAnswer>> = {}, fallback: WorkValueAnswer = 3) {
  return Object.fromEntries(WORK_VALUE_ITEMS.map((item) => [item.id, byDimensionValue[item.dimension] ?? fallback]));
}

describe("직업가치 문항·채점", () => {
  it("6기준 × 3문항 = 18문항을 만든다", () => {
    expect(WORK_VALUE_DIMENSIONS).toHaveLength(6);
    expect(WORK_VALUE_ITEMS).toHaveLength(18);
    // 한 차원에만 몰려 있지 않고 돌아가며 섞여야, 앞부분만 풀고 그만둔 사람도
    // 여섯 기준을 골고루 만납니다.
    const firstSix = WORK_VALUE_ITEMS.slice(0, 6).map((item) => item.dimension);
    expect(new Set(firstSix).size).toBe(6);
  });

  it("응답이 하나라도 비어 있으면 채점을 거부한다", () => {
    const incomplete = answerAll();
    delete incomplete[WORK_VALUE_ITEMS[0].id];
    expect(() => scoreWorkValues(incomplete as Record<string, WorkValueAnswer>)).toThrow("모든 문항에 응답해야 합니다.");
  });

  it("전부 3점이면 모든 기준이 50점 근처로 나온다", () => {
    const scores = scoreWorkValues(answerAll({}, 3));
    for (const score of scores) expect(score.score).toBe(50);
  });

  it("한 기준만 5점을 주면 그 기준이 가장 높게 나온다", () => {
    const scores = scoreWorkValues(answerAll({ autonomy: 5 }, 1));
    const top = [...scores].sort((a, b) => b.score - a.score)[0];
    expect(top.id).toBe("autonomy");
    expect(top.score).toBe(100);
  });

  it("채점 결과에 저장·AI 해설이 쓰는 id·code·label이 들어 있다", () => {
    const [first] = scoreWorkValues(answerAll());
    expect(first).toMatchObject({ id: "autonomy", code: "A", label: "자율성" });
  });
});

describe("직업가치 캐릭터 카드", () => {
  it("30가지 순서 있는 조합이 모두 있고, 순서를 바꾸면 다른 카드다", () => {
    expect(Object.keys(WORK_VALUE_PAIR_PROFILES)).toHaveLength(30);
    const ai = getWorkValueCharacterProfile("AI");
    const ia = getWorkValueCharacterProfile("IA");
    expect(ai.code).toBe("AI");
    expect(ia.code).toBe("IA");
    expect(ai.title).not.toBe(ia.title);
  });

  it("소문자·잡음이 섞인 코드도 정규화해서 찾는다", () => {
    expect(getWorkValueCharacterProfile("ai")).toMatchObject({ code: "AI" });
    expect(getWorkValueCharacterProfile("A-I!")).toMatchObject({ code: "AI" });
  });

  it("못 알아보는 코드는 기본값으로 떨어지고 에러를 던지지 않는다", () => {
    expect(() => getWorkValueCharacterProfile("ZZ")).not.toThrow();
    expect(() => getWorkValueCharacterProfile(undefined)).not.toThrow();
  });

  it("시작 화면 슬라이드용 단일 문자 카드가 6장 다 있다", () => {
    expect(Object.keys(WORK_VALUE_BASE_CARDS)).toHaveLength(6);
    for (const code of WORK_VALUE_DIMENSIONS.map((dimension) => dimension.code)) {
      expect(WORK_VALUE_BASE_CARDS).toHaveProperty(code);
    }
  });

  it("모든 카드가 이미지 경로와 태그 3개를 갖는다", () => {
    for (const profile of Object.values(WORK_VALUE_PAIR_PROFILES)) {
      expect(profile.imagePath).toMatch(/^\/images\/career-work-value-examples\/[a-z]{2}\.webp$/);
      expect(profile.chips).toHaveLength(3);
    }
  });
});

describe("직업가치 원점수 결과 표제어", () => {
  it("상위 2개 기준으로 캐릭터 카드와 같은 이름을 고른다", () => {
    const scores = scoreWorkValues(answerAll({ autonomy: 5, growth: 4 }, 1));
    const profile = getWorkValueProfile(scores);
    expect(profile.code).toBe("AI");
    expect(profile.typeName).toBe(getWorkValueCharacterProfile("AI").title);
  });

  it("기준이 2개 미만이면 계산할 수 없다고 알린다", () => {
    expect(() => getWorkValueProfile([{ id: "autonomy", code: "A", label: "자율성", score: 80 }])).toThrow();
  });
});
