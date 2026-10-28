import { z } from "zod";

export const mentorFields = [
  { id: "technology", label: "IT·기술", words: ["개발", "프로그래", "데이터", "소프트웨어", "인공지능"] },
  { id: "industry", label: "제조·현장", words: ["제조", "생산", "자동차", "조선", "기계", "품질", "설비"] },
  { id: "creative", label: "문화·창작", words: ["디자인", "작가", "그림", "음악", "영상", "콘텐츠", "예술"] },
  { id: "business", label: "사업·기획", words: ["창업", "사업", "마케팅", "기획", "영업", "브랜드"] },
  { id: "public", label: "공공·사회", words: ["공공", "공무원", "공기업", "행정", "사회복지"] },
  { id: "care", label: "건강·돌봄", words: ["간호", "의료", "보건", "돌봄", "운동", "스포츠"] },
  { id: "learning", label: "교육·배움", words: ["교사", "교육", "연구", "공부", "유학", "진학"] },
  { id: "life", label: "삶·새로운 도전", words: ["일상", "인생", "이직", "전환", "새로운 도전", "해외생활", "귀촌"] },
  { id: "exploring", label: "아직 탐색 중", words: [] },
  { id: "other", label: "그 밖의 분야", words: [] },
] as const;
export type MentorField = typeof mentorFields[number]["id"];
const fieldSchema = z.enum(mentorFields.map((field) => field.id));
export const mentorKinds = { mentee: "멘토를 만나고 싶어요", mentor: "경험을 나누고 싶어요" } as const;
export const meetingModes = { online: "온라인", either: "온라인·오프라인 모두", offline: "오프라인 관심" } as const;
export const mentorStatuses = { new: "접수", reviewing: "살펴보는 중", waiting: "상대 대기", contacted: "연락함", connected: "연결함", closed: "종료" } as const;
export const MENTOR_CONSENT_VERSION = "mentor-pool-2026-10-28-v1";
const shortText = z.string().trim().max(120);
export const mentorApplicationSchema = z.object({
  submissionId: z.string().uuid(),
  kind: z.enum(["mentee", "mentor"]),
  name: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(254),
  headline: z.string().trim().min(2).max(160),
  story: z.string().trim().min(10).max(2000),
  fields: z.array(fieldSchema).max(4).transform((values) => [...new Set(values)]),
  mode: z.enum(["online", "either", "offline"]),
  region: shortText,
  availability: shortText,
  consent: z.literal(true),
  website: z.string().max(0),
}).strict().superRefine((value, context) => {
  if (value.mode !== "online" && !value.region) context.addIssue({ code: "custom", path: ["region"], message: "오프라인 만남을 희망하는 지역을 적어 주세요." });
});
export type MentorApplication = z.infer<typeof mentorApplicationSchema>;
export type Classification = { field: MentorField; basis: string };
/** Suggestions only: never replace the applicant's words or claim verified expertise. */
export function classifyMentorApplication(input: Pick<MentorApplication, "fields" | "headline" | "story">): Classification[] {
  const text = `${input.headline} ${input.story}`.normalize("NFKC").toLowerCase();
  return mentorFields.flatMap((field) => {
    if (input.fields.includes(field.id)) return [{ field: field.id, basis: "신청자가 선택한 분야" }];
    const matches = field.words.filter((word) => text.includes(word));
    return matches.length ? [{ field: field.id, basis: `작성 내용의 키워드: ${matches.join(", ")}` }] : [];
  });
}
export const mentorAdminUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "reviewing", "waiting", "contacted", "connected", "closed"]),
  note: z.string().trim().max(2000),
  updatedAt: z.string().datetime({ offset: true }),
}).strict();
export const mentorDeleteSchema = z.object({ id: z.string().uuid(), confirmation: z.literal("본인 확인 후 삭제") }).strict();
export type MentorPoolRecord = MentorApplication & {
  id: string; createdAt: string; updatedAt: string; expiresAt: string;
  status: keyof typeof mentorStatuses; note: string;
};
export function relatedMentorCandidates(source: MentorPoolRecord, pool: MentorPoolRecord[]) {
  if (!["new", "reviewing", "waiting"].includes(source.status)) return [];
  const fields = classifyMentorApplication(source).filter((entry) => !["other", "exploring"].includes(entry.field));
  return pool.filter((entry) => entry.kind !== source.kind && entry.email !== source.email && ["new", "reviewing", "waiting"].includes(entry.status))
    .flatMap((entry) => {
      const candidateFields = classifyMentorApplication(entry);
      const common = fields.filter((field) => candidateFields.some((candidate) => candidate.field === field.field));
      if (!common.length) return [];
      const modesOverlap = source.mode === "either" || entry.mode === "either" || source.mode === entry.mode;
      if (!modesOverlap) return [];
      return [{ entry, common }];
    }).sort((a, b) => b.common.length - a.common.length).slice(0, 5);
}
