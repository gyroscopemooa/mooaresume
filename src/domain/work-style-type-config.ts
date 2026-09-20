import type { WorkStyleDimension } from "./career-assessment";

/**
 * 업무성향 30개 대표 유형 판정 설정.
 * 프로토타입 값·중앙 당김·가중치·인접 표시 기준은 모두 여기서만 조정한다.
 * (실제 응답이 쌓이면 이 파일의 값만 다시 보정하면 된다.)
 */

/** 프로토타입 벡터의 성향 순서: E, A, C, S, O. */
export const WORK_STYLE_PROTOTYPE_ORDER: readonly WorkStyleDimension[] = [
  "extraversion",
  "agreeableness",
  "conscientiousness",
  "emotionalStability",
  "openness",
];

export const WORK_STYLE_TYPE_CONFIG = {
  /** 설계 프로토타입을 응답 집단의 중심 쪽으로 당기는 비율(0.25 = 25%). */
  pullToCenter: 0.25,
  /** 카드의 핵심 성향에 주는 거리 가중치. */
  coreWeight: 2,
  /** 핵심이 아닌 성향의 거리 가중치. */
  otherWeight: 1,
  /** 1위·2위 거리 차이가 이 값보다 작을 때만 "가까운 업무성향"을 보여준다. */
  nearTypeGap: 0.41,
  /** 응답 집단 중심(E, A, C, S, O). 규준 데이터가 없어 가상 집단 기준이며, 응답이 쌓이면 다시 계산한다. */
  populationCenter: [55, 64, 62, 52, 62],
  /** 유형 이미지 폴더. */
  imageBasePath: "/images/career-work-style-types",
} as const;

export type WorkStylePrototype = readonly [number, number, number, number, number];

export type WorkStyleTypeDefinition = {
  /** 카드 번호(1~30). */
  id: number;
  name: string;
  /** 카드에 적힌 한 줄 소개. */
  tagline: string;
  /** 이 카드에서 더 무겁게 보는 핵심 성향. 없으면 다섯 성향을 같은 비중으로 본다. */
  core: readonly WorkStyleDimension[];
  /** 설계 프로토타입(E, A, C, S, O), 중앙 당김 적용 전. */
  prototype: WorkStylePrototype;
  image: { file: string; width: number; height: number };
};

const E = "extraversion" as const;
const A = "agreeableness" as const;
const C = "conscientiousness" as const;
const S = "emotionalStability" as const;
const O = "openness" as const;

const image = (id: number, width: number, height: number) => ({
  file: `type-${String(id).padStart(2, "0")}.webp`,
  width,
  height,
});

export const WORK_STYLE_TYPES: readonly WorkStyleTypeDefinition[] = [
  { id: 1, name: "계획형 실행가", tagline: "차근차근, 하지만 확실하게 목표를 이루는 사람", core: [C], prototype: [44, 57, 78, 60, 48], image: image(1, 900, 900) },
  { id: 2, name: "차근차근 조율가", tagline: "다양한 의견을 듣고 조율하며 계획을 차근차근 실행하는 사람", core: [A, C], prototype: [45, 72, 79, 63, 56], image: image(2, 900, 1125) },
  { id: 3, name: "아이디어 탐험가", tagline: "새로운 시선으로 가능성을 발견하는 사람", core: [O], prototype: [73, 51, 34, 69, 86], image: image(3, 900, 1125) },
  { id: 4, name: "논리형 전략가", tagline: "데이터로 보고, 논리로 설계하는 사람", core: [O, C], prototype: [32, 35, 69, 50, 83], image: image(4, 900, 1125) },
  { id: 5, name: "소통형 연결가", tagline: "사람과 사람을 이어 더 큰 가치를 만드는 사람", core: [E], prototype: [94, 74, 49, 59, 45], image: image(5, 900, 1125) },
  { id: 6, name: "꼼꼼한 완성가", tagline: "작은 것도 놓치지 않고 완벽하게 마무리하는 사람", core: [C], prototype: [30, 44, 81, 51, 42], image: image(6, 900, 1125) },
  { id: 7, name: "도전형 개척가", tagline: "새로운 목표에 도전하고 끝까지 나아가는 사람", core: [S, O], prototype: [73, 43, 57, 78, 70], image: image(7, 900, 1125) },
  { id: 8, name: "안정형 든든이", tagline: "묵묵히 지켜주며 팀의 중심을 만드는 사람", core: [S], prototype: [34, 69, 70, 84, 36], image: image(8, 900, 1125) },
  { id: 9, name: "성장형 학습가", tagline: "배우고 익히며 꾸준히 성장하는 사람", core: [O, C], prototype: [34, 54, 76, 56, 76], image: image(9, 900, 1125) },
  { id: 10, name: "워라밸형 조화가", tagline: "일도 삶도 조화롭게, 지속가능한 성과를 만드는 사람", core: [S], prototype: [58, 78, 52, 83, 54], image: image(10, 900, 1125) },
  { id: 11, name: "창의형 기획가", tagline: "새로운 아이디어로 가능성을 만들어가는 사람", core: [O], prototype: [51, 55, 61, 54, 95], image: image(11, 900, 1125) },
  { id: 12, name: "근거형 의사결정가", tagline: "데이터와 논리로 더 나은 선택을 만들어가는 사람", core: [O, S], prototype: [45, 39, 58, 68, 79], image: image(12, 900, 1125) },
  { id: 13, name: "지원형 케어가", tagline: "사람을 돕고 함께 성과를 만드는 사람", core: [A], prototype: [64, 91, 61, 59, 36], image: image(13, 900, 1125) },
  { id: 14, name: "네트워크형 중재가", tagline: "사람들을 하나로 연결하고 좋은 협업을 돕는 사람", core: [A, E], prototype: [75, 87, 40, 61, 71], image: image(14, 900, 1125) },
  { id: 15, name: "현장형 해결사", tagline: "문제의 핵심을 빠르게 짚고 현실적인 해법으로 바로 움직이는 사람", core: [S], prototype: [54, 41, 50, 84, 42], image: image(15, 900, 1350) },
  { id: 16, name: "몰입형 집중가", tagline: "한 가지 중요한 일에 깊이 몰입해 끝까지 의미 있는 결과를 만드는 사람", core: [C], prototype: [20, 50, 72, 63, 61], image: image(16, 900, 1350) },
  { id: 17, name: "설득형 영향가", tagline: "상대의 마음을 읽고 핵심을 전해 좋은 선택과 변화를 이끄는 사람", core: [E], prototype: [95, 53, 59, 70, 65], image: image(17, 900, 1350) },
  { id: 18, name: "목표형 성취가", tagline: "선명한 목표를 향해 꾸준히 전진하며 눈에 보이는 성과를 만드는 사람", core: [C], prototype: [69, 39, 85, 69, 54], image: image(18, 900, 1350) },
  { id: 19, name: "원칙형 기준가", tagline: "분명한 기준과 공정한 판단으로 믿을 수 있는 일의 질서를 만드는 사람", core: [C, A], prototype: [39, 77, 81, 51, 30], image: image(19, 900, 1350) },
  { id: 20, name: "결단형 리더", tagline: "방향을 분명히 정하고 책임 있게 결정해 사람과 일을 앞으로 이끄는 사람", core: [E, S], prototype: [86, 45, 75, 78, 58], image: image(20, 900, 1350) },
  { id: 21, name: "변화형 적응가", tagline: "달라진 상황을 빠르게 받아들이고 더 나은 방식으로 유연하게 전환하는 사람", core: [S], prototype: [51, 57, 30, 84, 62], image: image(21, 900, 1350) },
  { id: 22, name: "구조형 설계가", tagline: "복잡한 내용을 체계적으로 정리해 누구나 따라갈 수 있는 흐름을 만드는 사람", core: [C], prototype: [37, 61, 87, 48, 64], image: image(22, 900, 1350) },
  { id: 23, name: "독립형 자율가", tagline: "스스로 일하는 방식을 정하고 책임 있게 움직여 자유 속에서도 결과를 만드는 사람", core: [E, A], prototype: [23, 30, 62, 75, 60], image: image(23, 900, 1350) },
  { id: 24, name: "회복형 버팀가", tagline: "어려운 순간에도 중심을 되찾고 다시 힘을 내 끝까지 나아가는 사람", core: [S], prototype: [56, 66, 77, 77, 52], image: image(24, 900, 1350) },
  { id: 25, name: "효율형 최적가", tagline: "불필요한 과정을 덜어내고 시간과 자원을 가장 효과적으로 활용하는 사람", core: [C, O], prototype: [46, 39, 73, 63, 68], image: image(25, 900, 1350) },
  { id: 26, name: "성장지향 도전가", tagline: "현재에 안주하지 않고 끊임없이 배우며 새로운 가능성에 도전하는 사람", core: [O], prototype: [54, 59, 63, 70, 90], image: image(26, 900, 1350) },
  { id: 27, name: "조화형 협력가", tagline: "사람과의 관계를 소중히 여기며 함께의 힘으로 더 큰 성과를 만드는 사람", core: [A], prototype: [76, 91, 54, 54, 51], image: image(27, 900, 1350) },
  { id: 28, name: "데이터형 분석가", tagline: "데이터와 논리로 상황을 분석하고 최선의 전략을 찾아내는 사람", core: [C], prototype: [45, 45, 84, 52, 72], image: image(28, 900, 1350) },
  { id: 29, name: "세심형 완성가", tagline: "작은 부분까지 꼼꼼하게 살피며 높은 완성도로 일을 마무리하는 사람", core: [C], prototype: [36, 66, 90, 35, 41], image: image(29, 900, 1350) },
  { id: 30, name: "균형형 조정가", tagline: "다양한 상황을 조율하고 균형을 잡아 사람과 조직이 함께 성장하도록 돕는 사람", core: [], prototype: [59, 74, 65, 71, 58], image: image(30, 900, 1350) },
];
