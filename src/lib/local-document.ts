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
    throw new Error("압축파일 안에서 읽을 수 있는 문서를 찾지 못했어요. PDF·DOCX·TXT·MD만 읽을 수 있습니다.");
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
  if (!normalized) throw new Error("파일에서 작성 내용을 찾지 못했어요. 직접 입력을 이용해 주세요.");
  return {
    filename: file.name,
    extension: extension ?? "",
    sizeBytes: file.size,
    text: normalized,
    characterCount: normalized.replace(/\s/g, "").length,
  };
}
