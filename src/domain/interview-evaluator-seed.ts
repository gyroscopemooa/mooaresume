import { z } from "zod";

/** User-supplied reference, not a validated hiring instrument or active policy. */
export const EVALUATOR_SEED = {
  id: "interviewer-perspective-seed-v1",
  source: "MOOA_INTERVIEW_PRO_EVALUATOR_FINAL · 설계안 v1.0 · PDF 2–7쪽",
  status: "draft",
  dimensions: [
    { id: "A", title: "질문 적합성·답변 구조", weight: 20 },
    { id: "B", title: "경험·근거·직무 연결", weight: 25 },
    { id: "C", title: "경청·상호작용", weight: 15 },
    { id: "D", title: "전달력", weight: 15 },
    { id: "E", title: "태도·프로페셔널리즘", weight: 10 },
    { id: "F", title: "동기·준비도", weight: 10 },
    { id: "G", title: "지원자 질문·마무리", weight: 5 },
  ],
  rules: [
    "R1 단일 시선 이탈·필러·말 겹침만으로 감점하지 않음",
    "R2 빈도·지속시간·전체 대비 비율과 반복 맥락을 함께 확인",
    "R3 관찰 사실 → 상황 → 가능한 해석 → 개선 연습 순서",
    "R4 면접 형식에 따라 기준 검증. 기업 규모로 실제 형식을 단정하지 않음",
    "R5 예절보다 질문 적합성·근거·직무 연결 우선",
    "R6 확인 질문·자발적 질문·후속 질문을 각각 인정",
    "R7 근거 없는 경고 금지. 실제 타임스탬프/문장과 예외 확인",
    "R8 표정·시선에서 인성·정직성·정신상태·채용가능성 추정 금지",
  ],
  profiles: ["구조화 다대일", "대화형 1:1", "경력직 실무", "임원", "화상", "비대면 녹화"],
} as const;

export const evaluatorDraftSchema = z.object({
  seedId: z.literal(EVALUATOR_SEED.id),
  reason: z.string().trim().min(3).max(1000),
  weights: z.array(z.number().int().min(0).max(100)).length(7),
  savedAt: z.string().datetime(),
}).refine((draft) => draft.weights.reduce((sum, value) => sum + value, 0) === 100, { message: "배점 합계는 100이어야 합니다", path: ["weights"] });

export type EvaluatorDraft = z.infer<typeof evaluatorDraftSchema>;
