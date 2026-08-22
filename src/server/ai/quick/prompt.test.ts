import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import {
  buildQuickAnalysisInput,
  buildQuickAnalysisInstructions,
  SUPPORTING_CHARACTER_BUDGET,
} from "./prompt";

const request: AnalysisRequest = {
  requestId: "case-1",
  product: "PRO",
  writingMode: "POLISH",
  writingStyle: "BALANCED",
  targetLength: 1000,
  documents: [
    {
      kind: "cover_letter",
      text: "1. 지원동기 작성\n첫 번째 답변\n2. 입사 후 포부 작성\n두 번째 답변",
    },
  ],
};

describe("QUICK prompt question coverage", () => {
  it("requires one revision for every parsed question", () => {
    expect(buildQuickAnalysisInstructions(request)).toContain(
      "revisions 배열에 questionOrder 1부터 2까지",
    );
    const input = buildQuickAnalysisInput(request);
    expect(input).toContain("[자기소개서 문항별 원문 - 총 2개]");
    expect(input).toContain("[문항 1]");
    expect(input).toContain("[문항 2]");
  });
});

describe("공고와 지원자료를 첨삭에 반영", () => {
  const withPosting: AnalysisRequest = {
    ...request,
    documents: [...request.documents, { kind: "job_posting", text: "안전관리자 모집. 법적 선임 가능자 필수." }],
  };
  const withResume: AnalysisRequest = {
    ...request,
    documents: [...request.documents, { kind: "resume", text: "울산대 기계공학 · 품질 1년 8개월", filename: "이력서.pdf" }],
  };

  it("공고가 있으면 수정본을 공고 기준으로 재배치하라고 지시한다", () => {
    const instructions = buildQuickAnalysisInstructions(withPosting);

    expect(instructions).toContain("공고가 요구하는 역량과 이어지는 부분을 앞쪽에 배치");
    expect(instructions).toContain("revisedAnswer에 절대 넣지 마세요");
  });

  it("공고가 없으면 공고 관련 지시를 넣지 않는다", () => {
    expect(buildQuickAnalysisInstructions(request)).not.toContain("채용공고가 함께 제공됩니다");
  });

  it("지원자료가 있으면 최종 첨삭 단계에서도 자료를 근거로 쓰라고 지시한다", () => {
    const instructions = buildQuickAnalysisInstructions(withResume);

    expect(withResume.writingMode).toBe("POLISH");
    expect(instructions).toContain("이력서·경력기술서·포트폴리오·추가 경험 자료가 함께 제공됩니다");
    expect(instructions).toContain("verificationQuestions에 확인 질문으로 남기세요");
  });

  it("자료 파일 이름을 함께 표시한다", () => {
    expect(buildQuickAnalysisInput(withResume)).toContain("[이력서 · 이력서.pdf]");
  });

  // A real case: the applicant's own answer said "대학을 졸업하고 현대자동차에서
  // 일했다", but their résumé shows the school ending the same month Hyundai
  // started and the actual degree finishing three years after Hyundai ended.
  // No single figure was wrong — the *order* was — and that shape needed its
  // own instruction; the existing 기간/직함/소속/성과 mismatch rule does not
  // cover "A 하고 나서 B" contradicted by two date ranges.
  it("자료의 기간이 자소서의 사건 순서와 어긋날 수 있다고 알린다", () => {
    const instructions = buildQuickAnalysisInstructions(withResume);

    expect(instructions).toContain("~한 후");
    expect(instructions).toContain("순서를 지원자료의 경력·학력 시작일·종료일과 대조");
  });
});

describe("지원자료 분량 상한", () => {
  it("정해진 글자 수까지만 읽고 생략했다고 밝힌다", () => {
    const huge: AnalysisRequest = {
      ...request,
      documents: [...request.documents, { kind: "resume", text: "가".repeat(SUPPORTING_CHARACTER_BUDGET + 5_000) }],
    };

    const input = buildQuickAnalysisInput(huge);

    expect(input).toContain("이후 내용은 생략했습니다");
    expect(input.length).toBeLessThan(SUPPORTING_CHARACTER_BUDGET + 3_000);
  });

  it("여러 자료를 합쳐서 상한을 지킨다", () => {
    const many: AnalysisRequest = {
      ...request,
      documents: [
        ...request.documents,
        { kind: "resume", text: "가".repeat(20_000) },
        { kind: "career_description", text: "나".repeat(20_000) },
      ],
    };

    const input = buildQuickAnalysisInput(many);
    const usedNa = (input.match(/나/g) ?? []).length;

    expect(usedNa).toBeLessThanOrEqual(SUPPORTING_CHARACTER_BUDGET - 20_000);
  });
});

describe("제출본 평가와 첨삭본의 일관성", () => {
  it("원문을 먼저 평가하고 그 평가에 맞춰 고치라고 순서를 정한다", () => {
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("① originalAnnotations로 제출 원문을 먼저 평가한다");
    expect(instructions).toContain("평가와 수정본이 서로 어긋나서는 안 됩니다");
  });

  it("good은 최종본에 남길 문장에만 주도록 좁힌다", () => {
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("뺄 문장이라면 절대 good으로 표시하지 마세요");
    expect(instructions).toContain("good으로 표시한 표현의 내용은 revisedAnswer에 반드시 남아야 합니다");
  });

  it("설명 없이 사라지는 문장을 금지하고 원문 문장을 최소 하나 남기게 한다", () => {
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("설명 없이 사라지는 문장이 있어서는 안 됩니다");
    expect(instructions).toContain("최소 하나는 거의 그대로 유지하세요");
  });

  it("모든 문항을 쓴 뒤 전체를 다시 보고 정리하게 한다", () => {
    expect(buildQuickAnalysisInstructions(request)).toContain("모든 문항의 revisedAnswer를 정한 뒤 전체를 다시 읽고 정리하세요");
  });
});

describe("BUILD 채우기", () => {
  const buildRequest: AnalysisRequest = {
    ...request,
    writingMode: "BUILD",
    questions: [
      { id: "q1", title: "지원동기", prompt: "지원 동기를 작성해 주세요.", answer: "생산 현장 경험을 바탕으로 지원했습니다.", targetLength: 700 },
      { id: "q2", title: "협업 경험", prompt: "협업 경험을 작성해 주세요.", answer: "", targetLength: 700 },
    ],
  };

  it("PRO BUILD는 빈 문항까지 첨삭 대상에 넣는다", () => {
    const instructions = buildQuickAnalysisInstructions(buildRequest);

    expect(instructions).toContain("questionOrder 1부터 2까지");
    expect(instructions).toContain("비어 있거나 분량이 부족한 문항을 실제로 채워");
    expect(instructions).toContain("빈칸이나 대괄호 표기를 남기지 마세요");
  });

  it("채울 때도 없는 수치와 고유명사는 금지한다", () => {
    const instructions = buildQuickAnalysisInstructions(buildRequest);

    expect(instructions).toContain("수치, 기간, 회사명, 자격증, 직함, 고유명사를 절대 넣지 마세요");
    expect(instructions).toContain("목표 글자 수에 가깝게 늘리세요");
    expect(instructions).toContain("아직 쓰이지 않은 사실을 가져와 문장으로 만듭니다");
    expect(instructions).toContain("표현을 바꾸거나 순서를 정리하는 것은 분량을 채운 것이 아닙니다");
    expect(instructions).toContain("첨삭본이 원문보다 짧아지면 안 됩니다");
    expect(instructions).not.toContain("억지로 분량을 채우지 말고 확인 질문을 남기세요");
  });

  it("채우는 문항에는 제외 안내를 붙이지 않는다", () => {
    expect(buildQuickAnalysisInstructions(buildRequest)).not.toContain("아직 작성되지 않은 문항은 revisions에 넣지 마세요");
  });

  it("QUICK BUILD는 채우지 않고 기존대로 동작한다", () => {
    const instructions = buildQuickAnalysisInstructions({ ...buildRequest, product: "QUICK" });

    expect(instructions).toContain("억지로 분량을 채우지 말고 확인 질문을 남기세요");
    expect(instructions).not.toContain("빈칸이나 대괄호 표기를 남기지 마세요");
    expect(instructions).toContain("questionOrder 1부터 1까지");
  });

  it("문항 구분이 없는 통짜 붙여넣기에는 채우기를 제공하지 않는다", () => {
    const bulk: AnalysisRequest = {
      ...request,
      writingMode: "BUILD",
      questions: [{ id: "bulk", title: "", prompt: "", answer: "한 덩어리로 붙여넣은 자기소개서 본문입니다.", targetLength: 700 }],
    };

    expect(buildQuickAnalysisInstructions(bulk)).not.toContain("빈칸이나 대괄호 표기를 남기지 마세요");
  });
});

describe("다른 작성 단계는 그대로 유지된다", () => {
  // Locks the two modes this change must not reach. If either string moves,
  // this fails instead of someone noticing on screen.
  it("POLISH 지시문은 바뀌지 않는다", () => {
    const instructions = buildQuickAnalysisInstructions({ ...request, writingMode: "POLISH" });

    expect(instructions).toContain("작성 단계: 최종 첨삭. 완성된 글이므로 구조를 크게 흔들지 말고 표현·오류·적합성 점검을 우선하세요.");
    expect(instructions).toContain("억지로 분량을 채우지 말고 확인 질문을 남기세요");
    expect(instructions).not.toContain("실제로 채워 완성된 답변을 만드세요");
  });

  it("CREATE 지시문은 바뀌지 않는다", () => {
    const instructions = buildQuickAnalysisInstructions({ ...request, writingMode: "CREATE" });

    expect(instructions).toContain("지원자가 단계별로 입력한 사실 메모입니다");
    expect(instructions).not.toContain("실제로 채워 완성된 답변을 만드세요");
  });

  it("CREATE에는 원문 문장 유지 규칙을 걸지 않는다", () => {
    // The memo is not prose to preserve; CREATE is told the opposite, and both
    // rules at once is a contradiction.
    const create = buildQuickAnalysisInstructions({ ...request, writingMode: "CREATE" });
    const polish = buildQuickAnalysisInstructions({ ...request, writingMode: "POLISH" });

    expect(create).not.toContain("최소 하나는 거의 그대로 유지하세요");
    expect(create).toContain("메모 문장을 그대로 옮기지 말고");
    expect(polish).toContain("최소 하나는 거의 그대로 유지하세요");
  });
});

describe("근거 인용 규칙", () => {
  // The validator rejects a quote it cannot find in the applicant's own
  // documents, and the posting is deliberately not one of them. The prompt used
  // to invite a posting quote, which failed the run while following orders.
  it("공고는 근거로 인용할 수 없다고 못 박는다", () => {
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("채용공고 문장은 evidenceQuote로 쓸 수 없습니다");
    expect(instructions).toContain("지원자가 제출한 글에서 그대로 복사한 문구만 넣으세요");
    expect(instructions).toContain("방금 새로 작성한 문장을 evidenceQuote로 인용하지 마세요");
  });

  it("공고를 근거로 고쳤을 때도 인용은 지원자 원문에서 하게 한다", () => {
    const withPosting: AnalysisRequest = {
      ...request,
      documents: [...request.documents, { kind: "job_posting", text: "안전관리자 모집. 법적 선임 가능자 필수." }],
    };

    const instructions = buildQuickAnalysisInstructions(withPosting);
    expect(instructions).toContain("evidenceQuote에는 공고 문장이 아니라");
    expect(instructions).not.toContain("evidenceQuote에는 원문 근거를 그대로 넣으세요");
  });

  it("비어 있던 문항은 다른 문항이나 지원자료에서 인용하게 한다", () => {
    const buildRequest: AnalysisRequest = {
      ...request,
      writingMode: "BUILD",
      questions: [
        { id: "q1", title: "지원동기", prompt: "지원 동기를 작성해 주세요.", answer: "생산 현장 경험을 바탕으로 지원했습니다.", targetLength: 700 },
        { id: "q2", title: "협업 경험", prompt: "협업 경험을 작성해 주세요.", answer: "", targetLength: 700 },
      ],
    };

    expect(buildQuickAnalysisInstructions(buildRequest)).toContain("비어 있던 문항에는 인용할 원문이 없습니다");
  });
});

describe("사실 보존과 문항 형식", () => {
  it("사고·수치·자격은 다시 써도 남기라고 못 박는다", () => {
    // A near-miss the applicant prevented was lost mid-rewrite and nothing
    // flagged it — losing a clause is not read as a deletion.
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("발생할 뻔한 사건");
    expect(instructions).toContain("마지막에 원문과 대조해 확인하세요");
  });

  it("문항이 요구하는 형식을 따르게 한다", () => {
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("경력사항 문항은 이야기하듯 풀어 쓰지 말고");
    expect(instructions).toContain("같은 이야기를 같은 방식으로 두 번 쓰면");
  });
});

describe("CREATE도 목표 분량까지 쓴다", () => {
  // CREATE writes every answer from scratch, so the company's length is its
  // target as much as BUILD's — but it was told not to pad and never told to
  // reach the length, so a memo of a few words produced a few sentences.
  const create: AnalysisRequest = {
    ...request,
    product: "PRO",
    writingMode: "CREATE",
    questions: [
      { id: "q1", title: "지원 동기", prompt: "지원 동기를 서술하세요.", answer: "[지원 계기] 현장실습에서 안전관리를 처음 봤습니다.", targetLength: 700 },
      { id: "q2", title: "강점", prompt: "강점을 서술하세요.", answer: "[강점] 모르는 건 바로 물어보는 편입니다.", targetLength: 500 },
    ],
  };

  it("분량을 채우지 말라는 지시를 걸지 않는다", () => {
    expect(buildQuickAnalysisInstructions(create)).not.toContain("억지로 분량을 채우지 말고 확인 질문을 남기세요");
  });

  it("지원자료를 근거로 쓸 수 있다고 알린다", () => {
    // "메모의 사실만" ruled out the résumé, so the applicant with the least
    // written was also barred from using what they had uploaded.
    expect(buildQuickAnalysisInstructions(create)).toContain("메모와 함께 제출된 지원자료");
  });

  it("메모를 그대로 옮기지 말라는 규칙은 유지된다", () => {
    expect(buildQuickAnalysisInstructions(create)).toContain("메모 문장을 그대로 옮기지 말고");
  });

  it("POLISH는 여전히 채우지 않는다", () => {
    expect(buildQuickAnalysisInstructions({ ...create, writingMode: "POLISH" }))
      .toContain("억지로 분량을 채우지 말고 확인 질문을 남기세요");
  });

  it("QUICK CREATE에는 걸지 않는다", () => {
    expect(buildQuickAnalysisInstructions({ ...create, product: "QUICK" }))
      .toContain("억지로 분량을 채우지 말고 확인 질문을 남기세요");
  });
});

describe("CREATE는 자료만으로도 빈 문항을 채운다", () => {
  // The wizard used to require typing something into every question before it
  // would let you finish, even with a full résumé attached. Someone whose
  // résumé already answers the question should not have to retype it.
  const create: AnalysisRequest = {
    ...request,
    product: "PRO",
    writingMode: "CREATE",
    documents: [
      ...request.documents,
      { kind: "resume", text: "울산대 기계공학 · 품질 1년 8개월", filename: "이력서.pdf" },
    ],
    questions: [
      { id: "q1", title: "", prompt: "지원 동기를 서술하세요.", answer: "", targetLength: 700 },
      { id: "q2", title: "", prompt: "강점을 서술하세요.", answer: "", targetLength: 500 },
    ],
  };

  it("메모가 하나도 없어도 두 문항 모두 분석 대상에 포함한다", () => {
    const instructions = buildQuickAnalysisInstructions(create);

    expect(instructions).toContain("questionOrder 1부터 2까지");
  });

  it("빈 문항 채우기 규칙(원문 없음·자료 범위 안에서만·확인 필요 표시)을 적용한다", () => {
    const instructions = buildQuickAnalysisInstructions(create);

    expect(instructions).toContain("비어 있던 문항에는 인용할 원문이 없습니다");
    expect(instructions).toContain("자료에서 확인되는 범위 안에서만 사용하세요");
  });

  it("자료가 전혀 없으면 빈 메모 문항을 분석 대상에서 뺀다", () => {
    const withoutMaterials = { ...create, documents: request.documents, questions: create.questions };
    const instructions = buildQuickAnalysisInstructions(withoutMaterials);

    // 0개 문항이면 목록 문구 자체가 만들어지지 않는다 — 실질적으로 아무것도
    // 분석하지 않는다는 뜻이고, 이게 이전까지의 동작이었다.
    expect(instructions).toContain("questionOrder 1부터 0까지");
  });
});

describe("문항별 소제목 제안", () => {
  it("소제목을 제안하라고 지시한다", () => {
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("subheading");
    expect(instructions).toContain("한 줄 소제목");
  });

  it("상투어와 문항 이름 반복을 금지한다", () => {
    // 소제목이 "지원 동기"나 "열정과 도전"이면 없느니만 못하다 — 읽는 사람의
    // 주의를 답변 앞에서 먼저 잃는다.
    const instructions = buildQuickAnalysisInstructions(request);

    expect(instructions).toContain("상투어");
    expect(instructions).toContain("문항 이름 반복");
  });

  it("항목 정리 형식 문항에는 null을 허용한다", () => {
    // 경력사항처럼 항목으로 정리하는 문항은 소제목을 붙일 자리가 없다.
    expect(buildQuickAnalysisInstructions(request)).toContain("null을 반환하세요");
  });

  it("소제목에 없는 사실을 넣지 못하게 한다", () => {
    expect(buildQuickAnalysisInstructions(request)).toContain("답변에 없는 사실이나 수치를 소제목에 넣지 마세요");
  });
});

describe("빈 문항이 인용 가능한 것처럼 보이지 않게 한다", () => {
  // 실제 장애: 자료만으로 진행한 CREATE에서 모든 답변이 비어 있자, 모델이
  // priorities의 evidenceQuote로 입력 형식 라벨인 "답변:"을 인용했다.
  // 검증기는 지원자 문서에서만 인용을 찾으므로 결제된 실행 전체가 막혔다.
  const blank: AnalysisRequest = {
    ...request,
    product: "PRO",
    writingMode: "CREATE",
    documents: [
      ...request.documents,
      { kind: "resume", text: "울산과학대학교 대학일자리센터 · 상담 및 컨설팅 8개월" },
    ],
    questions: [
      { id: "q1", title: "", prompt: "지원 동기를 서술하세요.", answer: "", targetLength: 700 },
      { id: "q2", title: "", prompt: "강점을 서술하세요.", answer: "", targetLength: 500 },
    ],
  };

  it("빈 답변은 비어 있다고 밝히고 어디서 근거를 찾을지 알려준다", () => {
    const input = buildQuickAnalysisInput(blank);

    expect(input).toContain("답변: (아직 작성되지 않았습니다");
    expect(input).not.toContain("답변:\n\n");
  });

  it("답변이 있는 문항은 예전 형식 그대로 둔다", () => {
    const input = buildQuickAnalysisInput(request);

    expect(input).toContain("답변:\n");
    expect(input).not.toContain("아직 작성되지 않았습니다");
  });

  it("형식 라벨을 인용하지 말라고 지시한다", () => {
    const instructions = buildQuickAnalysisInstructions(blank);

    expect(instructions).toContain("형식 표시");
    expect(instructions).toContain("evidenceQuote에 절대 넣지 마세요");
  });

  it("인용할 답변이 없으면 지원자료에서 가져오라고 지시한다", () => {
    expect(buildQuickAnalysisInstructions(blank)).toContain("priorities의 evidenceQuote는 제출된 지원자료");
  });
});
