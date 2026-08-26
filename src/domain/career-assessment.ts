export const WORK_STYLE_TEST_VERSION = "ipip-bffm-kr-50-v1" as const;

export type WorkStyleDimension =
  | "extraversion"
  | "agreeableness"
  | "conscientiousness"
  | "emotionalStability"
  | "openness";

export type WorkStyleAnswer = 1 | 2 | 3 | 4 | 5;

export type WorkStyleItem = {
  id: string;
  dimension: WorkStyleDimension;
  direction: 1 | -1;
  text: string;
};

export type WorkStyleScore = {
  dimension: WorkStyleDimension;
  label: string;
  score: number;
  rawScore: number;
  level: "낮음" | "보통" | "높음";
  summary: string;
  careerPrompt: string;
};

const dimensionDetails: Record<WorkStyleDimension, Omit<WorkStyleScore, "score" | "rawScore" | "level">> = {
  extraversion: {
    dimension: "extraversion",
    label: "상호작용 선호",
    summary: "사람과의 상호작용, 의견 표현, 대외 활동에 대한 응답 경향입니다.",
    careerPrompt: "협업·고객 접점·발표 경험 중 실제로 편안하게 해낸 장면을 찾아보세요.",
  },
  agreeableness: {
    dimension: "agreeableness",
    label: "협업 지향",
    summary: "타인의 관점에 관심을 두고 관계를 조율하려는 응답 경향입니다.",
    careerPrompt: "의견 차이를 조정하거나 동료를 도운 실제 경험을 하나 골라보세요.",
  },
  conscientiousness: {
    dimension: "conscientiousness",
    label: "계획·완수",
    summary: "계획, 세부 확인, 책임 있는 마무리에 대한 응답 경향입니다.",
    careerPrompt: "일정을 세우고 품질을 관리하거나 끝까지 완수한 경험을 확인해 보세요.",
  },
  emotionalStability: {
    dimension: "emotionalStability",
    label: "정서적 안정",
    summary: "압박이나 변화가 있는 상황에서의 정서적 반응에 대한 응답 경향입니다.",
    careerPrompt: "예상치 못한 문제를 침착하게 정리한 경험이 있다면 사실에 맞게 활용해 보세요.",
  },
  openness: {
    dimension: "openness",
    label: "학습·새로운 방식",
    summary: "새로운 아이디어, 학습, 복잡한 문제 탐색에 대한 응답 경향입니다.",
    careerPrompt: "새로운 방법을 익히거나 개선안을 제안한 경험을 찾아보세요.",
  },
};

// Korean wording supplied on the official IPIP translation page by In-Sue Oh.
// The 50-item selection is the first 10 markers from each factor used by the
// official 50-item representation. Presentation is interleaved so adjacent
// questions do not measure the same construct.
export const workStyleItems: readonly WorkStyleItem[] = [
  ["e1", "extraversion", 1, "나는 각종 모임에 다니는 것을 즐긴다."],
  ["a1", "agreeableness", -1, "나는 다른 사람들의 근심을 거의 알아차리지 못한다."],
  ["c1", "conscientiousness", 1, "나는 무슨 일이든 항상 준비를 하는 편이다."],
  ["s1", "emotionalStability", -1, "나는 쉽게 스트레스로 지치는 편이다."],
  ["o1", "openness", 1, "나는 어휘력이 풍부하다."],
  ["e2", "extraversion", -1, "나는 말이 적은 편이다."],
  ["a2", "agreeableness", 1, "나는 다른 사람들에 대해 관심이 있다."],
  ["c2", "conscientiousness", -1, "나는 내 물건들을 여기저기에 그냥 놓는 편이다."],
  ["s2", "emotionalStability", 1, "나는 대체적으로 이완된 상태이다."],
  ["o2", "openness", -1, "나는 추상적인 것을 잘 이해하지 못한다."],
  ["e3", "extraversion", 1, "나는 여러 사람들 가운데 있어도 편하다."],
  ["a3", "agreeableness", -1, "나는 다른 사람들에게 무례한 언행을 사용할 때가 자주 있다."],
  ["c3", "conscientiousness", 1, "나는 세부사항도 잘 챙기려고 이에 신경을 쓰는 편이다."],
  ["s3", "emotionalStability", -1, "나는 걱정이 많다."],
  ["o3", "openness", 1, "나는 생생한 상상력을 가지고 있다."],
  ["e4", "extraversion", -1, "나는 나서지 않는 편이다."],
  ["a4", "agreeableness", 1, "나는 다른 사람들의 감정을 잘 공감한다."],
  ["c4", "conscientiousness", 1, "나는 자질구레한 일들은 금방금방 해치운다."],
  ["s4", "emotionalStability", -1, "나는 쉽게 심란해진다."],
  ["o4", "openness", 1, "나는 굉장한 아이디어들을 가지고 있다."],
  ["e5", "extraversion", 1, "나는 사람들을 만나면 대화를 먼저 시작하는 편이다."],
  ["a5", "agreeableness", -1, "나는 다른 사람들의 개인적인 문제에 관심이 없다."],
  ["c5", "conscientiousness", 1, "나는 질서정연한 것을 좋아한다."],
  ["s5", "emotionalStability", -1, "나는 쉽게 속이 상한다."],
  ["o5", "openness", 1, "나는 무엇이든 매우 빨리 이해한다."],
  ["e6", "extraversion", -1, "나는 보통 할 말이 별로 없다."],
  ["a6", "agreeableness", 1, "나는 마음이 여린 편이다."],
  ["c6", "conscientiousness", -1, "나는 물건들을 어질러 놓는 편이다."],
  ["s6", "emotionalStability", -1, "나는 분위기를 많이 탄다."],
  ["o6", "openness", 1, "나는 수준 높은 단어를 쓰는 편이다."],
  ["e7", "extraversion", 1, "나는 모임에서 여러 사람들과 이야기를 나누는 편이다."],
  ["a7", "agreeableness", 1, "나는 주변 다른 사람들에게 내 시간을 잘 할애하는 편이다."],
  ["c7", "conscientiousness", 1, "나는 정해진 일정을 따르는 편이다."],
  ["s7", "emotionalStability", -1, "나는 감정의 기복이 심하다."],
  ["o7", "openness", 1, "나는 골똘히 생각하며 시간을 보낼 때가 많다."],
  ["e8", "extraversion", -1, "나는 나에게 관심이나 이목이 집중되는 것을 좋아하지 않는다."],
  ["a8", "agreeableness", 1, "나는 주변 다른 사람들의 감정을 잘 알아차린다."],
  ["c8", "conscientiousness", -1, "나는 물건들을 제자리에 되놓은 것을 자주 잊는다."],
  ["s8", "emotionalStability", -1, "나는 쉽게 짜증이 난다."],
  ["o8", "openness", -1, "나는 복잡한 것은 질색이다."],
  ["e9", "extraversion", 1, "나는 다른 사람들의 주목을 받는 것을 꺼리지 않는다."],
  ["a9", "agreeableness", 1, "나는 주변 다른 사람들을 편안하게 해준다."],
  ["c9", "conscientiousness", 1, "나는 내가 맡은 일에 매우 꼼꼼한 사람이다."],
  ["s9", "emotionalStability", -1, "나는 쉽게 우울해진다."],
  ["o9", "openness", 1, "나는 아이디어가 매우 풍부하다."],
  ["e10", "extraversion", -1, "나는 모르는 사람들 가운데 있으면 조용해진다."],
  ["a10", "agreeableness", -1, "나는 다른 사람들에 대해 별로 관심이 없다."],
  ["c10", "conscientiousness", -1, "내가 맡은 일들을 대충 처리하는 경우도 많다."],
  ["s10", "emotionalStability", 1, "나는 거의 우울함을 느끼지 않는 편이다."],
  ["o10", "openness", -1, "나는 상상력이 좋지 않다."],
].map(([id, dimension, direction, text]) => ({
  id: id as string,
  dimension: dimension as WorkStyleDimension,
  direction: direction as 1 | -1,
  text: text as string,
}));

export function scoreWorkStyle(answers: Record<string, WorkStyleAnswer>): WorkStyleScore[] {
  if (Object.keys(answers).length !== workStyleItems.length) {
    throw new Error("모든 문항에 답해야 결과를 계산할 수 있습니다.");
  }

  return (Object.keys(dimensionDetails) as WorkStyleDimension[]).map((dimension) => {
    const items = workStyleItems.filter((item) => item.dimension === dimension);
    const rawScore = items.reduce((sum, item) => {
      const answer = answers[item.id];
      if (!answer || answer < 1 || answer > 5) throw new Error("응답값이 올바르지 않습니다.");
      return sum + (item.direction === 1 ? answer : 6 - answer);
    }, 0);
    const score = Math.round(((rawScore - items.length) / (items.length * 4)) * 100);
    const level = score >= 67 ? "높음" : score <= 33 ? "낮음" : "보통";
    return { ...dimensionDetails[dimension], rawScore, score, level };
  });
}

export function getCareerProfileHeadline(scores: WorkStyleScore[]): string {
  const topTwo = [...scores].sort((a, b) => b.score - a.score).slice(0, 2);
  return `${topTwo.map((score) => score.label).join("·")}에 관한 응답 경향이 두드러집니다.`;
}
