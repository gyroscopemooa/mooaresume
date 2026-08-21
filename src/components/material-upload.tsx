"use client";

import { useState } from "react";
import { FileText, LoaderCircle, Upload, X } from "lucide-react";
import {
  CANDIDATE_MATERIAL_LABEL,
  type CandidateMaterialAttachment,
  type CandidateMaterialKind,
} from "@/domain/candidate-material";
import styles from "./material-upload.module.css";

const KINDS: CandidateMaterialKind[] = ["RESUME", "CAREER_DOCUMENT", "PORTFOLIO"];
const MAX_FILES = 10;

type Props = {
  attachments: CandidateMaterialAttachment[];
  onChange: (value: CandidateMaterialAttachment[]) => void;
};

/**
 * Replaces the three disabled placeholder buttons. Filing a résumé under its
 * own kind matters: the analysis prompt labels each document, and anything
 * uploaded as a generic attachment reaches the model as "포트폴리오·추가 경험".
 */
export function MaterialUpload({ attachments, onChange }: Props) {
  const [busyKind, setBusyKind] = useState<CandidateMaterialKind | null>(null);
  const [error, setError] = useState("");

  async function addFiles(kind: CandidateMaterialKind, fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    if (attachments.length + files.length > MAX_FILES) {
      setError(`지원자료는 최대 ${MAX_FILES}개까지 추가할 수 있어요.`);
      return;
    }

    setBusyKind(kind);
    setError("");
    try {
      const { extractLocalDocument } = await import("@/lib/local-document");
      const extracted = await Promise.all(files.map(extractLocalDocument));
      const existing = new Set(attachments.map((file) => `${file.kind}:${file.filename}`));
      const next = extracted
        .map((file) => ({ kind, filename: file.filename, extension: file.extension, sizeBytes: file.sizeBytes, text: file.text }))
        .filter((file) => !existing.has(`${file.kind}:${file.filename}`));
      onChange([...attachments, ...next]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "파일을 읽지 못했어요.");
    } finally {
      setBusyKind(null);
    }
  }

  return <div className={styles.upload}>
    <div className={styles.buttons}>
      {KINDS.map((kind) => <label key={kind} data-busy={busyKind === kind}>
        {busyKind === kind ? <LoaderCircle className={styles.spin}/> : <Upload/>}
        {CANDIDATE_MATERIAL_LABEL[kind]} <small>선택</small>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          multiple
          disabled={busyKind !== null}
          onChange={(event) => { void addFiles(kind, event.target.files); event.target.value = ""; }}
        />
      </label>)}
    </div>

    {attachments.length > 0 && <ul className={styles.list}>
      {attachments.map((file) => <li key={`${file.kind}:${file.filename}`}>
        <FileText/>
        <span><b>{file.filename}</b><small>{CANDIDATE_MATERIAL_LABEL[file.kind]} · {(file.sizeBytes / 1024).toFixed(0)}KB</small></span>
        <button
          type="button"
          aria-label={`${file.filename} 삭제`}
          onClick={() => onChange(attachments.filter((item) => !(item.kind === file.kind && item.filename === file.filename)))}
        ><X/></button>
      </li>)}
    </ul>}

    {error && <p className={styles.error}>{error}</p>}
    <p className={styles.hint}>PDF · DOCX · TXT · MD를 읽습니다. 여기에 올린 자료는 PRO 분석에서만 사용되고, 종류별로 구분해 전달됩니다.</p>
  </div>;
}
