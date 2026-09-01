import { describe, expect, it } from "vitest";
import { DEFAULT_TARGET_LENGTH, describeLengthLoss, describeResolvedLengths, describeSimpleIntakeGap, describeSimpleIntakeGaps, mapSimpleIntake, planQuestionLengths, type SimpleIntakeSource } from "./simple-intake-mapping";

function file(filename: string, kind: SimpleIntakeSource["kind"], text = "내용"): SimpleIntakeSource {
  return { filename, extension: filename.split(".").pop() ?? "pdf", sizeBytes: 1024, text, kind };
}

describe("간편 입력 매핑", () => {
  it("종류별로 기존 저장 형태에 나눠 담는다", () => {
    const mapped = mapSimpleIntake("", [
      file("공고.pdf", "JOB_POSTING", "자격 요건"),
      file("자소서.docx", "COVER_LETTER", "1. 지원 동기\n답변입니다."),
      file("이력서.pdf", "RESUME"),
      file("경력기술서.pdf", "CAREER_DOCUMENT"),
      file("포트폴리오.pdf", "PORTFOLIO"),
      file("자격증.pdf", "OTHER"),
    ]);
    expect(mapped.posting).toBe("자격 요건");
    expect(mapped.postingFilenames).toEqual(["공고.pdf"]);
    expect(mapped.materialAttachments.map((item) => item.kind)).toEqual(["RESUME", "CAREER_DOCUMENT", "PORTFOLIO"]);
    expect(mapped.freeformAttachments.map((item) => item.filename)).toEqual(["자격증.pdf"]);
    expect(mapped.questions.some((question) => question.answer.includes("답변입니다"))).toBe(true);
  });

  it("붙여넣은 글이 첨부된 자소서 파일보다 우선한다", () => {
    // Someone who pasted the letter and also attached an older copy means the
    // pasted one. Taking the file would silently analyse the wrong draft.
    const mapped = mapSimpleIntake("새로 쓴 내용입니다.", [file("예전자소서.docx", "COVER_LETTER", "옛날 내용")]);
    expect(mapped.questions[0].answer).toContain("새로 쓴 내용");
    expect(mapped.questions[0].answer).not.toContain("옛날 내용");
    // No source file either: the letter did not come from one.
    expect(mapped.sourceFile).toBeNull();
  });

  it("파일에서 온 자소서는 원본 파일명을 남긴다", () => {
    const mapped = mapSimpleIntake("", [file("자소서.docx", "COVER_LETTER", "내용입니다")]);
    expect(mapped.sourceFile?.filename).toBe("자소서.docx");
  });

  it("첨부 개수 상한을 넘으면 조용히 버리지 않고 이름을 남긴다", () => {
    // The saved draft caps each list at 10 and throws on save, after the screen
    // is already full. Trimming here means it can be said out loud instead.
    const many = Array.from({ length: 13 }, (_, index) => file(`증빙${index}.pdf`, "OTHER"));
    const mapped = mapSimpleIntake("자소서 내용", many);
    expect(mapped.freeformAttachments).toHaveLength(10);
    expect(mapped.droppedFilenames).toEqual(["증빙10.pdf", "증빙11.pdf", "증빙12.pdf"]);
  });

  it("아주 긴 파일은 잘라서 담는다", () => {
    const mapped = mapSimpleIntake("자소서", [file("긴자료.pdf", "OTHER", "가".repeat(60_000))]);
    expect(mapped.freeformAttachments[0].text).toHaveLength(50_000);
  });

  it("빈 입력에도 문항 하나는 남는다", () => {
    const mapped = mapSimpleIntake("", []);
    expect(mapped.questions).toHaveLength(1);
    expect(mapped.questions[0].answer).toBe("");
  });

  it("모자란 것을 이름 대고 말한다", () => {
    // One box, so "필수 항목을 확인하세요" leaves them nothing to act on.
    expect(describeSimpleIntakeGap(mapSimpleIntake("", []))).toContain("자기소개서");
    // The posting is a warning now, not a block — see 자료 없이도 진행 below.
    expect(describeSimpleIntakeGap(mapSimpleIntake("자소서 내용입니다", [], 700))).toBe("");
    // The length gate is checked last, so a draft with everything but a stated
    // limit lands on that sentence rather than on a blank pass.
    expect(describeSimpleIntakeGap(mapSimpleIntake("자소서 내용입니다", [file("공고.pdf", "JOB_POSTING", "자격 요건")], 700))).toBe("");
  });

  it("자기소개서가 두 장이면 하나를 고르게 한다", () => {
    // 이어 붙여 한 편으로 읽는 동안에는 "자기소개서"라고만 적힌 줄이 어느 파일에
    // 있느냐로 살아남는 문항이 정해졌고, 버려진 쪽은 화면에 나타나지 않았습니다.
    // 문항 여섯 개를 올린 사람이 남의 문항 세 개를 첨삭받는 일이 실제로 있었습니다.
    const mine = ["1. 지원동기 (1600자)", "제 지원동기입니다.", "2. 직무 강점 (1600자)", "제 강점입니다."].join("\n");
    // 이 한 줄이 있고 없고로 살아남는 쪽이 갈렸습니다.
    const theirs = ["자기소개서", "1. 성장과정 (700자)", "남의 성장과정입니다."].join("\n");

    const one = mapSimpleIntake("", [file("내자소서.pdf", "COVER_LETTER", mine)], 700);
    expect(describeSimpleIntakeGap(one)).toBe("");
    expect(one.questions).toHaveLength(2);

    const two = mapSimpleIntake("", [
      file("내자소서.pdf", "COVER_LETTER", mine),
      file("남자소서.docx", "COVER_LETTER", theirs),
    ], 700);
    const gap = describeSimpleIntakeGap(two);
    expect(gap).toContain("자기소개서가 2개입니다");
    // 어느 파일이 문제인지 말해 주어야 무엇을 빼야 할지 알 수 있습니다.
    expect(gap).toContain("내자소서.pdf");
    expect(gap).toContain("남자소서.docx");
  });

  it("붙여넣은 글이 있으면 첨부한 자소서 수를 세지 않는다", () => {
    // 그때 파일은 문항에 쓰이지 않으므로, 막을 이유도 없습니다.
    const mapping = mapSimpleIntake("붙여넣은 자소서입니다", [
      file("옛날자소서.pdf", "COVER_LETTER", ["1. 지원동기", "예전 글"].join("\n")),
      file("더옛날자소서.pdf", "COVER_LETTER", ["1. 지원동기", "더 예전 글"].join("\n")),
    ], 700);
    expect(mapping.coverLetterFilenames).toEqual([]);
    expect(describeSimpleIntakeGap(mapping)).toBe("");
  });
});

describe("간편 입력 글자 수", () => {
  it("한 번 적은 글자 수를 모든 문항에 채운다", () => {
    const mapped = mapSimpleIntake("1. 지원 동기\n답변\n\n2. 직무 역량\n답변", [], 600);
    expect(mapped.questions.every((question) => question.targetLength === 600)).toBe(true);
  });

  it("문항이 스스로 밝힌 글자 수를 덮어쓰지 않는다", () => {
    // The applicant typed one number for the whole form; the employer printed
    // the real one next to the question.
    const mapped = mapSimpleIntake("1. 지원 동기 (800자)\n답변\n\n2. 직무 역량\n답변", [], 600);
    expect(mapped.questions[0].targetLength).toBe(800);
    expect(mapped.questions[1].targetLength).toBe(600);
  });

  it("비워두면 아무것도 채우지 않는다", () => {
    const mapped = mapSimpleIntake("1. 지원 동기\n답변", [], null);
    expect(mapped.questions[0].targetLength).toBeNull();
  });
});

describe("글자 수 안전장치", () => {
  it("글자 수가 없으면 진행을 막는다", () => {
    // Without a stated limit the target fell back to the draft's own length:
    // 8,000 characters pasted became an 8,000 character goal, and PRO BUILD
    // then tried to fill it.
    const mapped = mapSimpleIntake("1. 지원 동기\n답변", [file("공고.pdf", "JOB_POSTING", "자격 요건")], null);
    expect(describeSimpleIntakeGap(mapped)).toContain("글자 수");
  });

  it("자소서에 적힌 글자 수만으로도 통과한다", () => {
    const mapped = mapSimpleIntake("1. 지원 동기 (500자)\n답변", [file("공고.pdf", "JOB_POSTING", "자격 요건")], null);
    expect(describeSimpleIntakeGap(mapped)).toBe("");
  });

  it("기준 길이를 사람이 읽게 적어준다", () => {
    const same = mapSimpleIntake("1. 지원 동기\n답변\n\n2. 역량\n답변", [], 700);
    expect(describeResolvedLengths(same)).toContain("모든 문항 700자");
    const mixed = mapSimpleIntake("1. 지원 동기 (500자)\n답변\n\n2. 역량\n답변", [], 700);
    expect(describeResolvedLengths(mixed)).toContain("500 · 700");
  });

  it("기본값은 한국 자소서 문항 길이 한가운데다", () => {
    expect(DEFAULT_TARGET_LENGTH).toBe(700);
  });
});

describe("자료 없이도 진행", () => {
  it("공고가 없어도 막지 않는다", () => {
    // Refusing to run at all is worse for someone with a draft and no posting
    // than running without the comparison.
    const mapped = mapSimpleIntake("1. 지원 동기\n답변입니다", [], 700);
    expect(describeSimpleIntakeGap(mapped)).toBe("");
  });

  it("자기소개서는 여전히 필요하다", () => {
    expect(describeSimpleIntakeGap(mapSimpleIntake("", [], 700))).toContain("자기소개서");
  });

  it("빠진 것을 이름 대고 알린다", () => {
    const bare = mapSimpleIntake("1. 지원 동기\n답변입니다", [], 700);
    const gaps = describeSimpleIntakeGaps(bare);
    expect(gaps.some((g) => g.includes("채용공고"))).toBe(true);
    expect(gaps.some((g) => g.includes("이력서"))).toBe(true);
  });

  it("다 갖추면 아무 말도 하지 않는다", () => {
    const full = mapSimpleIntake("1. 지원 동기\n답변입니다", [
      file("공고.pdf", "JOB_POSTING", "자격 요건"),
      file("이력서.pdf", "RESUME"),
    ], 700);
    expect(describeSimpleIntakeGaps(full)).toEqual([]);
  });
});

describe("문항별 현재 분량", () => {
  const mapping = (draft: string, target: number | null) => mapSimpleIntake(draft, [], target);

  it("지금 몇 자인지와 목표를 함께 준다", () => {
    // The screen only ever said what the target was. Someone who uploaded a
    // finished letter and left the default never saw how long theirs already
    // was, and lost close to half of it.
    const plans = planQuestionLengths(mapping("1. 지원 동기\n" + "가".repeat(1200), 700));
    expect(plans).toHaveLength(1);
    expect(plans[0].current).toBe(1200);
    expect(plans[0].target).toBe(700);
    expect(Math.round(plans[0].shrink * 100)).toBe(42);
  });

  it("공백은 세지 않는다", () => {
    // 지원서 양식이 세는 방식과 같아야 비교가 됩니다.
    expect(planQuestionLengths(mapping("1. 지원 동기\n가 나 다\n라", 700))[0].current).toBe(4);
  });

  it("목표보다 짧으면 줄어들 것이 없다", () => {
    expect(planQuestionLengths(mapping("1. 지원 동기\n" + "가".repeat(300), 700))[0].shrink).toBe(0);
  });

  it("조금 다듬는 정도는 경고하지 않는다", () => {
    // Trimming to fit is half of what editing is; warning about it would train
    // people to ignore the line.
    expect(describeLengthLoss(planQuestionLengths(mapping("1. 지원 동기\n" + "가".repeat(800), 700)))).toBeNull();
  });

  it("많이 줄어들면 지키는 방법까지 말한다", () => {
    const message = describeLengthLoss(planQuestionLengths(mapping("1. 지원 동기\n" + "가".repeat(1200), 700)));
    expect(message).toContain("42%");
    expect(message).toContain("(1200자)");
  });
});

describe("총 글자 수 한도 표시", () => {
  it("문항 합계로 한도를 잰다", () => {
    // The cap is on the 자기소개서, and it does not care whether it arrived by
    // paste or by file — so the number beside it has to count both the same way.
    const plans = planQuestionLengths(mapSimpleIntake("1. 지원 동기\n" + "가".repeat(1200) + "\n2. 직무 역량\n" + "나".repeat(800), [], 700));
    expect(plans.reduce((total, plan) => total + plan.current, 0)).toBe(2000);
  });
});
