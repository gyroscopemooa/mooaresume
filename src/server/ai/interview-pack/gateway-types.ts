import type {
  AiAssessment,
  AiGenerate,
  PackAssessment,
  PackCard,
  PackSlotId,
} from "@/domain/interview-pack";
import type { EffectiveMaterials } from "@/domain/interview-pack-text";
import type { RetryNote, ReviseKind } from "./prompt";

/**
 * 면접 준비팩 AI 게이트웨이의 "모양" — 서비스가 의존하는 인터페이스, 오류 종류, 호출별 토큰 상한.
 *
 * OpenAI 호출 구현(gateway.ts)은 서버 전용이지만, 이 파일은 서버 키나 네트워크를 전혀 모른다.
 * 그래서 브라우저에서 도는 "화면만 보기" 샘플 모드도 같은 서비스 코드를 쓸 수 있고,
 * 그 경우 게이트웨이 자리에는 고정 응답이 들어간다(외부 호출 없음).
 */

export type PackAiUsage = { inputTokens: number | null; outputTokens: number | null; totalTokens: number | null };
export type PackAiResult<T> = { output: T; responseId: string | null; usage: PackAiUsage; model: string };

/** 호출 자체가 실패(네트워크·HTTP 오류·시간 초과). 재시도해도 사용자 횟수는 차감하지 않는다. */
export class PackAiProviderError extends Error {
  constructor(readonly status: number | null, message: string) {
    super(message);
    this.name = "PackAiProviderError";
  }
}

/** 응답은 왔지만 비었거나 형식이 틀림(토큰 한도로 잘린 경우 포함). */
export class PackAiInvalidOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackAiInvalidOutputError";
  }
}

/**
 * 호출별 출력 토큰 상한. 관리자 테스트 화면에도 이 값을 그대로 보여 준다.
 *
 * generate 는 한 번에 여러 문항 카드(근거·키워드·말하는 순서 포함)를 만들어서 더 넉넉하게 잡았다.
 * 그래도 한 번에 요청하는 문항 수가 많으면(추론 강도가 높을수록 눈에 보이지 않는 추론 토큰도 이 한도를
 * 같이 쓴다) 다 쓰지 못하고 잘릴 수 있어서, 서비스가 문항을 여러 번에 나눠 부른다(GENERATE_BATCH_SIZE).
 */
export const PACK_CALL_TOKEN_LIMITS = { assess: 6_000, generate: 16_000, revise: 4_000 } as const;

/** 서비스가 의존하는 좁은 인터페이스. 테스트에서는 이 자리에 가짜를 넣는다. */
export interface PackAiGateway {
  assess(materials: EffectiveMaterials): Promise<PackAiResult<AiAssessment>>;
  generate(input: { materials: EffectiveMaterials; assessment: PackAssessment | null; slots: readonly PackSlotId[]; retryNotes?: readonly RetryNote[] }): Promise<PackAiResult<AiGenerate>>;
  revise(input: {
    materials: EffectiveMaterials;
    assessment: PackAssessment | null;
    slot: PackSlotId;
    current: PackCard;
    kind: ReviseKind;
    customText?: string;
    otherCards: ReadonlyArray<{ slot: PackSlotId; answer: string }>;
    retryNotes?: readonly RetryNote[];
  }): Promise<PackAiResult<AiGenerate>>;
}
