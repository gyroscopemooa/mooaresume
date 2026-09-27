import { describe, expect, it } from "vitest";
import {
  DEFAULT_PACK_LIMITS,
  PACK_SLOT_IDS,
  PACK_SLOTS,
  cardIsComplete,
  isApprovedTestAccount,
  isEligibleByPolicy,
  isInterviewPackPublic,
  parseTestAccountEmails,
  resolveInterviewPackConfig,
  startOfSeoulDayIso,
  type AiAssessment,
  type AiCard,
  type ConflictConfirmation,
  type MaterialsPayload,
} from "@/domain/interview-pack";
import {
  buildKeywords,
  compactLength,
  estimateSeconds,
  findKeywordSentence,
  lengthGuide,
  locateQuote,
  normalizeForMatch,
  personalSecondsPerChar,
  resolveEffectiveMaterials,
  sanitizeUserText,
  splitParagraphs,
  splitSentences,
} from "@/domain/interview-pack-text";
import {
  buildVerifiedAssessment,
  extractNumberTokens,
  introsLookTruncated,
  recheckEditedCard,
  refreshAssessmentAfterConfirmations,
  scanClaims,
  scanRejectedValues,
  stableConflictId,
  verifyGeneratedCard,
} from "@/domain/interview-pack-verify";
import { pickCompanyAndRole } from "@/domain/interview-pack-materials";
import { PACK_SAMPLES, getPackSample, splitSampleSections } from "@/fixtures/interview-pack-samples";

function materialsFor(id: "complete" | "insufficient" | "conflicting", extra: Partial<MaterialsPayload> = {}) {
  const sample = getPackSample(id)!;
  const base: MaterialsPayload = {
    schema: 1,
    baseVersion: null,
    documents: sample.docs,
    base: { company: sample.company, role: sample.role },
    supplements: {},
    slotAnswers: [],
    confirmations: [],
  };
  const latest: MaterialsPayload = { ...base, baseVersion: 1, documents: undefined, ...extra };
  return resolveEffectiveMaterials({ version: 1, payload: base }, { version: extra ? 2 : 1, payload: latest });
}

describe("설정과 정책", () => {
  it("기본 한도는 최초 생성 1회 + 선택 답변 수정 3회다", () => {
    const config = resolveInterviewPackConfig({});
    expect(config.limits).toEqual(DEFAULT_PACK_LIMITS);
    expect(config.limits.initial).toBe(1);
    expect(config.limits.edit).toBe(3);
  });

  it("환경변수로 한도를 바꾸되 잘못된 값은 기본값으로 돌아간다", () => {
    expect(resolveInterviewPackConfig({ INTERVIEW_PACK_EDIT_LIMIT: "5" }).limits.edit).toBe(5);
    expect(resolveInterviewPackConfig({ INTERVIEW_PACK_EDIT_LIMIT: "abc" }).limits.edit).toBe(3);
    expect(resolveInterviewPackConfig({ INTERVIEW_PACK_EDIT_LIMIT: "9999" }).limits.edit).toBe(20);
    expect(resolveInterviewPackConfig({ INTERVIEW_PACK_INITIAL_LIMIT: "0" }).limits.initial).toBe(1);
  });

  it("기존 FINAL 구매자 적용은 명시하지 않으면 열리지 않는다(소급 발급 금지)", () => {
    const closed = resolveInterviewPackConfig({});
    expect(closed.eligibleFrom).toBe("none");
    expect(isEligibleByPolicy(closed, "2026-09-01T00:00:00Z")).toBe(false);

    const all = resolveInterviewPackConfig({ INTERVIEW_PACK_ELIGIBLE_FROM: "all" });
    expect(isEligibleByPolicy(all, "2020-01-01T00:00:00Z")).toBe(true);

    const since = resolveInterviewPackConfig({ INTERVIEW_PACK_ELIGIBLE_FROM: "2026-09-27T00:00:00+09:00" });
    expect(isEligibleByPolicy(since, "2026-09-26T00:00:00Z")).toBe(false);
    expect(isEligibleByPolicy(since, "2026-09-28T00:00:00Z")).toBe(true);
    expect(isEligibleByPolicy(since, null)).toBe(false);

    // 읽을 수 없는 날짜는 열지 않는 쪽으로 처리한다.
    expect(resolveInterviewPackConfig({ INTERVIEW_PACK_ELIGIBLE_FROM: "yesterday-ish" }).eligibleFrom).toBe("none");
  });

  it("공개 플래그는 명시적인 1/true 만 연다", () => {
    expect(isInterviewPackPublic(undefined)).toBe(false);
    expect(isInterviewPackPublic("")).toBe(false);
    expect(isInterviewPackPublic("0")).toBe(false);
    expect(isInterviewPackPublic("yes")).toBe(false);
    expect(isInterviewPackPublic("1")).toBe(true);
    expect(isInterviewPackPublic(" TRUE ")).toBe(true);
  });

  it("테스트 계정 목록은 서버 환경변수의 이메일만 인정하고 대소문자를 무시한다", () => {
    const list = parseTestAccountEmails("Admin@Example.com, tester@example.com; not-an-email ,  ");
    expect(list).toEqual(["admin@example.com", "tester@example.com"]);
    expect(isApprovedTestAccount("ADMIN@example.com", list)).toBe(true);
    expect(isApprovedTestAccount("stranger@example.com", list)).toBe(false);
    expect(isApprovedTestAccount(null, list)).toBe(false);
    expect(parseTestAccountEmails(undefined)).toEqual([]);
  });

  it("서울 기준 하루의 시작을 UTC ISO 로 돌려준다", () => {
    // 서울 2026-09-26 08:30 = UTC 2026-09-25 23:30 → 서울 하루의 시작은 UTC 2026-09-25 15:00
    expect(startOfSeoulDayIso(new Date("2026-09-25T23:30:00Z"))).toBe("2026-09-25T15:00:00.000Z");
    // 서울 2026-09-26 23:59 = UTC 14:59 → 같은 서울 날짜
    expect(startOfSeoulDayIso(new Date("2026-09-26T14:59:00Z"))).toBe("2026-09-25T15:00:00.000Z");
    expect(startOfSeoulDayIso(new Date("2026-09-26T15:00:00Z"))).toBe("2026-09-26T15:00:00.000Z");
  });

  it("문항은 기본 4개 + 추가 7개이고 목표 시간이 있다", () => {
    expect(PACK_SLOTS.filter((slot) => slot.group === "core").map((slot) => slot.id)).toEqual(["intro_30", "intro_60", "motivation_company", "aspiration"]);
    expect(PACK_SLOTS).toHaveLength(PACK_SLOT_IDS.length);
    expect(PACK_SLOTS.find((slot) => slot.id === "intro_30")?.targetLabel).toBe("목표 30초");
    expect(PACK_SLOTS.find((slot) => slot.id === "intro_60")?.targetLabel).toBe("목표 1분");
  });
});

describe("샘플 자료", () => {
  it("세 샘플 모두 가상 자료 표시가 원문에 있고, 기대 동작 설명은 들어 있지 않다", () => {
    for (const sample of PACK_SAMPLES) {
      expect(sample.fullText).toContain("가상");
      // 안내문(README)의 기대 동작 문구가 자료에 섞이면 안 된다.
      expect(sample.fullText).not.toContain("기대 동작");
      expect(sample.fullText).not.toContain("만들어서는 안 됩니다");
    }
  });

  it("A 는 아홉 구간으로 나뉘고 이력서는 검사보조, 성과는 8건→2건이다", () => {
    const sample = getPackSample("complete")!;
    expect(sample.docs.map((doc) => doc.kind)).toEqual([
      "note", "job_posting", "resume", "experience", "experience", "note", "note", "note", "cover_letter",
    ]);
    const resume = sample.docs.find((doc) => doc.kind === "resume")!;
    expect(resume.text).toContain("검사보조");
    expect(sample.docs.some((doc) => doc.text.includes("8건"))).toBe(true);
  });

  it("B 에는 회사·공고가 없고 C 에는 서로 다른 재직기간이 있다", () => {
    const insufficient = getPackSample("insufficient")!;
    expect(insufficient.company).toBe("");
    expect(insufficient.docs.some((doc) => doc.kind === "job_posting")).toBe(false);
    const conflicting = getPackSample("conflicting")!;
    const all = conflicting.docs.map((doc) => doc.text).join("\n");
    expect(all).toContain("1년 6개월");
    expect(all).toContain("2023년 1월 1일부터 2025년 12월 31일까지 3년");
  });

  it("안내 줄은 문서가 되지 않는다", () => {
    const docs = splitSampleSections("안내 줄\n[제목 / PROFILE-01]\n내용");
    expect(docs).toHaveLength(1);
    expect(docs[0].text).toBe("내용");
  });
});

describe("문단·인용", () => {
  const docs = getPackSample("complete")!.docs;

  it("문단은 줄 단위이고 빈 줄은 없다", () => {
    expect(splitParagraphs("가\n\n  나  \r\n다")).toEqual(["가", "나", "다"]);
  });

  it("실제로 있는 인용은 위치를 돌려준다", () => {
    const resume = docs.find((doc) => doc.kind === "resume")!;
    const found = locateQuote(docs, { docId: resume.id, paragraph: 0, quote: "품질팀 검사보조" });
    expect(found?.docId).toBe(resume.id);
    expect(found?.paragraphText).toContain("품질팀 검사보조");
  });

  it("문단 번호가 틀려도 같은 문서 안에서 찾아 바로잡는다", () => {
    const resume = docs.find((doc) => doc.kind === "resume")!;
    const found = locateQuote(docs, { docId: resume.id, paragraph: 0, quote: "팀원이었으며 관리직이나 팀장이 아니었음" });
    expect(found).not.toBeNull();
    expect(found!.paragraph).toBeGreaterThan(0);
  });

  it("공백·따옴표 차이는 무시하고, 없는 문장·짧은 인용·없는 문서는 거절한다", () => {
    const resume = docs.find((doc) => doc.kind === "resume")!;
    expect(locateQuote(docs, { docId: resume.id, paragraph: 0, quote: "품질팀   검사 보조" })).not.toBeNull();
    expect(locateQuote(docs, { docId: resume.id, paragraph: 0, quote: "품질팀 팀장으로 근무" })).toBeNull();
    expect(locateQuote(docs, { docId: resume.id, paragraph: 0, quote: "팀" })).toBeNull();
    expect(locateQuote(docs, { docId: "ZZ", paragraph: 0, quote: "품질팀 검사보조" })).toBeNull();
    // 다른 문서의 문장을 이 문서의 것처럼 인용하면 거절한다.
    const job = docs.find((doc) => doc.kind === "job_posting")!;
    expect(locateQuote(docs, { docId: job.id, paragraph: 0, quote: "품질팀 검사보조" })).toBeNull();
  });

  it("정규화는 물결·대시 표기 차이를 맞춘다", () => {
    expect(normalizeForMatch("2024년 1월 1일 – 2025년")).toBe(normalizeForMatch("2024년 1월 1일-2025년"));
  });
});

describe("문장·키워드·시간", () => {
  it("문장을 나누되 소수점은 끊지 않는다", () => {
    expect(splitSentences("제가 3.5점을 받았습니다. 다음 문장입니다!\n새 줄입니다")).toEqual([
      "제가 3.5점을 받았습니다.",
      "다음 문장입니다!",
      "새 줄입니다",
    ]);
  });

  it("키워드는 들어 있는 첫 문장으로 이어지고 사라지면 null 이다", () => {
    const answer = "기록 누락을 줄였습니다. 체크리스트 초안을 만들었습니다.";
    expect(findKeywordSentence(answer, "체크리스트")).toBe(1);
    expect(findKeywordSentence(answer, "불량률")).toBeNull();
    expect(buildKeywords(answer, ["기록 누락", "없는말"]).map((keyword) => keyword.sentenceIndex)).toEqual([0, null]);
  });

  it("글자 수만으로 정확한 시간을 말하지 않고 범위 안내만 한다", () => {
    const short = "가".repeat(30);
    const fit = "가".repeat(150);
    const long = "가".repeat(400);
    expect(lengthGuide("intro_30", short).state).toBe("short");
    expect(lengthGuide("intro_30", fit).state).toBe("fit");
    expect(lengthGuide("intro_30", long).state).toBe("long");
    expect(compactLength("가 나\n다")).toBe(3);
  });

  it("내 속도는 사용자가 잰 기록의 중앙값으로만 만든다", () => {
    expect(personalSecondsPerChar([])).toBeNull();
    // 너무 짧거나 5초 미만인 기록은 쓰지 않는다.
    expect(personalSecondsPerChar([{ chars: 10, seconds: 3 }])).toBeNull();
    const perChar = personalSecondsPerChar([{ chars: 100, seconds: 20 }, { chars: 100, seconds: 30 }, { chars: 100, seconds: 90 }]);
    expect(perChar).toBeCloseTo(0.3, 5);
    expect(estimateSeconds(200, perChar)).toBe(60);
    // 기록이 없으면 참고 기준(초당 4.5자)을 쓴다.
    expect(estimateSeconds(135, null)).toBe(30);
  });

  it("입력 정리는 제어 문자를 지우고 길이를 자른다", () => {
    expect(sanitizeUserText("가\u0000나\u0007다\r\n라", 10)).toBe("가나다\n라");
    expect(sanitizeUserText("가나다라마", 3)).toBe("가나다");
  });
});

describe("점검 결과 확인 — 자료 충분(A)", () => {
  const materials = materialsFor("complete");
  const resume = materials.docs.find((doc) => doc.kind === "resume")!;
  const exp = materials.docs.find((doc) => doc.title.includes("EXPERIENCE-01"))!;

  const ai: AiAssessment = {
    facts: [
      { id: "F1", kind: "role", statement: "품질팀 검사보조", source: { docId: resume.id, paragraph: 2, quote: "품질팀 검사보조" } },
      { id: "F2", kind: "metric", statement: "누락 기록 8건→2건", source: { docId: exp.id, paragraph: 3, quote: "필수 항목이 빠진 기록이 8건" } },
      // 원문에 없는 지어낸 사실 — 버려져야 한다.
      { id: "F3", kind: "result", statement: "불량률 30% 감소", source: { docId: exp.id, paragraph: 1, quote: "제품 불량률이 30% 감소했다" } },
    ],
    conflicts: [],
    slots: PACK_SLOT_IDS.map((slot) => ({ slot, status: "ready" as const, reason: "자료가 있음", questions: [], factIds: ["F1", "F2"] })),
  };

  it("원문에서 확인되지 않은 사실은 버리고 확인된 근거에는 원문 문단을 붙인다", () => {
    const assessment = buildVerifiedAssessment(ai, materials);
    expect(assessment.facts.map((fact) => fact.id)).toEqual(["F1", "F2"]);
    expect(assessment.droppedFacts).toBe(1);
    expect(assessment.facts[1].source.paragraphText).toContain("8건");
    expect(assessment.facts[1].source.materialsVersion).toBe(materials.version);
    expect(assessment.slots).toHaveLength(PACK_SLOT_IDS.length);
  });

  it("A 에서는 자료가 충분한 항목이 만들 수 있음으로 남는다", () => {
    const assessment = buildVerifiedAssessment(ai, materials);
    const byId = new Map(assessment.slots.map((slot) => [slot.slot, slot]));
    expect(byId.get("intro_30")?.status).toBe("ready");
    expect(byId.get("motivation_company")?.status).toBe("ready");
    expect(byId.get("aspiration")?.status).toBe("ready");
    expect(byId.get("closing")?.status).toBe("ready");
  });

  it("근거로 확인된 사실이 하나도 없으면 만들 수 있다고 해도 자료 보완 필요로 내린다", () => {
    const noFacts: AiAssessment = { ...ai, facts: [{ id: "F9", kind: "other", statement: "x", source: { docId: "D1", paragraph: 0, quote: "존재하지 않는 인용문장입니다" } }], slots: ai.slots.map((slot) => ({ ...slot, factIds: ["F9"] })) };
    const assessment = buildVerifiedAssessment(noFacts, materials);
    expect(assessment.slots.every((slot) => slot.status === "needs_material")).toBe(true);
    expect(assessment.slots[0].questions.length).toBeGreaterThan(0);
  });

  it("점검 결과에 빠진 항목은 자료 보완 필요로 본다", () => {
    const assessment = buildVerifiedAssessment({ ...ai, slots: ai.slots.slice(0, 2) }, materials);
    expect(assessment.slots.find((slot) => slot.slot === "aspiration")?.status).toBe("needs_material");
  });
});

describe("점검 결과 확인 — 자료 부족(B)", () => {
  const materials = materialsFor("insufficient");
  const memo = materials.docs.find((doc) => doc.title.includes("MEMO"))!;

  it("회사도 공고도 없으면 모델이 만들 수 있다고 해도 지원동기는 보완이 필요하다", () => {
    const ai: AiAssessment = {
      facts: [{ id: "F1", kind: "trait", statement: "성실함", source: { docId: memo.id, paragraph: 0, quote: "성실하고 책임감 있는 사람" } }],
      conflicts: [],
      slots: PACK_SLOT_IDS.map((slot) => ({ slot, status: "ready" as const, reason: "모델은 가능하다고 함", questions: [], factIds: ["F1"] })),
    };
    const assessment = buildVerifiedAssessment(ai, materials);
    const motivation = assessment.slots.find((slot) => slot.slot === "motivation_company")!;
    expect(motivation.status).toBe("needs_material");
    expect(motivation.questions.join(" ")).toContain("회사");
    expect(motivation.questions.length).toBeLessThanOrEqual(3);
    // 마지막 한마디는 지원동기·포부가 만들어질 때만 의미가 있다.
    const closing = assessment.slots.find((slot) => slot.slot === "closing")!;
    expect(closing.status === "needs_material" || closing.status === "ready").toBe(true);
  });

  it("직무가 비어 있으면 모든 항목이 자료 보완 필요다", () => {
    const noRole = { ...materials, role: "" };
    const assessment = buildVerifiedAssessment({ facts: [], conflicts: [], slots: [] }, noRole);
    expect(assessment.slots.every((slot) => slot.status === "needs_material")).toBe(true);
    expect(assessment.slots[0].reason).toContain("직무");
  });
});

describe("점검 결과 확인 — 자료 충돌(C)", () => {
  const materials = materialsFor("conflicting");
  const resume = materials.docs.find((doc) => doc.kind === "resume")!;
  const cover = materials.docs.find((doc) => doc.kind === "cover_letter")!;

  const ai: AiAssessment = {
    facts: [{ id: "F1", kind: "role", statement: "검사보조", source: { docId: resume.id, paragraph: 3, quote: "품질팀 검사보조, 팀원" } }],
    conflicts: [
      {
        topic: "period",
        summary: "재직기간이 다릅니다",
        left: { docId: resume.id, paragraph: 1, quote: "2024년 7월 1일~2025년 12월 31일, 총 1년 6개월" },
        right: { docId: cover.id, paragraph: 0, quote: "2023년 1월 1일부터 2025년 12월 31일까지 3년간 근무했습니다" },
      },
      {
        topic: "role",
        summary: "역할이 다릅니다",
        left: { docId: resume.id, paragraph: 3, quote: "품질팀 검사보조, 팀원" },
        right: { docId: cover.id, paragraph: 1, quote: "팀장으로서 팀원 5명에게 업무를 배정하고 최종 승인했습니다" },
      },
      {
        topic: "metric",
        summary: "수치가 다릅니다",
        left: { docId: resume.id, paragraph: 5, quote: "누락 기록 8건" },
        right: { docId: cover.id, paragraph: 2, quote: "누락 기록이 20건이었고" },
      },
      // 원문에 없는 충돌은 버려진다.
      { topic: "other", summary: "가짜", left: { docId: resume.id, paragraph: 0, quote: "존재하지 않는 문장입니다 정말로" }, right: { docId: cover.id, paragraph: 0, quote: "2023년 1월 1일부터" } },
    ],
    slots: PACK_SLOT_IDS.map((slot) => ({ slot, status: "ready" as const, reason: "가능", questions: [], factIds: ["F1"] })),
  };

  it("실제로 어긋나는 원문 쌍만 남기고 각 쪽의 원문을 붙인다", () => {
    const assessment = buildVerifiedAssessment(ai, materials);
    expect(assessment.conflicts.map((conflict) => conflict.topic)).toEqual(["period", "role", "metric"]);
    expect(assessment.droppedConflicts).toBe(1);
    const period = assessment.conflicts[0];
    expect(period.left.paragraphText).toContain("1년 6개월");
    expect(period.right.paragraphText).toContain("3년");
    expect(period.left.docKind).toBe("resume");
    expect(period.right.docKind).toBe("cover_letter");
  });

  it("확인하기 전에는 경험을 쓰는 항목이 내용 확인 필요이고, 확정하지 않는다", () => {
    const assessment = buildVerifiedAssessment(ai, materials);
    const byId = new Map(assessment.slots.map((slot) => [slot.slot, slot]));
    for (const slot of ["intro_30", "intro_60", "strength", "role_experience", "problem_solving", "collaboration"] as const) {
      expect(byId.get(slot)?.status).toBe("needs_confirmation");
      expect(byId.get(slot)?.blockedByConflictIds).toHaveLength(3);
    }
    // 충돌과 무관한 항목은 그대로 만들 수 있다.
    expect(byId.get("aspiration")?.status).toBe("ready");
  });

  it("충돌 id 는 두 원문만으로 정해져 다시 점검해도 같고, 좌우가 바뀌어도 같다", () => {
    const first = buildVerifiedAssessment(ai, materials).conflicts[0];
    const again = buildVerifiedAssessment({ ...ai, conflicts: [{ ...ai.conflicts[0], left: ai.conflicts[0].right, right: ai.conflicts[0].left }] }, materials).conflicts[0];
    expect(again.id).toBe(first.id);
    expect(stableConflictId("period", first.left, first.right)).toBe(first.id);
    expect(stableConflictId("metric", first.left, first.right)).not.toBe(first.id);
  });

  it("사용자가 충돌을 모두 확인하면 AI 호출 없이 상태가 풀린다", () => {
    const assessment = buildVerifiedAssessment(ai, materials);
    const partial: ConflictConfirmation[] = [{ conflictId: assessment.conflicts[0].id, choice: "left" }];
    const stillBlocked = refreshAssessmentAfterConfirmations(assessment, partial);
    expect(stillBlocked.slots.find((slot) => slot.slot === "intro_30")?.status).toBe("needs_confirmation");
    expect(stillBlocked.slots.find((slot) => slot.slot === "intro_30")?.blockedByConflictIds).toHaveLength(2);

    const all: ConflictConfirmation[] = assessment.conflicts.map((conflict) => ({ conflictId: conflict.id, choice: "left" as const }));
    const resolved = refreshAssessmentAfterConfirmations(assessment, all);
    expect(resolved.slots.find((slot) => slot.slot === "intro_30")?.status).toBe("ready");
  });
});

describe("답변 속 주장 점검", () => {
  const complete = materialsFor("complete");
  const sources = complete.docs.map((doc) => doc.text);

  it("자료에 있는 숫자·역할 서술은 통과한다", () => {
    const answer = "검사 기록을 정리하다 필수 항목이 빠진 기록이 200건 중 8건이라는 것을 확인했습니다. 팀장님의 승인을 거쳐 체크리스트를 통일했고, 이후 2건으로 줄었습니다.";
    expect(scanClaims(answer, sources)).toEqual([]);
  });

  it("측정하지 않은 성과 어휘와 파생 수치를 잡는다", () => {
    const bad = scanClaims("체크리스트로 제품 불량률을 줄였고 누락은 75% 감소했습니다.", sources);
    expect(bad.map((issue) => issue.type)).toEqual(expect.arrayContaining(["unsupported_term", "unsupported_number"]));
    expect(bad.every((issue) => issue.severity === "error")).toBe(true);
  });

  it("측정하지 않은 시간 절감·시장점유율·사내 문화를 새로 만들어 내면 잡는다", () => {
    expect(scanClaims("기록 시간을 크게 단축했습니다. 시간 절감 효과가 있었습니다.", sources).some((issue) => issue.type === "unsupported_term")).toBe(true);
    expect(scanClaims("샘플모빌리티의 높은 시장점유율에 끌렸습니다.", sources).some((issue) => issue.type === "unsupported_term")).toBe(true);
    expect(scanClaims("협업하는 사내 문화가 마음에 들었습니다.", sources).some((issue) => issue.type === "unsupported_term")).toBe(true);
  });

  it("자료가 아니라고 밝힌 표현을 답변이 '아니다'로 말하는 것은 주장이 아니다", () => {
    expect(scanClaims("제품 불량률을 측정한 것은 아니지만 기록 누락은 줄었습니다.", sources).some((issue) => issue.type === "unsupported_term")).toBe(false);
  });

  it("검사보조를 팀장·최종 승인권자로 바꾸는 표현을 잡는다", () => {
    expect(scanClaims("저는 품질팀 팀장으로서 개선을 이끌었습니다.", sources).some((issue) => issue.type === "role_inflation")).toBe(true);
    expect(scanClaims("제가 최종 승인을 했습니다.", sources).some((issue) => issue.type === "role_inflation")).toBe(true);
    expect(scanClaims("팀장님의 검토와 승인을 받아 반영했습니다.", sources).some((issue) => issue.type === "role_inflation")).toBe(false);
  });

  it("숫자 토큰은 사실 주장에 쓰이는 것만 뽑는다", () => {
    expect(extractNumberTokens("8건에서 2건, 200건 중 3가지, 25%, 2024년 5월")).toEqual(expect.arrayContaining(["8건", "2건", "200건", "25%", "2024년", "5월"]));
    expect(extractNumberTokens("3가지 강점")).toEqual([]);
  });

  it("확인 과정에서 물리친 쪽의 숫자가 남아 있으면 잡는다", () => {
    const confirmation: ConflictConfirmation = {
      conflictId: "C-1", choice: "left", topic: "metric",
      chosenText: "누락 기록 8건, 개선 후 2건", rejectedText: "누락 기록이 20건이었고 개선 후 1건",
    };
    expect(scanRejectedValues("20건에서 줄었습니다.", [confirmation]).map((issue) => issue.type)).toEqual(["rejected_value"]);
    expect(scanRejectedValues("8건에서 2건으로 줄었습니다.", [confirmation])).toEqual([]);
  });
});

describe("카드 확인", () => {
  const materials = materialsFor("complete");
  const resume = materials.docs.find((doc) => doc.kind === "resume")!;

  const goodCard: AiCard = {
    slot: "intro_60",
    answer: "안녕하세요. 저는 품질관리 직무에 지원한 지원자입니다. 샘플파트 품질팀에서 검사보조로 일하며 검사 기록을 정리했습니다. 기록이 빠진 항목을 모아 체크리스트 초안을 만들었고, 누락 기록이 8건에서 2건으로 줄었습니다. 이 경험을 살려 정확한 기록과 협업에 기여하겠습니다.",
    keywords: ["검사보조", "체크리스트 초안", "8건에서 2건", "없는키워드"],
    steps: [
      { label: "정체성", sentence: "저는 품질관리 직무에 지원한 지원자입니다." },
      { label: "경험", sentence: "샘플파트 품질팀에서 검사보조로 일하며 검사 기록을 정리했습니다." },
      { label: "지어낸 순서", sentence: "이 문장은 답변에 없습니다." },
    ],
    memoryLine: "기록 누락 8건→2건, 검사보조",
    followUps: ["본인이 한 일은 무엇인가요?", "2건이 남은 이유는 무엇인가요?"],
    evidence: [
      { docId: resume.id, paragraph: 2, quote: "품질팀 검사보조" },
      { docId: resume.id, paragraph: 0, quote: "이력서에 없는 문장입니다 확인불가" },
    ],
    usedFactIds: ["F1", "F99"],
  };

  it("좋은 카드는 완성 답변이고 키워드는 문장에 연결된다", () => {
    const card = verifyGeneratedCard(goodCard, { materials, assessment: null });
    expect(cardIsComplete(card)).toBe(true);
    expect(card.keywords.map((keyword) => keyword.text)).toEqual(["검사보조", "체크리스트 초안", "8건에서 2건"]);
    expect(card.keywords.every((keyword) => keyword.sentenceIndex !== null)).toBe(true);
    expect(card.evidence).toHaveLength(1);
    expect(card.evidence[0].paragraphText).toContain("검사보조");
    // 답변에 없는 순서 문장은 버려진다(2개 남으면 그대로 사용).
    expect(card.steps.map((step) => step.label)).toEqual(["정체성", "경험"]);
    const types = card.issues.map((issue) => issue.type);
    expect(types).toContain("keyword_missing");
    expect(types).toContain("quote_missing");
    expect(card.issues.every((issue) => issue.severity === "warn")).toBe(true);
  });

  it("지어낸 수치·역할이 들어가면 완성 답변으로 표시하지 않는다", () => {
    const bad = verifyGeneratedCard({ ...goodCard, answer: goodCard.answer.replace("누락 기록이 8건에서 2건으로 줄었습니다", "제품 불량률이 30% 감소했습니다"), keywords: ["검사보조", "체크리스트 초안", "불량률"] }, { materials, assessment: null });
    expect(cardIsComplete(bad)).toBe(false);
    expect(bad.issues.some((issue) => issue.type === "unsupported_term")).toBe(true);
  });

  it("근거를 하나도 못 찾으면 완성 답변이 아니다", () => {
    const bad = verifyGeneratedCard({ ...goodCard, evidence: [{ docId: resume.id, paragraph: 0, quote: "존재하지 않는 문장입니다 절대로" }] }, { materials, assessment: null });
    expect(cardIsComplete(bad)).toBe(false);
  });

  it("30초 자기소개가 1분 답변을 잘라 붙인 것이면 잡는다", () => {
    const sixty = goodCard.answer;
    const half = "안녕하세요. 저는 품질관리 직무에 지원한 지원자입니다. 샘플파트 품질팀에서 검사보조로 일하며 검사 기록을 정리했습니다.";
    expect(introsLookTruncated(half, sixty)).toBe(true);
    const different = "검사 기록의 빈칸을 끝까지 확인하는 품질관리 지원자입니다. 체크리스트 초안으로 누락 기록을 8건에서 2건으로 줄인 경험이 있습니다.";
    expect(introsLookTruncated(different, sixty)).toBe(false);

    const card = verifyGeneratedCard({ ...goodCard, slot: "intro_30", answer: half, keywords: ["검사보조", "품질관리", "검사 기록"], steps: [{ label: "a", sentence: "저는 품질관리 직무에 지원한 지원자입니다." }, { label: "b", sentence: "샘플파트 품질팀에서 검사보조로 일하며 검사 기록을 정리했습니다." }] }, { materials, assessment: null, siblingIntros: { intro60: sixty } });
    expect(card.issues.some((issue) => issue.type === "structure")).toBe(true);
  });

  it("사용자가 직접 고치면 키워드·문제 표시를 새 본문에 맞춰 갱신하고 오류로 막지 않는다", () => {
    const card = verifyGeneratedCard(goodCard, { materials, assessment: null });
    const edited = recheckEditedCard(card, "체크리스트 초안을 만들었고 누락이 75% 줄었습니다. 검사보조로 일했습니다.", materials);
    expect(edited.answer).toContain("75%");
    expect(edited.keywords.find((keyword) => keyword.text === "8건에서 2건")?.sentenceIndex).toBeNull();
    expect(edited.issues.some((issue) => issue.type === "unsupported_number")).toBe(true);
    // 본인이 쓴 글이므로 어떤 문제도 오류(error)로 올리지 않는다.
    expect(edited.issues.every((issue) => issue.severity === "warn")).toBe(true);
    expect(cardIsComplete(edited)).toBe(true);
  });
});

describe("지원 회사·직무 고르기", () => {
  it("사용자가 입력한 지원 건의 값을 먼저 쓰고 없으면 분석 결과의 값을 쓴다", () => {
    expect(pickCompanyAndRole({ caseCompany: "내 회사", caseRole: "내 직무", resultCompany: "결과 회사", resultRole: "결과 직무" })).toEqual({ company: "내 회사", role: "내 직무" });
    expect(pickCompanyAndRole({ caseCompany: "", caseRole: null, resultCompany: "결과 회사", resultRole: "결과 직무" })).toEqual({ company: "결과 회사", role: "결과 직무" });
  });

  it("예전에 저장된 영어 자리표시자는 자료로 삼지 않는다", () => {
    expect(pickCompanyAndRole({ resultCompany: "Applicant company", resultRole: "Applicant role" })).toEqual({ company: "", role: "" });
    expect(pickCompanyAndRole({ caseCompany: " applicant company ", resultRole: "자기소개서 첨삭" })).toEqual({ company: "", role: "" });
    expect(pickCompanyAndRole({})).toEqual({ company: "", role: "" });
  });

  it("회사를 확정 못해 올린 파일 이름이 그대로 들어간 값은 자료로 삼지 않는다(관리자 테스트 C 흐름에서 실제로 확인됨)", () => {
    const docFilenames = ["03_conflicting_materials.txt"];
    expect(pickCompanyAndRole({ resultCompany: "03_conflicting_materials", resultRole: "생산관리", docFilenames })).toEqual({ company: "", role: "생산관리" });
    // 대소문자·확장자가 달라도 같은 파일로 본다.
    expect(pickCompanyAndRole({ resultCompany: "03_CONFLICTING_MATERIALS", docFilenames })).toEqual({ company: "", role: "" });
    // 진짜 회사 이름은 그대로 남는다.
    expect(pickCompanyAndRole({ resultCompany: "샘플모빌리티 주식회사(가상기업)", docFilenames })).toEqual({ company: "샘플모빌리티 주식회사(가상기업)", role: "" });
  });
});

describe("점검 결과 확인 — 보완 칸의 회사·직무는 충돌이 아니다", () => {
  const base = materialsFor("complete");
  const profile = base.docs.find((doc) => doc.title.includes("PROFILE-01"))!;
  const profileParagraphs = splitParagraphs(profile.text);
  const companyParagraph = profileParagraphs.findIndex((text) => text.includes("지원회사"));
  const supplementDoc = { id: "U", kind: "supplement" as const, title: "지원자가 직접 보완한 내용", text: "[지원회사] 다른회사(가상기업)\n\n[실제 지원 이유] 조율하는 일이 맞는다고 느꼈다.", documentId: null, documentVersionId: null, filename: null };
  const materials = { ...base, docs: [...base.docs, supplementDoc] };
  const conflictWith = (paragraph: number, quote: string) => ({
    facts: [],
    conflicts: [{ topic: "other" as const, summary: "회사가 다르다", left: { docId: profile.id, paragraph: companyParagraph, quote: profileParagraphs[companyParagraph] }, right: { docId: "U", paragraph, quote } }],
    slots: [],
  });

  it("[지원회사] 문단이 한쪽인 충돌은 버린다", () => {
    const assessment = buildVerifiedAssessment(conflictWith(0, "[지원회사] 다른회사(가상기업)"), materials);
    expect(assessment.conflicts).toHaveLength(0);
    expect(assessment.droppedConflicts).toBe(1);
  });

  it("그 밖의 보완 문단과 원본 사이의 충돌은 그대로 남긴다", () => {
    const assessment = buildVerifiedAssessment(conflictWith(1, "[실제 지원 이유] 조율하는 일이 맞는다고 느꼈다."), materials);
    expect(assessment.conflicts).toHaveLength(1);
  });
});
