import { describe, expect, it } from "vitest";
import { buildDocx } from "./docx";

const decoder = new TextDecoder();

/** Reads a stored (uncompressed) ZIP entry back out, which is all buildDocx writes. */
function readEntry(bytes: Uint8Array, name: string) {
  const encoder = new TextEncoder();
  const target = encoder.encode(name);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 0; offset + 30 <= bytes.length; offset += 1) {
    if (view.getUint32(offset, true) !== 0x04034b50) continue;
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const entryName = bytes.subarray(offset + 30, offset + 30 + nameLength);
    if (entryName.length !== target.length || entryName.some((byte, index) => byte !== target[index])) continue;
    const size = view.getUint32(offset + 18, true);
    const start = offset + 30 + nameLength + extraLength;
    return decoder.decode(bytes.subarray(start, start + size));
  }
  return null;
}

describe("buildDocx", () => {
  const bytes = buildDocx([
    { text: "내 자기소개서", style: "title" },
    { text: "1. 지원동기 <검증> & 포부", style: "heading" },
    { text: "첫 줄입니다.\n둘째 줄입니다.", style: "body" },
  ]);

  it("writes a ZIP holding the three parts Word requires", () => {
    expect(Array.from(bytes.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(readEntry(bytes, "[Content_Types].xml")).toContain("wordprocessingml.document.main+xml");
    expect(readEntry(bytes, "_rels/.rels")).toContain("word/document.xml");
    expect(readEntry(bytes, "word/document.xml")).toContain("<w:body>");
  });

  it("keeps Korean text and escapes XML-significant characters", () => {
    const document = readEntry(bytes, "word/document.xml") ?? "";

    expect(document).toContain("내 자기소개서");
    expect(document).toContain("1. 지원동기 &lt;검증&gt; &amp; 포부");
    expect(document).not.toContain("<검증>");
  });

  it("turns each line into its own paragraph", () => {
    const document = readEntry(bytes, "word/document.xml") ?? "";

    expect(document.split("<w:p>").length - 1).toBe(4);
    expect(document).toContain("첫 줄입니다.");
    expect(document).toContain("둘째 줄입니다.");
  });

  it("justifies body paragraphs but not the title/heading", () => {
    const document = readEntry(bytes, "word/document.xml") ?? "";
    const paragraphs = document.split("<w:p>").slice(1);

    expect(paragraphs[0]).not.toContain("<w:jc");
    expect(paragraphs[1]).not.toContain("<w:jc");
    expect(paragraphs[2]).toContain('<w:jc w:val="both"/>');
  });

  it("keeps a blank line between paragraphs as its own empty paragraph", () => {
    const spaced = buildDocx([{ text: "첫 문단입니다.\n\n둘째 문단입니다.", style: "body" }]);
    const document = readEntry(spaced, "word/document.xml") ?? "";

    expect(document.split("<w:p>").length - 1).toBe(3);
    expect(document).toContain("<w:p><w:pPr><w:spacing w:before=\"0\" w:after=\"200\"");
  });
});
