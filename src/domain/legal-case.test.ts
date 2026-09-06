import { describe, expect, it } from "vitest";
import {
  buildLegalCasePrompt,
  countLegalCaseSourceCharacters,
  findLegalDocumentDefinition,
  hasEnoughLegalCaseSource,
  legalDocumentDefinitions,
  normalizeLegalDocumentOutput,
  orderLegalDocuments,
  orderMaterialsForDocument,
  LEGAL_CASE_MAX_PROMPT_CHARS,
  type LegalCaseMaterial,
  type LegalDocumentOutput,
} from "./legal-case";

function material(overrides: Partial<LegalCaseMaterial> = {}): LegalCaseMaterial {
  return { id: "m1", kind: "CONTRACT", filename: "계약서.pdf", text: "2024년 3월 1일 계약", sizeBytes: 100, createdAt: "2026-09-06T00:00:00Z", ...overrides };
}

function emptyOutput(overrides: Partial<LegalDocumentOutput> = {}): LegalDocumentOutput {
  return { title: "", headline: "", sections: [], issues: [], evidenceItems: [], deadlines: [], notes: [], ...overrides };
}

describe("문서 목록", () => {
  it("열 종류가 모두 정의되어 있고 이름이 겹치지 않는다", () => {
    expect(legalDocumentDefinitions).toHaveLength(10);
    expect(new Set(legalDocumentDefinitions.map((definition) => definition.type)).size).toBe(10);
  });

  it("종류마다 고유 지시문이 있다 — 빈 지시문이면 열 문서가 같은 글이 된다", () => {
    for (const definition of legalDocumentDefinitions) expect(definition.guide.length).toBeGreaterThan(0);
  });

  it("소장을 받은 사람에게는 답변서가 소장보다 앞에 온다", () => {
    const ordered = orderLegalDocuments("DEFENDANT").map((definition) => definition.type);
    expect(ordered.indexOf("ANSWER")).toBeLessThan(ordered.indexOf("COMPLAINT"));
  });

  it("청구하는 쪽에게는 소장이 답변서보다 앞에 온다", () => {
    const ordered = orderLegalDocuments("PLAINTIFF").map((definition) => definition.type);
    expect(ordered.indexOf("COMPLAINT")).toBeLessThan(ordered.indexOf("ANSWER"));
  });

  it("모르는 종류를 조용히 넘기지 않는다", () => {
    // @ts-expect-error 없는 종류를 일부러 넣습니다.
    expect(() => findLegalDocumentDefinition("NOPE")).toThrow();
  });
});

describe("사건 프롬프트", () => {
  const legalCase = { title: "대여금 반환", caseType: "CIVIL" as const, myRole: "PLAINTIFF" as const, summary: "2024년에 500만원을 빌려줬습니다." };

  it("사건 정보와 자료에 이름표를 붙인다", () => {
    const prompt = buildLegalCasePrompt({ legalCase, materials: [material()] });
    expect(prompt.text).toContain("[사건 정보]");
    expect(prompt.text).toContain("[본인이 적은 사건 경위]");
    expect(prompt.text).toContain("[자료 1 · 계약서 · 각서 · 계약서.pdf]");
  });

  it("상한을 넘으면 잘린 자료의 이름을 돌려준다", () => {
    const prompt = buildLegalCasePrompt({
      legalCase: { ...legalCase, summary: "가".repeat(LEGAL_CASE_MAX_PROMPT_CHARS) },
      materials: [material({ filename: "뒤로밀린자료.pdf" })],
    });
    expect(prompt.truncated).toContain("뒤로밀린자료.pdf");
  });

  it("빈 자료는 번호를 차지하지 않는다", () => {
    const prompt = buildLegalCasePrompt({ legalCase, materials: [material({ text: "   " }), material({ id: "m2", filename: "카톡.txt", kind: "MESSAGE" })] });
    expect(prompt.text).toContain("[자료 1 · 문자 · 카톡 · 메일 · 카톡.txt]");
    expect(prompt.text).not.toContain("[자료 2");
  });
});

describe("문서에 맞춘 자료 순서", () => {
  it("판결문 분석에서는 판결문이 앞으로 온다 — 상한에 걸려도 잘리면 안 되는 자료다", () => {
    const ordered = orderMaterialsForDocument(
      [material({ kind: "CONTRACT" }), material({ id: "m2", kind: "JUDGMENT" })],
      "JUDGMENT_ANALYSIS",
    );
    expect(ordered[0].kind).toBe("JUDGMENT");
  });

  it("답변서에서는 상대방 주장이 앞으로 온다", () => {
    const ordered = orderMaterialsForDocument(
      [material({ kind: "CONTRACT" }), material({ id: "m2", kind: "OPPONENT_CLAIM" })],
      "ANSWER",
    );
    expect(ordered[0].kind).toBe("OPPONENT_CLAIM");
  });

  it("순서만 바꾸고 자료를 버리지 않는다", () => {
    const materials = [material({ kind: "RECORDING" }), material({ id: "m2", kind: "JUDGMENT" }), material({ id: "m3", kind: "OTHER" })];
    expect(orderMaterialsForDocument(materials, "JUDGMENT_ANALYSIS")).toHaveLength(3);
  });

  it("문서를 고르지 않으면 올린 순서 그대로 둔다", () => {
    const materials = [material({ kind: "OTHER" }), material({ id: "m2", kind: "JUDGMENT" })];
    expect(orderMaterialsForDocument(materials).map((item) => item.kind)).toEqual(["OTHER", "JUDGMENT"]);
  });
});

describe("자료 양", () => {
  it("사건 경위와 자료 글자를 합쳐 센다", () => {
    const input = { summary: "가".repeat(60), materials: [material({ text: "나".repeat(80) })] };
    expect(countLegalCaseSourceCharacters(input)).toBe(140);
    expect(hasEnoughLegalCaseSource(input)).toBe(true);
  });

  it("자료가 너무 적으면 막는다", () => {
    expect(hasEnoughLegalCaseSource({ summary: "짧습니다", materials: [] })).toBe(false);
  });
});

describe("결과 정리", () => {
  it("빈 절과 빈 쟁점은 버린다", () => {
    const output = normalizeLegalDocumentOutput(emptyOutput({
      sections: [
        { heading: "  ", body: "  ", bullets: ["  "], evidence: "" },
        { heading: " 청구취지 ", body: " 500만원을 지급하라 ", bullets: [" 갑 제1호증 ", ""], evidence: "계약서.pdf" },
      ],
      issues: [{ label: "  ", myPosition: "x", theirPosition: "", evidence: "", needed: "" }],
    }));
    expect(output.sections).toHaveLength(1);
    expect(output.sections[0]).toMatchObject({ heading: "청구취지", bullets: ["갑 제1호증"] });
    expect(output.issues).toHaveLength(0);
  });

  it("증거 목록은 이름이 있는 것만 남긴다", () => {
    const output = normalizeLegalDocumentOutput(emptyOutput({
      evidenceItems: [{ marker: "갑 제1호증", name: " 계약서 ", purpose: "계약 체결 사실" }, { marker: "갑 제2호증", name: " ", purpose: "" }],
    }));
    expect(output.evidenceItems).toEqual([{ marker: "갑 제1호증", name: "계약서", purpose: "계약 체결 사실" }]);
  });
});
