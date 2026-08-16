"use client";

const MAX_LOCAL_FILE_BYTES = 10 * 1024 * 1024;

export type LocalDocumentResult = {
  filename: string;
  extension: string;
  sizeBytes: number;
  text: string;
  characterCount: number;
};

export async function extractLocalDocument(file: File): Promise<LocalDocumentResult> {
  if (file.size > MAX_LOCAL_FILE_BYTES) throw new Error("파일은 10MB 이하만 사용할 수 있어요.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  let text = "";

  if (extension === "txt" || extension === "md") {
    text = await file.text();
  } else if (extension === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    text = result.value;
  } else if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
    }
    text = pages.join("\n");
  } else {
    throw new Error("아직 지원하지 않는 파일 형식입니다. PDF·DOCX·TXT로 변환하거나 내용을 직접 붙여넣어 주세요.");
  }

  const normalized = text.trim();
  if (!normalized) throw new Error("파일에서 작성 내용을 찾지 못했어요. 직접 입력을 이용해 주세요.");
  return {
    filename: file.name,
    extension: extension ?? "",
    sizeBytes: file.size,
    text: normalized,
    characterCount: normalized.replace(/\s/g, "").length,
  };
}
