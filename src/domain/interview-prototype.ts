import { z } from "zod";

export const interviewEvidenceStatusSchema = z.enum([
  "official",
  "corroborated_reports",
  "user_document",
  "role_based_estimate",
]);

export type InterviewEvidenceStatus = z.infer<typeof interviewEvidenceStatusSchema>;

export const interviewQuestionPrototypeSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  intent: z.string().min(1),
  evidenceStatus: interviewEvidenceStatusSchema,
  evidenceNote: z.string().min(1),
  competency: z.string().min(1),
});

export const interviewPresetPrototypeSchema = z.object({
  id: z.string().min(1),
  companyName: z.string().min(1),
  positionName: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().min(1),
  route: z.enum(["recorded_ai", "conversational_ai", "human_interview"]),
  evidenceStatus: interviewEvidenceStatusSchema,
  verifiedAt: z.string().date().nullable(),
  sourceSummary: z.string().min(1),
  sourceUrls: z.array(z.string().url()).max(6),
  config: z.object({
    prepSeconds: z.number().int().min(0).max(600),
    answerSeconds: z.number().int().min(15).max(600),
    cameraRequired: z.boolean(),
    retryCount: z.number().int().min(0).max(5),
    questionPresentation: z.enum(["text", "tts", "text_and_tts"]),
    followUpsEnabled: z.boolean(),
  }),
  questions: z.array(interviewQuestionPrototypeSchema).min(1).max(20),
});

export type InterviewPresetPrototype = z.infer<typeof interviewPresetPrototypeSchema>;

const rawPrototypePresets: InterviewPresetPrototype[] = [
  {
    id: "hyundai-production-demo",
    companyName: "현대자동차",
    positionName: "모빌리티 기술인력 · 생산",
    displayName: "현대자동차 생산직 면접 연구 시안",
    description: "현대자동차 공식 채용 절차와 생산직 직무 맥락을 반영한 로컬 개발용 시안입니다.",
    route: "human_interview",
    evidenceStatus: "role_based_estimate",
    verifiedAt: "2026-09-28",
    sourceSummary: "공식 채용 절차는 확인했지만 아래 질문은 아직 실제 기출로 검증하지 않은 직무 기반 예상 질문입니다.",
    sourceUrls: [
      "https://talent.hyundai.com/apply/applyProcess.hc",
      "https://www.jobplanet.co.kr/contents/news-7044",
    ],
    config: {
      prepSeconds: 30,
      answerSeconds: 90,
      cameraRequired: true,
      retryCount: 1,
      questionPresentation: "text_and_tts",
      followUpsEnabled: true,
    },
    questions: [
      {
        id: "hyundai-intro",
        text: "현대자동차 생산 현장에서 본인이 맡고 싶은 역할과 그 역할에 적합한 이유를 말씀해 주세요.",
        intent: "지원 동기와 생산 직무 이해, 보유 경험의 연결을 확인합니다.",
        evidenceStatus: "role_based_estimate",
        evidenceNote: "직무 기반 예상 질문 · 실제 기출로 확인되지 않음",
        competency: "직무 이해",
      },
      {
        id: "hyundai-safety-quality",
        text: "안전과 생산성이 충돌하는 상황에서 어떤 기준으로 판단하고 행동하겠습니까?",
        intent: "생산 현장의 안전 원칙과 상황 판단 과정을 확인합니다.",
        evidenceStatus: "role_based_estimate",
        evidenceNote: "생산 직무 역량 기반 예상 질문",
        competency: "안전·판단",
      },
      {
        id: "hyundai-improvement",
        text: "반복되는 작업이나 절차에서 문제를 발견하고 개선한 경험을 구체적으로 말씀해 주세요.",
        intent: "문제 발견, 본인의 행동, 개선 결과가 실제 경험으로 이어지는지 확인합니다.",
        evidenceStatus: "role_based_estimate",
        evidenceNote: "지원자료가 연결되면 사용자 경험 근거형으로 교체 예정",
        competency: "문제해결",
      },
    ],
  },
  {
    id: "generic-recorded-ai",
    companyName: "기업 AI 채용전형",
    positionName: "범용 영상면접",
    displayName: "녹화형 AI 영상면접",
    description: "질문 확인, 준비시간, 제한시간 녹화와 자동 전환을 연습하는 기본 프리셋입니다.",
    route: "recorded_ai",
    evidenceStatus: "official",
    verifiedAt: "2026-09-28",
    sourceSummary: "HireVue와 JOBDA가 공개한 비동기 영상면접의 공통 응시 흐름을 반영했습니다.",
    sourceUrls: [
      "https://www.hirevue.com/blog/hiring/video-interviewing-guide",
      "https://www.jobda.im/acc/tutorial",
    ],
    config: {
      prepSeconds: 30,
      answerSeconds: 90,
      cameraRequired: true,
      retryCount: 0,
      questionPresentation: "text_and_tts",
      followUpsEnabled: false,
    },
    questions: [
      {
        id: "ai-introduction",
        text: "지원한 직무와 연결하여 본인을 1분 안에 소개해 주세요.",
        intent: "핵심 강점과 직무 연결을 제한시간 안에 전달하는지 확인합니다.",
        evidenceStatus: "role_based_estimate",
        evidenceNote: "범용 연습 질문",
        competency: "자기표현",
      },
      {
        id: "ai-collaboration",
        text: "협업 과정에서 의견이 달랐던 상황과 이를 해결한 과정을 말씀해 주세요.",
        intent: "갈등 상황에서의 구체적인 행동과 결과를 확인합니다.",
        evidenceStatus: "role_based_estimate",
        evidenceNote: "범용 역량 질문",
        competency: "협업",
      },
      {
        id: "ai-learning",
        text: "최근 실패하거나 기대한 결과를 얻지 못한 경험과 이후 달라진 행동을 말씀해 주세요.",
        intent: "실패를 대하는 태도와 학습 이후의 행동 변화를 확인합니다.",
        evidenceStatus: "role_based_estimate",
        evidenceNote: "범용 역량 질문",
        competency: "성찰·학습",
      },
    ],
  },
];

export const LOCAL_INTERVIEW_PRESETS = interviewPresetPrototypeSchema.array().parse(rawPrototypePresets);

export const INTERVIEW_EVIDENCE_LABELS: Record<InterviewEvidenceStatus, string> = {
  official: "공식 확인",
  corroborated_reports: "복수 후기 확인",
  user_document: "내 안내문 확인",
  role_based_estimate: "직무 기반 예상",
};

export function formatInterviewSeconds(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function calculateTimeUsagePercent(recordedSeconds: number, answerSeconds: number): number {
  if (answerSeconds <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((recordedSeconds / answerSeconds) * 100)));
}

export function selectSupportedRecorderMimeType(isSupported: (mimeType: string) => boolean): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find(isSupported);
}
