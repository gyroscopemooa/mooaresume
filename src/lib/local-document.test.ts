// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { extractLocalDocuments, MAX_ZIP_ENTRIES } from "./local-document";

async function zipOf(entries: Record<string, string>) {
  const zip = new JSZip();
  for (const [name, body] of Object.entries(entries)) zip.file(name, body);
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "자료.zip");
}

describe("압축파일 열기", () => {
  it("안에 든 문서를 파일 하나씩으로 꺼낸다", async () => {
    // 하나로 합쳐 버리면 나중에 한 개만 빼는 것이 불가능해진다.
    const batch = await extractLocalDocuments(await zipOf({
      "이력서.txt": "품질 업무 3년",
      "경력기술서.md": "에이텍 재직",
    }));

    expect(batch.documents.map((file) => file.filename)).toEqual(["경력기술서.md", "이력서.txt"]);
    expect(batch.documents.map((file) => file.text)).toEqual(["에이텍 재직", "품질 업무 3년"]);
    expect(batch.skipped).toEqual([]);
  });

  it("폴더 안에 있어도 파일 이름만 남긴다", async () => {
    const batch = await extractLocalDocuments(await zipOf({ "취업준비/이력서.txt": "내용" }));

    expect(batch.documents[0].filename).toBe("이력서.txt");
  });

  it("읽지 못한 파일은 이름을 남긴다", async () => {
    // 조용히 빠지면 지원자는 결제 전에 알아챌 방법이 없다.
    const batch = await extractLocalDocuments(await zipOf({
      "이력서.txt": "내용",
      "증명사진.jpg": "binary",
      "자소서.hwp": "binary",
    }));

    expect(batch.documents).toHaveLength(1);
    expect(batch.skipped).toEqual(["자소서.hwp", "증명사진.jpg"]);
  });

  it("압축 프로그램이 넣은 찌꺼기는 빠졌다고 하지 않는다", async () => {
    // __MACOSX는 지원자가 넣은 파일이 아니다. 빠졌다고 하면 진짜 빠진 파일이
    // 그 목록에 묻힌다.
    const batch = await extractLocalDocuments(await zipOf({
      "이력서.txt": "내용",
      "__MACOSX/._이력서.txt": "junk",
      ".DS_Store": "junk",
    }));

    expect(batch.documents).toHaveLength(1);
    expect(batch.skipped).toEqual([]);
  });

  it("너무 많이 들어 있으면 상한까지만 열고 나머지를 밝힌다", async () => {
    // 파일 하나하나가 지원자가 돈을 내는 프롬프트 입력이 된다.
    const entries = Object.fromEntries(
      Array.from({ length: MAX_ZIP_ENTRIES + 3 }, (_, index) => [`문서${String(index).padStart(2, "0")}.txt`, "내용"]),
    );
    const batch = await extractLocalDocuments(await zipOf(entries));

    expect(batch.documents).toHaveLength(MAX_ZIP_ENTRIES);
    expect(batch.skipped).toHaveLength(3);
  });

  it("읽을 수 있는 문서가 하나도 없으면 왜인지, 그래서 뭘 하면 되는지 말한다", async () => {
    // 자격증 압축파일은 거의 사진입니다. "PDF·DOCX만 됩니다"는 사실이지만
    // 사진을 올린 사람에게는 다음에 뭘 하라는 말이 아닙니다.
    await expect(extractLocalDocuments(await zipOf({ "사진.jpg": "binary" })))
      .rejects.toThrow(/사진\(JPG·PNG\)은 글자를 읽을 수 없어요/);
    await expect(extractLocalDocuments(await zipOf({ "사진.jpg": "binary" })))
      .rejects.toThrow(/PDF로 저장해 올리시거나/);
  });

  it("압축파일이 아니면 그대로 한 개로 읽는다", async () => {
    const batch = await extractLocalDocuments(new File(["품질 업무 3년"], "이력서.txt"));

    expect(batch.documents).toHaveLength(1);
    expect(batch.documents[0].text).toBe("품질 업무 3년");
    expect(batch.skipped).toEqual([]);
  });

  it("열 수 없는 압축파일은 암호 가능성을 안내한다", async () => {
    await expect(extractLocalDocuments(new File(["not a zip at all"], "자료.zip")))
      .rejects.toThrow(/암호가 걸려 있다면/);
  });
});
