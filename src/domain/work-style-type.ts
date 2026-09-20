import type { WorkStyleScore } from "./career-assessment";
import {
  WORK_STYLE_PROTOTYPE_ORDER,
  WORK_STYLE_TYPE_CONFIG,
  WORK_STYLE_TYPES,
  type WorkStyleTypeDefinition,
} from "./work-style-type-config";

export type WorkStyleTypeConfig = {
  pullToCenter: number;
  coreWeight: number;
  otherWeight: number;
  nearTypeGap: number;
  populationCenter: readonly number[];
};

export type WorkStyleTypeResult = {
  primary: WorkStyleTypeDefinition;
  /** 1위와 2위의 거리 차이가 설정값보다 작을 때만 채워진다. */
  nearType: WorkStyleTypeDefinition | null;
  primaryDistance: number;
  secondDistance: number;
};

// 부동소수점 잡음에 결과가 흔들리지 않도록 거리를 이 자릿수로 맞춰 비교한다.
const DISTANCE_PRECISION = 1e9;

function toVector(scores: readonly WorkStyleScore[]): number[] {
  return WORK_STYLE_PROTOTYPE_ORDER.map((dimension) => {
    const found = scores.find((score) => score.dimension === dimension);
    if (!found || !Number.isFinite(found.score)) throw new Error("업무성향 5개 점수가 모두 필요합니다.");
    return found.score;
  });
}

function weightsFor(type: WorkStyleTypeDefinition, config: WorkStyleTypeConfig): number[] {
  return WORK_STYLE_PROTOTYPE_ORDER.map((dimension) => (type.core.includes(dimension) ? config.coreWeight : config.otherWeight));
}

/** 중앙 당김을 적용한 프로토타입. */
export function pulledPrototype(type: WorkStyleTypeDefinition, config: WorkStyleTypeConfig = WORK_STYLE_TYPE_CONFIG): number[] {
  const keep = 1 - config.pullToCenter;
  return type.prototype.map((value, index) => config.populationCenter[index] + keep * (value - config.populationCenter[index]));
}

/** 핵심 성향 가중 RMS 거리(점수 단위). */
export function workStyleTypeDistance(vector: readonly number[], type: WorkStyleTypeDefinition, config: WorkStyleTypeConfig = WORK_STYLE_TYPE_CONFIG): number {
  const prototype = pulledPrototype(type, config);
  const weights = weightsFor(type, config);
  let weighted = 0;
  let total = 0;
  for (let index = 0; index < vector.length; index += 1) {
    weighted += weights[index] * (vector[index] - prototype[index]) ** 2;
    total += weights[index];
  }
  return Math.round(Math.sqrt(weighted / total) * DISTANCE_PRECISION) / DISTANCE_PRECISION;
}

/** 동점 처리용: 카드의 핵심 성향(없으면 다섯 성향 전체) 평균 점수. */
function coreLevel(vector: readonly number[], type: WorkStyleTypeDefinition): number {
  const indices = type.core.length ? type.core.map((dimension) => WORK_STYLE_PROTOTYPE_ORDER.indexOf(dimension)) : vector.map((_, index) => index);
  return indices.reduce((sum, index) => sum + vector[index], 0) / indices.length;
}

/**
 * 5개 성향 점수로 30개 유형 중 대표 유형 1개를 정한다. 같은 입력은 항상 같은 결과다.
 * 정렬 순서: 거리 → (동점이면) 카드 핵심 성향 점수가 높은 쪽 → 번호가 낮은 쪽.
 */
export function classifyWorkStyleType(
  scores: readonly WorkStyleScore[],
  config: WorkStyleTypeConfig = WORK_STYLE_TYPE_CONFIG,
  types: readonly WorkStyleTypeDefinition[] = WORK_STYLE_TYPES,
): WorkStyleTypeResult {
  const vector = toVector(scores);
  const ranked = types
    .map((type) => ({ type, distance: workStyleTypeDistance(vector, type, config), level: coreLevel(vector, type) }))
    .sort((a, b) => a.distance - b.distance || b.level - a.level || a.type.id - b.type.id);
  const [first, second] = ranked;
  const gap = second.distance - first.distance;
  return {
    primary: first.type,
    nearType: gap < config.nearTypeGap ? second.type : null,
    primaryDistance: first.distance,
    secondDistance: second.distance,
  };
}

export function workStyleTypeImagePath(type: WorkStyleTypeDefinition): string {
  return `${WORK_STYLE_TYPE_CONFIG.imageBasePath}/${type.image.file}`;
}

/** 카드 번호 표기("01"~"30"). */
export function workStyleTypeCode(type: WorkStyleTypeDefinition): string {
  return String(type.id).padStart(2, "0");
}

/** 주소·샘플 등 문자열 번호로 유형을 찾는다. 알 수 없으면 1번을 돌려준다(캐릭터 페이지가 죽지 않게). */
export function getWorkStyleTypeById(value: string | number | null | undefined): WorkStyleTypeDefinition {
  const id = typeof value === "number" ? value : Number.parseInt(value ?? "", 10);
  return WORK_STYLE_TYPES.find((type) => type.id === id) ?? WORK_STYLE_TYPES[0];
}
