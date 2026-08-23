"use client";

import { useState } from "react";
import { FileText, LoaderCircle, Paperclip, X } from "lucide-react";
import type { CandidateFreeformAttachment } from "@/domain/candidate-material";
import styles from "./additional-info-input.module.css";

const EXPERIENCE_PLACEHOLDER = "예) 편의점 야간 아르바이트 8개월 동안 재고관리와 교대 인수인계를 했습니다.\n일본에서 3개월 생활했고, 학교 축제 때 부스를 운영했습니다.";

type Props = {
  text: string;
  attachments: CandidateFreeformAttachment[];
  onTextChange: (value: string) => void;
  onAttachmentsChange: (value: CandidateFreeformAttachment[]) => void;
  /**
   * Typing and dropping files onto one box suits any "tell us more, attach
   * what you have" moment, not only the additional-experience one this was
   * written for. Both default to the original wording, so existing call sites
   * are untouched.
   */
  placeholder?: string;
  label?: string;
  /**
   * Off where a labelled uploader (`MaterialUpload`) sits alongside this box.
   * A file dropped here carries no kind, and the prompt then reads a résumé as
   * "포트폴리오·추가 경험" — so where kinds matter, files must not have a
   * second, unlabelled way in. Defaults on; existing call sites are untouched.
   */
  allowAttachments?: boolean;
};

export function AdditionalInfoInput({
  text,
  attachments,
  onTextChange,
  onAttachmentsChange,
  placeholder = EXPERIENCE_PLACEHOLDER,
  label,
  allowAttachments = true,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    if (attachments.length + files.length > 10) {
      setError("첨부파일은 최대 10개까지 추가할 수 있어요.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { extractLocalDocument } = await import("@/lib/local-document");
      const extracted = await Promise.all(files.map(extractLocalDocument));
      const next = extracted.map((file) => ({
        filename: file.filename,
        extension: file.extension,
        sizeBytes: file.sizeBytes,
        text: file.text,
      }));
      const names = new Set(attachments.map((file) => file.filename));
      onAttachmentsChange([...attachments, ...next.filter((file) => !names.has(file.filename))]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "파일을 읽지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  const attachmentCharacters = attachments.reduce(
    (total, file) => total + file.text.replace(/\s/g, "").length,
    0,
  );

  return (
    <div
      className={styles.composer + (dragging ? " " + styles.dragging : "")}
      // Without the drop handlers a file dragged here lands as a browser
      // navigation. With them but no uploader, it lands unlabelled. Off means
      // off: the drop is refused so it goes to the labelled uploader instead.
      onDragEnter={allowAttachments ? (event) => { event.preventDefault(); setDragging(true); } : undefined}
      onDragOver={allowAttachments ? (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } : undefined}
      onDragLeave={allowAttachments ? (event) => { if (event.currentTarget === event.target) setDragging(false); } : undefined}
      onDrop={allowAttachments ? (event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); } : undefined}
    >
      {allowAttachments && attachments.length > 0 && (
        <div className={styles.files}>
          {attachments.map((file) => (
            <span key={file.filename}>
              <FileText/>
              <b>{file.filename}</b>
              <small>{Math.ceil(file.sizeBytes / 1024).toLocaleString()}KB</small>
              <button type="button" aria-label={`${file.filename} 제거`} onClick={() => onAttachmentsChange(attachments.filter((item) => item.filename !== file.filename))}><X/></button>
            </span>
          ))}
        </div>
      )}
      <textarea
        rows={3}
        maxLength={12000}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
      />
      <footer>
        {allowAttachments && <>
          <label aria-disabled={busy}>
            {busy ? <LoaderCircle className={styles.spin}/> : <Paperclip/>}
            {busy ? "파일 읽는 중" : "파일 첨부"}
            <input type="file" accept=".pdf,.docx,.txt,.md" multiple disabled={busy} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }}/>
          </label>
          <p className={styles.fileHint}>PDF · DOCX · TXT · MD 지원 · 스캔 PDF/JPG/PNG는 결제 후 문서 인식 예정<br/>파일을 끌어다 놓거나 첨부 버튼으로 올릴 수 있어요. 파일에 따라 추출이 제한될 수 있어 중요한 내용은 직접 입력해 주세요.</p>
        </>}
        <span>직접 입력 {text.length.toLocaleString()}자 <small>최대 12,000자</small>{allowAttachments && attachmentCharacters > 0 ? ` · 첨부 원문 ${attachmentCharacters.toLocaleString()}자` : ""}</span>
      </footer>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
