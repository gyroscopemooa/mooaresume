import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  attachmentCheckMessage,
  checkAttachments,
  formatBytes,
  isInlineImage,
  safeAttachmentName,
} from "./mail-attachments";

function file(name: string, size: number, type = "application/pdf") {
  return { name, size, type };
}

describe("checkAttachments", () => {
  it("빈 목록도 통과한다", () => {
    expect(checkAttachments([])).toEqual({ ok: true });
  });

  it("개수 상한을 넘으면 막는다", () => {
    const many = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, index) => file(`${index}.pdf`, 10));
    expect(checkAttachments(many)).toEqual({ ok: false, reason: "too_many" });
  });

  it("빈 파일은 이름을 대며 막는다", () => {
    // A zero-byte pick is almost always a mistake; sending it looks like success.
    expect(checkAttachments([file("포스터.png", 0, "image/png")]))
      .toEqual({ ok: false, reason: "empty_file", offender: "포스터.png" });
  });

  it("한 파일이 상한을 넘으면 그 파일을 지목한다", () => {
    expect(checkAttachments([file("작은.pdf", 10), file("큰.pdf", MAX_ATTACHMENT_BYTES + 1)]))
      .toEqual({ ok: false, reason: "too_large", offender: "큰.pdf" });
  });

  it("각각은 통과해도 합계가 넘으면 막는다", () => {
    const three = Array.from({ length: 3 }, (_, index) => file(`${index}.pdf`, MAX_ATTACHMENT_BYTES));
    expect(checkAttachments(three)).toEqual({ ok: false, reason: "total_too_large" });
  });

  it("거절 이유마다 사람이 읽을 문장을 준다", () => {
    expect(attachmentCheckMessage({ ok: false, reason: "too_many" })).toContain(String(MAX_ATTACHMENTS));
    expect(attachmentCheckMessage({ ok: false, reason: "empty_file", offender: "x.png" })).toContain("x.png");
    expect(attachmentCheckMessage({ ok: false, reason: "too_large", offender: "y.pdf" })).toContain("y.pdf");
    expect(attachmentCheckMessage({ ok: false, reason: "total_too_large" })).toContain("10MB");
  });
});

describe("isInlineImage", () => {
  it("본문에 넣을 수 있는 사진 형식만 참이다", () => {
    expect(isInlineImage("image/png")).toBe(true);
    expect(isInlineImage("IMAGE/JPEG")).toBe(true);
    expect(isInlineImage("image/webp; charset=binary")).toBe(true);
    expect(isInlineImage("image/svg+xml")).toBe(false);
    expect(isInlineImage("application/pdf")).toBe(false);
    expect(isInlineImage("")).toBe(false);
  });
});

describe("safeAttachmentName", () => {
  it("경로와 제어문자를 떼어 파일 이름만 남긴다", () => {
    expect(safeAttachmentName("C:\\Users\\me\\포스터.png")).toBe("포스터.png");
    expect(safeAttachmentName("../../etc/passwd")).toBe("passwd");
    expect(safeAttachmentName('a"b\n.pdf')).toBe("ab.pdf");
  });

  it("남는 게 없으면 이름을 하나 준다", () => {
    expect(safeAttachmentName("")).toBe("attachment");
    expect(safeAttachmentName("/")).toBe("attachment");
  });

  it("헤더에 들어갈 길이로 자른다", () => {
    expect(safeAttachmentName(`${"가".repeat(200)}.png`)).toHaveLength(120);
  });
});

describe("formatBytes", () => {
  it("사람이 읽는 단위로 바꾼다", () => {
    expect(formatBytes(512)).toBe("512B");
    expect(formatBytes(2048)).toBe("2KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0MB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10MB");
  });
});
