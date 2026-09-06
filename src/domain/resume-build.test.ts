import { describe, expect, it } from "vitest";
import {
  applyResumeBuildOutput,
  buildResumeBuildPrompt,
  countResumeBuildSourceCharacters,
  describeResumeBuildResult,
  hasEnoughResumeBuildSource,
  normalizeResumeBuildOutput,
  RESUME_BUILD_MAX_SOURCE_CHARS,
  type ResumeBuildOutput,
  type ResumeBuildSource,
} from "./resume-build";
import { emptyResumeDraft, type ResumeDraft } from "./resume-draft";

function source(overrides: Partial<ResumeBuildSource> = {}): ResumeBuildSource {
  return { id: "s1", filename: "경력증명서.pdf", extension: "pdf", sizeBytes: 1000, text: "재직기간 2021.03 ~ 2023.05", kind: "CAREER_DOCUMENT", ...overrides };
}

function emptyOutput(overrides: Partial<ResumeBuildOutput> = {}): ResumeBuildOutput {
  return {
    contact: { name: "", birth: "", phone: "", email: "", address: "", headline: "" },
    educations: [], careers: [], certificates: [], extras: [], skills: "", notes: [],
    ...overrides,
  };
}

describe("자료 세기", () => {
  it("글자가 없는 스캔본은 세지 않는다 — 파일 수는 많아도 모델이 볼 것이 없다", () => {
    const request = { narrative: "", sources: [source({ text: "", unreadable: true })] };
    expect(countResumeBuildSourceCharacters(request)).toBe(0);
    expect(hasEnoughResumeBuildSource(request)).toBe(false);
  });

  it("줄글과 파일 글자를 합쳐 최소치를 넘으면 결제를 연다", () => {
    const request = { narrative: "가".repeat(50), sources: [source({ text: "나".repeat(50) })] };
    expect(hasEnoughResumeBuildSource(request)).toBe(true);
  });
});

describe("프롬프트 조립", () => {
  it("자료마다 무엇인지 이름을 붙인다 — 자소서의 포부가 경력으로 옮겨 적히지 않게", () => {
    const prompt = buildResumeBuildPrompt({
      narrative: "2021년 3월부터 2년 반 품질관리",
      sources: [source({ filename: "예전자소서.docx", kind: "COVER_LETTER", text: "저는 성실합니다" })],
    });
    expect(prompt.text).toContain("[본인이 적은 설명]");
    expect(prompt.text).toContain("[자료 1 · 자기소개서 · 예전자소서.docx]");
    expect(prompt.truncated).toEqual([]);
  });

  it("상한을 넘으면 잘린 자료의 이름을 돌려준다", () => {
    const prompt = buildResumeBuildPrompt({
      narrative: "가".repeat(RESUME_BUILD_MAX_SOURCE_CHARS),
      sources: [source({ filename: "뒤로밀린자료.pdf" })],
    });
    expect(prompt.truncated).toContain("뒤로밀린자료.pdf");
  });
});

describe("결과 정리", () => {
  it("아무것도 안 적힌 줄은 버린다", () => {
    const output = normalizeResumeBuildOutput(emptyOutput({
      careers: [{ company: "  ", role: "", period: "", duties: "" }, { company: " 무아 ", role: "품질관리", period: "2021.03~2023.05", duties: "검사" }],
    }));
    expect(output.careers).toEqual([{ company: "무아", role: "품질관리", period: "2021.03~2023.05", duties: "검사" }]);
  });

  it("찾은 것이 없으면 그렇다고 말한다", () => {
    expect(describeResumeBuildResult(emptyOutput())).toContain("찾지 못했습니다");
  });
});

describe("이력서에 얹기", () => {
  it("사람이 적은 연락처를 자료에서 찾은 값으로 덮지 않는다", () => {
    const current: ResumeDraft = { ...emptyResumeDraft(), contact: { ...emptyResumeDraft().contact, phone: "010-1111-2222" } };
    const merged = applyResumeBuildOutput(current, emptyOutput({
      contact: { name: "전민수", birth: "", phone: "010-9999-9999", email: "", address: "", headline: "" },
    }));
    expect(merged.contact.phone).toBe("010-1111-2222");
    expect(merged.contact.name).toBe("전민수");
  });

  it("같은 회사·기간은 다시 넣지 않고, 사람이 적은 줄은 그대로 둔다", () => {
    const base = emptyResumeDraft();
    const current: ResumeDraft = {
      ...base,
      careers: [{ id: "mine", company: "무아", role: "품질관리", period: "2021.03~2023.05", duties: "내가 적음" }],
    };
    const merged = applyResumeBuildOutput(current, emptyOutput({
      careers: [
        { company: "무아", role: "QA", period: "2021.03 ~ 2023.05", duties: "AI가 적음" },
        { company: "다른회사", role: "생산", period: "2019.01~2021.02", duties: "조립" },
      ],
    }));
    expect(merged.careers).toHaveLength(2);
    expect(merged.careers[0]).toMatchObject({ id: "mine", duties: "내가 적음" });
    expect(merged.careers[1]).toMatchObject({ company: "다른회사" });
  });

  it("빈 기본 줄은 자리를 내주고, 목록이 통째로 비면 빈 줄 하나는 남긴다", () => {
    const merged = applyResumeBuildOutput(emptyResumeDraft(), emptyOutput({
      careers: [{ company: "무아", role: "", period: "", duties: "" }],
    }));
    expect(merged.careers).toHaveLength(1);
    expect(merged.careers[0].company).toBe("무아");
    expect(merged.educations).toHaveLength(1);
    expect(merged.educations[0].school).toBe("");
  });

  it("기술은 합치되 같은 것을 두 번 적지 않는다", () => {
    const current: ResumeDraft = { ...emptyResumeDraft(), skills: "엑셀, 품질관리" };
    const merged = applyResumeBuildOutput(current, emptyOutput({ skills: "품질 관리, SPC" }));
    expect(merged.skills).toBe("엑셀, 품질관리, SPC");
  });

  it("사진은 손대지 않는다", () => {
    const current: ResumeDraft = { ...emptyResumeDraft(), photo: { enabled: true, dataUrl: "data:image/jpeg;base64,AAA" } };
    expect(applyResumeBuildOutput(current, emptyOutput()).photo).toEqual(current.photo);
  });
});
