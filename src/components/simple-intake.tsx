"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Check, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import {
  CLASSIFIED_KIND_LABEL,
  CLASSIFIED_KIND_ORDER,
  classifyDocument,
  summarizeClassification,
  type ClassifiedKind,
  type ClassifiedItem,
} from "@/domain/document-classify";
import { countNonWhitespaceCharacters } from "@/domain/usage-entitlement";
import styles from "./simple-intake.module.css";

/**
 * 간편 입력 — one box for everything, sorted afterwards.
 *
 * The detailed screen asks the applicant to file each document into the right
 * slot before it will do anything. That is work the product should be doing:
 * they already know what their files are, and putting them in the right box
 * teaches them nothing and takes a minute.
 *
 * So: paste or drop, and the classification is shown back as a list they can
 * correct. The correction step is the part that makes this a product rather
 * than a chat window — a guess nobody can see or fix is worse than no guess.
 *
 * Nothing here calls a model. Classification is filename and heading patterns,
 * which costs nothing and runs before payment, where a paid call would be
 * spending money on people who never buy.
 */

export type SimpleIntakeFile = {
  id: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  text: string;
  kind: ClassifiedKind;
  basis: ClassifiedItem["basis"];
};

type Props = {
  draft: string;
  onDraftChange: (value: string) => void;
  files: SimpleIntakeFile[];
  onFilesChange: (files: SimpleIntakeFile[]) => void;
  onError?: (message: string) => void;
};

export function SimpleIntake({ draft, onDraftChange, files, onFilesChange, onError }: Props) {
  const [busy, setBusy] = useState(false);

  const summary = useMemo(() => summarizeClassification(files), [files]);
  const draftCharacters = countNonWhitespaceCharacters([draft]);

  async function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    if (!selected.length) return;
    setBusy(true);
    onError?.("");
    try {
      const { extractLocalDocuments } = await import("@/lib/local-document");
      const added: SimpleIntakeFile[] = [];
      for (const file of selected) {
        // ZIP comes back as several documents, which is the point of accepting
        // it: the applicant compresses a folder rather than picking files.
        const batch = await extractLocalDocuments(file);
        for (const document of batch.documents) {
          const guess = classifyDocument({ filename: document.filename, text: document.text });
          added.push({
            id: `${document.filename}-${document.sizeBytes}-${added.length}-${Date.now()}`,
            filename: document.filename,
            extension: document.extension,
            sizeBytes: document.sizeBytes,
            text: document.text,
            kind: guess.kind,
            basis: guess.basis,
          });
        }
      }
      // Same name and same size twice is the same file twice — someone dropped
      // a folder and then the folder again.
      const seen = new Set(files.map((file) => `${file.filename}:${file.sizeBytes}`));
      onFilesChange([...files, ...added.filter((file) => {
        const key = `${file.filename}:${file.sizeBytes}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })]);
    } catch (reason) {
      onError?.(reason instanceof Error ? reason.message : "파일을 읽지 못했어요.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function setKind(id: string, kind: ClassifiedKind) {
    // Corrected by hand, so the hint about how it was guessed no longer applies.
    onFilesChange(files.map((file) => file.id === id ? { ...file, kind, basis: "filename" } : file));
  }

  return <section className={styles.intake}>
    <div className={styles.box}>
      <div className={styles.boxHead}>
        <h3>지원 자료를 한 번에 넣어주세요</h3>
        <p>자기소개서 내용을 직접 입력하거나 붙여넣으세요. 파일은 아래에서 선택할 수 있습니다.</p>
      </div>
      <textarea
        rows={10}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        placeholder={"자기소개서 전체를 그대로 붙여넣어 주세요.\n\n1. 지원 동기\n작성한 답변...\n\n2. 직무 역량\n작성한 답변..."}
      />
      <div className={styles.boxFoot}>
        <span>공백 제외 {draftCharacters.toLocaleString()}자</span>
        <label className={styles.attach}>
          {busy ? <Loader2 className={styles.spin}/> : <Paperclip/>}
          {busy ? "파일 확인 중" : "파일 추가"}
          <input type="file" multiple accept=".pdf,.docx,.txt,.md,.zip" onChange={addFiles} disabled={busy}/>
        </label>
      </div>
      <small className={styles.formats}>PDF · DOCX · TXT · MD · ZIP 압축파일도 지원하며, 중복 파일은 자동으로 제외됩니다.</small>
    </div>

    {files.length > 0 && <div className={styles.sorted}>
      <div className={styles.sortedHead}>
        <b><Check/> 자료를 정리했습니다.</b>
        <span>{summary.map((row) => `${row.label} · ${row.count}개`).join("　")}</span>
      </div>
      <ul className={styles.fileList}>
        {files.map((file) => <li key={file.id}>
          <FileText/>
          <div>
            <b>{file.filename}</b>
            <small>
              {file.extension.toUpperCase()} · {(file.sizeBytes / 1024).toFixed(0)}KB
              {/* Says how it guessed, so a wrong row is obvious rather than
                  something the applicant has to read every line to catch. */}
              {file.basis === "content" && " · 내용을 보고 분류"}
            </small>
          </div>
          <select value={file.kind} onChange={(event) => setKind(file.id, event.target.value as ClassifiedKind)} aria-label={`${file.filename} 자료 종류`}>
            {CLASSIFIED_KIND_ORDER.map((kind) => <option key={kind} value={kind}>{CLASSIFIED_KIND_LABEL[kind]}</option>)}
          </select>
          <button type="button" onClick={() => onFilesChange(files.filter((item) => item.id !== file.id))} aria-label={`${file.filename} 빼기`}><Trash2/></button>
        </li>)}
      </ul>
      <p className={styles.sortedNote}>분류가 다르면 오른쪽에서 바꿔 주세요. 이 분류에 따라 각 자료를 어떻게 읽을지가 달라집니다.</p>
    </div>}
  </section>;
}
