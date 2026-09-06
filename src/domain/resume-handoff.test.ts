import { describe, expect, it } from "vitest";
import { mergeResumeIntoMaterials, RESUME_HANDOFF_FILENAME } from "./resume-handoff";

const existing = JSON.stringify({
  schemaVersion: "1.0",
  freeformNotes: "야간 대학을 다니며 일했습니다",
  experiences: [],
  freeformAttachments: [{ filename: "메모.txt", extension: "txt", sizeBytes: 4, text: "메모" }],
  profileEntries: [],
  materialAttachments: [{ filename: "경력기술서.pdf", extension: "pdf", sizeBytes: 10, text: "경력", kind: "CAREER_DOCUMENT" }],
});

describe("mergeResumeIntoMaterials", () => {
  it("이력서를 참고자료가 아니라 RESUME로 담는다", () => {
    const merged = mergeResumeIntoMaterials(null, "이름: 홍길동");
    const resume = merged.materialAttachments.find((attachment) => attachment.filename === RESUME_HANDOFF_FILENAME);
    // 이름 없는 첨부로 들어가면 프롬프트가 포트폴리오로 읽고, 이력서 대조가 켜지지 않는다.
    expect(resume?.kind).toBe("RESUME");
    expect(resume?.text).toBe("이름: 홍길동");
  });

  it("이미 담아 둔 자료를 지우지 않는다", () => {
    const merged = mergeResumeIntoMaterials(existing, "이름: 홍길동");
    expect(merged.freeformNotes).toBe("야간 대학을 다니며 일했습니다");
    expect(merged.freeformAttachments).toHaveLength(1);
    expect(merged.materialAttachments.some((attachment) => attachment.filename === "경력기술서.pdf")).toBe(true);
  });

  it("다시 이어가면 옛 이력서를 갈아 끼운다", () => {
    const once = mergeResumeIntoMaterials(existing, "이름: 홍길동");
    const twice = mergeResumeIntoMaterials(JSON.stringify(once), "이름: 홍길동\n[경력] 추가");
    const resumes = twice.materialAttachments.filter((attachment) => attachment.filename === RESUME_HANDOFF_FILENAME);
    // 두 장이 남으면 서로 어긋나는 이력서를 대조하게 된다.
    expect(resumes).toHaveLength(1);
    expect(resumes[0].text).toContain("[경력] 추가");
  });

  it("저장된 값이 깨져 있어도 이어가기가 막히지 않는다", () => {
    const merged = mergeResumeIntoMaterials("{망가진 JSON", "이름: 홍길동");
    expect(merged.materialAttachments).toHaveLength(1);
    expect(merged.freeformNotes).toBe("");
  });
});
