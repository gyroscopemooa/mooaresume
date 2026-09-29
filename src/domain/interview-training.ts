import { z } from "zod";
import type { InterviewFeedbackResult, InterviewTranscriptionResult } from "./interview-feedback";
import type { InterviewAudioAnalysis } from "./interview-audio-analysis";
import type { VisionAnalysisResult } from "@/lib/interview-media/vision-geometry";

export const QUESTION_TYPES = { experience: "경험", motivation: "지원동기", conflict: "갈등·협업", role: "직무", situational: "상황 판단", introduction: "자기소개" } as const;
export const questionTypeSchema = z.enum(["experience", "motivation", "conflict", "role", "situational", "introduction"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;
export const QUESTION_CRITERIA: Record<QuestionType, readonly string[]> = {
  experience: ["상황", "과제", "본인 행동", "결과 근거", "배운 점"],
  motivation: ["기업 이해", "직무 이해", "지원 계기", "경험 연결", "기여 방향"],
  conflict: ["갈등 원인", "상대 관점", "본인 행동", "해결 과정", "결과·배운 점"],
  role: ["직무 이해", "판단 근거", "수행 방법", "경험 연결", "한계 인식"],
  situational: ["문제 파악", "판단 기준", "대안 검토", "실행 순서", "위험 대응"],
  introduction: ["핵심 강점", "경험 근거", "본인 기여", "직무 연결", "메시지 명료성"],
};
export const trainingContextSchema = z.object({
  questionType: z.union([z.literal("auto"), questionTypeSchema]),
  career: z.enum(["entry", "experienced"]), difficulty: z.enum(["standard", "deep"]),
  supportText: z.string().max(6000),
}).strict();
export type TrainingContext = z.infer<typeof trainingContextSchema>;
export const DEFAULT_TRAINING_CONTEXT: TrainingContext = { questionType: "auto", career: "entry", difficulty: "standard", supportText: "" };
export const trainingQuestionsRequestSchema = z.object({ requestId: z.uuid(), consent: z.literal(true), company: z.string().trim().min(1).max(200), role: z.string().trim().min(1).max(200), count: z.number().int().min(3).max(8), context: trainingContextSchema }).strict();
export const trainingQuestionsOutputSchema = z.object({ questions: z.array(z.object({ text: z.string().min(5).max(300), type: questionTypeSchema, sourceQuote: z.string().min(1).max(600).nullable(), intent: z.string().min(1).max(300) }).strict()).min(3).max(8) }).strict();

export type TextMark = { start: number; end: number; label: string; kind: "filler" | "linking" | "strength" | "concern"; note: string };
/** Occurrences, not errors: discourse connectors may be entirely appropriate. */
export function findSpeechExpressions(text: string): TextMark[] {
  const pattern = /(?<![가-힣A-Za-z0-9])(음+|어+|그니까|뭐랄까|약간|뭔가|사실|일단|그래서|그러니까|그)(?![가-힣A-Za-z0-9])/gu;
  return [...text.matchAll(pattern)].map(match => ({ start: match.index, end: match.index + match[0].length, label: match[0], kind: /^(사실|일단|그래서|그러니까|약간|뭔가|그)$/.test(match[0]) ? "linking" : "filler", note: "전사에 남은 표현입니다. 문맥상 필요한 표현일 수 있으며 자동 감점하지 않습니다." }));
}
export type SpeechSummary = ReturnType<typeof summarizeSpeech>;
export function summarizeSpeech(text: string, transcription: InterviewTranscriptionResult | null, duration: number | null, audio: InterviewAudioAnalysis | null = null) {
  const characters = [...text.replace(/\s/gu, "")].length;
  const words = text.trim().split(/\s+/u).filter(Boolean);
  const validDuration = duration !== null && Number.isFinite(duration) && duration > 0 && duration <= 180;
  const segments = transcription?.text === text ? transcription.segments : [];
  const gaps: { start: number; end: number }[] = [];
  let end = 0;
  for (const segment of segments) { if (segment.start - end >= 1) gaps.push({ start: end, end: segment.start }); end = Math.max(end, segment.end); }
  const repeats = words.flatMap((word, index) => index > 0 && word.replace(/[.,!?]/g, "") === words[index - 1].replace(/[.,!?]/g, "") ? [word] : []);
  return {
    characters, units: words.length, charactersPerMinute: validDuration ? Math.round(characters * 60 / duration) : null,
    expressions: findSpeechExpressions(text), repeatedAdjacentWords: repeats,
    segments: segments.map(segment => ({ ...segment, charactersPerMinute: segment.end > segment.start ? Math.round([...segment.text.replace(/\s/gu, "")].length * 60 / (segment.end - segment.start)) : null })),
    startDelay: segments.length ? segments[0].start : null, segmentGaps: gaps,
    longestSegmentGap: gaps.length ? Math.max(...gaps.map(gap => gap.end - gap.start)) : null,
    lowSignal: audio?.lowSignalIntervals ?? null,
    caveat: "속도는 전사 글자/경과시간 추정입니다. 구간 사이 빈 시간은 실제 침묵 판정이 아니며, STT가 습관어·반복을 생략할 수 있습니다. 음량은 장비 영향도 받습니다.",
  };
}
/** Sample counts are denominated on observed frames, never labelled camera gaze. */
export function summarizeCamera(result: VisionAnalysisResult | null) {
  if (!result) return null;
  const valid = result.frames.filter(frame => frame.status === "single_face" && frame.bounds);
  const centered = valid.filter(frame => { const bounds = frame.bounds!; const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2; return x >= .3 && x <= .7 && y >= .2 && y <= .8; });
  const areas = valid.map(frame => frame.bounds!.width * frame.bounds!.height);
  let largeMoves = 0;
  for (let index = 1; index < valid.length; index++) {
    const a = valid[index - 1], b = valid[index];
    if (b.timeSeconds - a.timeSeconds > 1.1) continue;
    const ac = a.bounds!, bc = b.bounds!;
    if (Math.hypot(bc.x + bc.width / 2 - ac.x - ac.width / 2, bc.y + bc.height / 2 - ac.y - ac.height / 2) > .12) largeMoves++;
  }
  return { samples: result.frames.length, validSamples: valid.length, centeredPercent: valid.length >= 5 ? Math.round(centered.length / valid.length * 100) : null, missingSamples: result.summary.missingFaceSamples, largeMoves, areaRange: areas.length ? [Math.min(...areas), Math.max(...areas)] : null, caveat: "1초 샘플 중 단일 얼굴 검출 프레임만 분모로 사용합니다. 화면 중앙 비율은 카메라 응시율이 아니며, 면적 변화는 실제 거리 측정이 아닙니다. 검출 실패는 태도 감점이 아닙니다." };
}
export function locateEvidence(text: string, evidence: string, label: string, kind: "strength" | "concern", note: string): TextMark | null {
  const start = text.indexOf(evidence);
  if (!evidence || start < 0 || text.indexOf(evidence, start + 1) >= 0) return null;
  return { start, end: start + evidence.length, label, kind, note };
}
export type TrainingAttempt = { id: string; question: string; company: string; role: string; answer: string; duration: number | null; result: InterviewFeedbackResult; speech: SpeechSummary; createdAt: number };
export function sameTrainingQuestion(a: Pick<TrainingAttempt, "question" | "company" | "role">, b: Pick<TrainingAttempt, "question" | "company" | "role">) { return a.question.trim() === b.question.trim() && a.company.trim() === b.company.trim() && a.role.trim() === b.role.trim(); }
export function compareAttempts(before: TrainingAttempt, after: TrainingAttempt) {
  if (!sameTrainingQuestion(before, after) || before.result.metadata.rubricVersion !== after.result.metadata.rubricVersion) return null;
  const starCount = (item: TrainingAttempt) => Object.values(item.result.feedback.star).filter(part => part.status === "present").length;
  return { duration: [before.duration, after.duration], expressions: [before.speech.expressions.length, after.speech.expressions.length], star: [starCount(before), starCount(after)], chars: [before.speech.characters, after.speech.characters] };
}
