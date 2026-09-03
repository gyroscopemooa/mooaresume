"use client";

import "client-only";
import { joinPdfTextItems, type PdfTextItem } from "./pdf-text-layout";

const MAX_LOCAL_FILE_BYTES = 10 * 1024 * 1024;

/**
 * How much of a zip we are willing to open.
 *
 * Every extracted file becomes prompt input the applicant pays for, and an
 * archive can hold far more than anyone means to submit — a whole 취업 folder,
 * or an accidental export. The cap is a refusal to spend their money on files
 * they did not choose one by one; what is left out is named, never dropped
 * quietly.
 */
export const MAX_ZIP_ENTRIES = 20;
export const READABLE_EXTENSIONS = ["pdf", "docx", "txt", "md"] as const;

/** What the file pickers accept. Zip is read by unpacking, not parsed itself. */
export const LOCAL_DOCUMENT_ACCEPT = ".pdf,.docx,.txt,.md";
export const ARCHIVE_DOCUMENT_ACCEPT = ".pdf,.docx,.txt,.md,.zip";

function extensionOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function isReadable(name: string) {
  return (READABLE_EXTENSIONS as readonly string[]).includes(extensionOf(name));
}

/**
 * Junk the archiver added, not something the applicant chose to send.
 * macOS writes __MACOSX/ resource forks into every zip made from Finder, and
 * reporting those as "skipped" would bury the files that actually were.
 */
function isArchiveNoise(path: string) {
  const base = path.split("/").pop() ?? path;
  return path.startsWith("__MACOSX/") || base.startsWith(".") || base === "Thumbs.db";
}

export type LocalDocumentResult = {
  filename: string;
  extension: string;
  sizeBytes: number;
  text: string;
  characterCount: number;
  /**
   * 글자가 한 자도 없는 PDF입니다 — 스캔본이거나 사진으로 만든 문서입니다.
   *
   * 예전에는 여기서 거부했습니다. 그런데 자격증·면허증·증명서는 대부분 이
   * 모양입니다. 수첩을 찍었거나 발급기관이 그림으로 만들어 줍니다. 그래서
   * "자격증을 올리려던 사람"이 정확히 거부당하고 있었습니다.
   *
   * 파일은 받고, 무엇인지는 본인에게 묻습니다. 사진을 모델에 보내지 않는
   * 이유는 값과 정확도만이 아닙니다 — 면허증·건강보험 서류에는 주민번호가
   * 찍혀 있고, 그것을 외부로 보내는 것은 다른 이야기입니다.
   */
  unreadable?: boolean;
};

export type LocalDocumentBatch = {
  documents: LocalDocumentResult[];
  /** Entries inside an archive that could not be read, by name. */
  skipped: string[];
};

/**
 * Reads one dropped file, unpacking it first when it is a zip.
 *
 * A zip yields one attachment per readable entry rather than a single blob, so
 * each keeps its own filename and can be removed on its own — an archive the
 * applicant cannot take apart afterwards is worse than the files.
 */
export async function extractLocalDocuments(file: File): Promise<LocalDocumentBatch> {
  if (extensionOf(file.name) !== "zip") {
    return { documents: [await extractLocalDocument(file)], skipped: [] };
  }
  if (file.size > MAX_LOCAL_FILE_BYTES) throw new Error("압축파일은 10MB 이하만 사용할 수 있어요.");

  const JSZip = (await import("jszip")).default;
  let archive;
  try {
    archive = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    // Password-protected archives land here too: JSZip cannot open them and
    // there is nothing the applicant can do from this screen.
    throw new Error("압축파일을 열지 못했어요. 암호가 걸려 있다면 압축을 풀어서 올려 주세요.");
  }

  const entries = Object.values(archive.files)
    .filter((entry) => !entry.dir && !isArchiveNoise(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name, "ko"));

  const readable = entries.filter((entry) => isReadable(entry.name));
  const skipped = entries.filter((entry) => !isReadable(entry.name)).map((entry) => entry.name);
  const withinLimit = readable.slice(0, MAX_ZIP_ENTRIES);
  for (const entry of readable.slice(MAX_ZIP_ENTRIES)) skipped.push(entry.name);

  const documents: LocalDocumentResult[] = [];
  for (const entry of withinLimit) {
    try {
      const blob = await entry.async("blob");
      // The entry path keeps folders apart; the attachment shows the filename.
      documents.push(await extractLocalDocument(new File([blob], entry.name.split("/").pop() ?? entry.name)));
    } catch {
      // One unreadable file inside an archive must not lose the other nineteen.
      skipped.push(entry.name);
    }
  }

  if (documents.length === 0) {
    // 자격증 압축파일은 거의 사진입니다 — 수첩을 찍었거나 발급기관이 그림으로
    // 줍니다. "PDF·DOCX·TXT·MD만 읽을 수 있습니다"는 사실이지만, 사진을 올린
    // 사람에게는 무엇을 어떻게 하라는 말인지 알려 주지 않습니다.
    throw new Error("압축파일 안에서 읽을 수 있는 문서를 찾지 못했어요. 사진(JPG·PNG)은 글자를 읽을 수 없어요 — PDF로 저장해 올리시거나, 자격증 이름을 입력칸에 적어 주세요.");
  }
  return { documents, skipped };
}

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
      // Positioned glyph runs, not text — see joinPdfTextItems for why the
      // old join(" ") both split words and lost every line break.
      pages.push(joinPdfTextItems(content.items as PdfTextItem[]));
    }
    text = pages.join("\n");
  } else {
    throw new Error("아직 지원하지 않는 파일 형식입니다. PDF·DOCX·TXT로 변환하거나 내용을 직접 붙여넣어 주세요.");
  }

  const normalized = text.trim();
  // PDF만 이 길로 옵니다. TXT·DOCX가 비어 있다면 그건 정말 빈 파일이라
  // 받아 봐야 할 것이 없습니다.
  if (!normalized && extension !== "pdf") {
    throw new Error("파일에 내용이 없어요. 다른 파일을 넣거나 직접 붙여넣어 주세요.");
  }
  return {
    filename: file.name,
    extension: extension ?? "",
    sizeBytes: file.size,
    text: normalized,
    characterCount: normalized.replace(/\s/g, "").length,
    ...(normalized ? {} : { unreadable: true }),
  };
}
