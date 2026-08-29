import { describe, expect, it } from "vitest";
import {
  MAX_SINGLE_UPLOAD_BYTES,
  MAX_TOTAL_UPLOAD_BYTES,
  MAX_UPLOAD_FILES,
  checkUploads,
  describeRejections,
  formatBytes,
} from "./upload-limits";

function fake(name: string, bytes: number): File {
  return { name, size: bytes } as File;
}

const MB = 1024 * 1024;

describe("업로드 한도", () => {
  it("지원하지 않는 형식은 이름을 대고 거절한다", () => {
    const { accepted, rejected } = checkUploads([fake("자소서.hwp", 1000), fake("자소서.pdf", 1000)], { count: 0, bytes: 0 });
    expect(accepted.map((file) => file.name)).toEqual(["자소서.pdf"]);
    expect(rejected[0]).toEqual({ name: "자소서.hwp", reason: "지원하지 않는 형식" });
  });

  it("한 파일 상한은 실제로 읽을 수 있는 크기에 맞춘다", () => {
    // extractLocalDocument refuses anything larger, so a bigger promise here
    // would be a promise that throws on read.
    expect(MAX_SINGLE_UPLOAD_BYTES).toBe(10 * MB);
    const { rejected } = checkUploads([fake("큰파일.pdf", 11 * MB)], { count: 0, bytes: 0 });
    expect(rejected[0].reason).toContain("한 파일");
  });

  it("나쁜 파일 하나 때문에 나머지를 버리지 않는다", () => {
    // Dropping a folder should add what it can and name what it could not.
    const { accepted, rejected } = checkUploads(
      [fake("a.pdf", 1000), fake("b.exe", 1000), fake("c.docx", 1000)],
      { count: 0, bytes: 0 },
    );
    expect(accepted).toHaveLength(2);
    expect(rejected).toHaveLength(1);
  });

  it("이미 들어 있는 것까지 합쳐 센다", () => {
    const { accepted, rejected } = checkUploads([fake("하나더.pdf", 1000)], { count: MAX_UPLOAD_FILES, bytes: 0 });
    expect(accepted).toHaveLength(0);
    expect(rejected[0].reason).toContain(`${MAX_UPLOAD_FILES}개`);
  });

  it("총 용량을 넘으면 넘긴 파일부터 거절한다", () => {
    const { accepted, rejected } = checkUploads(
      [fake("a.pdf", 9 * MB), fake("b.pdf", 9 * MB)],
      { count: 0, bytes: MAX_TOTAL_UPLOAD_BYTES - 10 * MB },
    );
    expect(accepted.map((file) => file.name)).toEqual(["a.pdf"]);
    expect(rejected[0].reason).toContain("총");
  });

  it("사람이 읽는 크기로 적는다", () => {
    expect(formatBytes(50 * MB)).toBe("50MB");
    expect(formatBytes(1536 * 1024)).toBe("1.5MB");
    expect(formatBytes(20 * 1024)).toBe("20KB");
  });

  it("거절 사유를 한 줄로 모은다", () => {
    expect(describeRejections([])).toBe("");
    expect(describeRejections([{ name: "a.hwp", reason: "지원하지 않는 형식" }])).toBe("a.hwp (지원하지 않는 형식)");
  });
});
