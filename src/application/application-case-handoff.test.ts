import { describe, expect, it } from "vitest";
import { buildApplicationCasePlan, guestApplicationHandoffSchema } from "./application-case-handoff";

const base = {
  title: "현대모비스 생산관리",
  product: "PRO" as const,
  writingMode: "BUILD" as const,
  writingStyle: "BALANCED" as const,
  targetLength: 700,
  questions: [{
    id: "question-1",
    order: 1,
    title: "지원동기",
    prompt: "지원동기를 작성해 주세요.",
    answer: "생산 현장 경험을 바탕으로 지원했습니다.",
    targetLength: 700,
  }],
  jobPosting: {
    text: "생산관리 직무 채용공고",
    url: "",
    filenames: [],
  },
  candidateMaterials: {
    schemaVersion: "1.0" as const,
    freeformNotes: "편의점 야간 교대근무 경험",
    freeformAttachments: [{
      filename: "경험정리.txt",
      extension: "txt",
      sizeBytes: 100,
      text: "학교 축제 부스 운영 경험",
    }],
    experiences: [],
    profileEntries: [],
  },
};

describe("application case handoff", () => {
  it("rejects a handoff without any analyzable source", () => {
    const result = guestApplicationHandoffSchema.safeParse({
      ...base,
      questions: [],
      jobPosting: { text: "", url: "", filenames: [] },
    });
    expect(result.success).toBe(false);
  });

  it("plans immutable source documents with explicit snapshot purposes", () => {
    const input = guestApplicationHandoffSchema.parse(base);
    const plan = buildApplicationCasePlan(input);

    expect(plan.documents.map((document) => document.purpose)).toEqual([
      "PRIMARY",
      "JOB_CONTEXT",
      "REFERENCE",
      "REFERENCE",
    ]);
    expect(plan.documents.find((document) => document.originalFilename === "경험정리.txt")).toMatchObject({
      kind: "OTHER",
      sourceType: "FILE",
      normalizedText: "학교 축제 부스 운영 경험",
    });
  });

  it("allows CREATE to start from a job posting without a cover letter", () => {
    const input = guestApplicationHandoffSchema.parse({
      ...base,
      writingMode: "CREATE",
      questions: [],
    });
    expect(buildApplicationCasePlan(input).documents[0].kind).toBe("JOB_POSTING");
  });

  it("자료만 있고 메모가 하나도 없는 CREATE도 원문 문서를 만든다", () => {
    // The wizard now lets someone finish CREATE with a résumé and zero typed
    // memo — see fillsQuestionsFromMaterials in server/ai/quick/questions.ts.
    // Without this branch every question had an empty answer, no PRIMARY
    // document was ever planned, and the checkout precondition on the primary
    // document's character count rejected the run before analysis started.
    const input = guestApplicationHandoffSchema.parse({
      ...base,
      writingMode: "CREATE",
      questions: [
        { id: "q1", title: "", prompt: "지원 동기를 서술하세요.", answer: "", targetLength: 700 },
        { id: "q2", title: "", prompt: "강점을 서술하세요.", answer: "", targetLength: 500 },
      ],
      candidateMaterials: {
        ...base.candidateMaterials,
        materialAttachments: [{ kind: "RESUME" as const, filename: "이력서.pdf", extension: "pdf", sizeBytes: 2048, text: "울산대 기계공학 · 품질 1년 8개월" }],
      },
    });

    const coverLetter = buildApplicationCasePlan(input).documents.find((document) => document.kind === "COVER_LETTER");
    expect(coverLetter).toBeDefined();
    expect(coverLetter?.normalizedText.length).toBeGreaterThan(0);
    expect(coverLetter?.normalizedText).toContain("지원 동기를 서술하세요.");
  });

  it("메모도 자료도 없는 CREATE는 여전히 원문 문서를 만들지 않는다", () => {
    // Nothing to write from — this case should stay blocked, same as before.
    const input = guestApplicationHandoffSchema.parse({
      ...base,
      writingMode: "CREATE",
      questions: [
        { id: "q1", title: "", prompt: "지원 동기를 서술하세요.", answer: "", targetLength: 700 },
      ],
    });

    expect(buildApplicationCasePlan(input).documents.find((document) => document.kind === "COVER_LETTER")).toBeUndefined();
  });

  it("BUILD는 자료가 있어도 이 예외의 대상이 아니다", () => {
    // BUILD's blank-question fill already has its own path (fillsBlankQuestions,
    // ungated on materials); this branch exists only for CREATE.
    const input = guestApplicationHandoffSchema.parse({
      ...base,
      writingMode: "BUILD",
      questions: [
        { id: "q1", title: "", prompt: "지원 동기를 서술하세요.", answer: "", targetLength: 700 },
      ],
      candidateMaterials: {
        ...base.candidateMaterials,
        materialAttachments: [{ kind: "RESUME" as const, filename: "이력서.pdf", extension: "pdf", sizeBytes: 2048, text: "울산대 기계공학 · 품질 1년 8개월" }],
      },
    });

    expect(buildApplicationCasePlan(input).documents.find((document) => document.kind === "COVER_LETTER")).toBeUndefined();
  });

  it("stores a heading-only question so PRO BUILD can still fill it in", () => {
    const input = guestApplicationHandoffSchema.parse({
      ...base,
      questions: [
        ...base.questions,
        {
          id: "question-4",
          title: "",
          prompt: "경력사항은 근무경력 위주로 작성해 주세요.",
          answer: "",
          targetLength: 700,
        },
      ],
    });

    const coverLetter = buildApplicationCasePlan(input).documents.find((document) => document.kind === "COVER_LETTER");
    expect(coverLetter?.normalizedText).toContain("1. 지원동기");
    // The unanswered prompt is what PRO BUILD is sold to complete, so it has to
    // survive into the stored document. getAnalysisQuestions is what keeps it
    // out of the revision contract.
    expect(coverLetter?.normalizedText).toContain("경력사항은 근무경력 위주로 작성해 주세요.");
  });
});

describe("지원자료 종류별 업로드", () => {
  const withMaterials = {
    ...base,
    candidateMaterials: {
      ...base.candidateMaterials,
      materialAttachments: [
        { kind: "RESUME" as const, filename: "이력서.pdf", extension: "pdf", sizeBytes: 2048, text: "울산대학교 기계공학 · 자동차 부품 품질 1년 8개월" },
        { kind: "CAREER_DOCUMENT" as const, filename: "경력기술서.docx", extension: "docx", sizeBytes: 4096, text: "품질검사 공정 개선 담당" },
      ],
    },
  };

  it("이력서와 경력기술서를 각자의 문서 종류로 저장한다", () => {
    const plan = buildApplicationCasePlan(guestApplicationHandoffSchema.parse(withMaterials));
    const resume = plan.documents.find((document) => document.kind === "RESUME");
    const career = plan.documents.find((document) => document.kind === "CAREER_DOCUMENT");

    expect(resume?.originalFilename).toBe("이력서.pdf");
    // Named for both because a new graduate usually has only the employer's
    // own application form, not a separate résumé.
    expect(resume?.title).toBe("이력서(입사지원서)");
    expect(resume?.purpose).toBe("REFERENCE");
    expect(career?.title).toBe("경력기술서");
    expect(career?.normalizedText).toContain("품질검사 공정 개선");
  });

  it("종류 없는 자유 첨부는 예전처럼 OTHER로 남는다", () => {
    const plan = buildApplicationCasePlan(guestApplicationHandoffSchema.parse(withMaterials));
    const other = plan.documents.filter((document) => document.kind === "OTHER");

    expect(other.some((document) => document.originalFilename === "경험정리.txt")).toBe(true);
  });

  it("업로드가 없던 시절의 저장 데이터도 그대로 처리한다", () => {
    const plan = buildApplicationCasePlan(guestApplicationHandoffSchema.parse(base));

    expect(plan.documents.some((document) => document.kind === "RESUME")).toBe(false);
    expect(plan.documents.some((document) => document.kind === "COVER_LETTER")).toBe(true);
  });
  /*
   * 간편 입력의 "더 정확하게 써드릴게요" 두 칸이 실제로 분석까지 가는지.
   *
   * 두 칸은 성격이 다릅니다. 위 칸(사실)은 근거로 인용되어야 하고, 아래
   * 칸(지시)은 인용되면 안 됩니다 — 검증기가 REVISION_REQUEST를 근거 원천에서
   * 빼는 이유가 그것입니다. 그래서 한 문서로 합치면 안 되고, 여기서 갈라져
   * 있는지를 고정합니다.
   */
  it("사실은 참고자료로, 요청은 요청사항 문서로 따로 간다", () => {
    const input = guestApplicationHandoffSchema.parse({
      ...base,
      revisionRequest: "강조해 주세요: 직접 서비스를 만들어 운영한 경험",
      candidateMaterials: {
        ...base.candidateMaterials,
        freeformNotes: "자격증: 정보처리기사 — 2024.05\n만든 것: 헬띠루틴 — 건강관리 앱",
        freeformAttachments: [],
      },
    });
    const documents = buildApplicationCasePlan(input).documents;

    const request = documents.find((document) => document.kind === "REVISION_REQUEST");
    expect(request?.normalizedText).toBe("강조해 주세요: 직접 서비스를 만들어 운영한 경험");

    // 사실 쪽은 요청사항 문서에 섞이지 않습니다.
    expect(request?.normalizedText).not.toContain("정보처리기사");

    // 종류가 `OTHER`면 모델에게 "포트폴리오"로 소개되고 예산에서 맨 뒤에 섭니다.
    const notes = documents.find((document) => document.kind === "APPLICANT_NOTE");
    expect(notes?.normalizedText).toContain("정보처리기사");
    expect(notes?.normalizedText).toContain("헬띠루틴");
    expect(notes?.normalizedText).not.toContain("강조해 주세요");
  });

  it("두 칸을 비우면 문서를 만들지 않는다", () => {
    // 빈 문서가 하나 끼면 참고자료 예산을 먹고, 모델에게는 읽을 것 없는
    // 자료가 하나 더 있는 것처럼 보입니다.
    const input = guestApplicationHandoffSchema.parse({
      ...base,
      candidateMaterials: { ...base.candidateMaterials, freeformNotes: "", freeformAttachments: [] },
    });
    const documents = buildApplicationCasePlan(input).documents;
    expect(documents.some((document) => document.kind === "REVISION_REQUEST")).toBe(false);
    expect(documents.some((document) => document.title === "추가 경험·정보")).toBe(false);
  });
});
