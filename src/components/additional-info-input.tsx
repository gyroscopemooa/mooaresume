"use client";

import { useState } from "react";
import { FileText, LoaderCircle, Paperclip, X } from "lucide-react";
import type { CandidateFreeformAttachment } from "@/domain/candidate-material";
import { ARCHIVE_DOCUMENT_ACCEPT } from "@/lib/local-document";
import styles from "./additional-info-input.module.css";

const MAX_ATTACHMENTS = 10;

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
};

export function AdditionalInfoInput({
  text,
  attachments,
  onTextChange,
  onAttachmentsChange,
  placeholder = EXPERIENCE_PLACEHOLDER,
  label,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function addFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (!files.length) return;
    // Counted again after extraction: a zip passes this as one file and can
    // unpack into twenty.
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setError(`첨부파일은 최대 ${MAX_ATTACHMENTS}개까지 추가할 수 있어요.`);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { extractLocalDocuments } = await import("@/lib/local-document");
      // A zip unpacks into several attachments, so one dropped file is not one
      // result any more.
      const batches = await Promise.all(files.map(extractLocalDocuments));
      const next = batches.flatMap((batch) => batch.documents).map((file) => ({
        filename: file.filename,
        extension: file.extension,
        sizeBytes: file.sizeBytes,
        text: file.text,
      }));
      const names = new Set(attachments.map((file) => file.filename));
      const fresh = next.filter((file) => !names.has(file.filename));
      const room = MAX_ATTACHMENTS - attachments.length;
      onAttachmentsChange([...attachments, ...fresh.slice(0, room)]);

      // Naming what was left out is the point. A zip that quietly loses the
      // 경력기술서 inside it is worse than one that refuses to open, because
      // the applicant has no way to notice before paying.
      const skipped = [
        ...batches.flatMap((batch) => batch.skipped),
        ...fresh.slice(room).map((file) => file.filename),
      ];
      setError(skipped.length > 0
        ? `읽지 못했거나 개수 제한(${MAX_ATTACHMENTS}개)을 넘어 빠진 파일: ${skipped.join(", ")}`
        : "");
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
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); void addFiles(event.dataTransfer.files); }}
    >
      {attachments.length > 0 && (
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
        <label aria-disabled={busy}>
          {busy ? <LoaderCircle className={styles.spin}/> : <Paperclip/>}
          {busy ? "파일 읽는 중" : "파일 첨부"}
          <input type="file" accept={ARCHIVE_DOCUMENT_ACCEPT} multiple disabled={busy} onChange={(event) => { void addFiles(event.target.files); event.target.value = ""; }}/>
        </label>
      {/* The zip line promises less than the feature does on purpose: an
          archive is the one upload where the applicant cannot see what got
          through, so what will not make it is named before they try. */}
      <p className={styles.fileHint}>PDF · DOCX · TXT · MD 지원 · 스캔 PDF/JPG/PNG는 결제 후 문서 인식 예정<br/>ZIP은 안에 든 PDF·DOCX·TXT·MD만 꺼내 읽습니다. 암호가 걸려 있거나 HWP·이미지가 들어 있으면 그 파일은 빠지며, 빠진 파일 이름을 알려 드립니다. 꺼낸 파일도 첨부 {MAX_ATTACHMENTS}개 제한에 포함됩니다.<br/>파일을 끌어다 놓거나 첨부 버튼으로 올릴 수 있어요. 파일에 따라 추출이 제한될 수 있어 중요한 내용은 직접 입력해 주세요.</p>
        <span>직접 입력 {text.length.toLocaleString()}자 <small>최대 12,000자</small>{attachmentCharacters > 0 ? ` · 첨부 원문 ${attachmentCharacters.toLocaleString()}자` : ""}</span>
      </footer>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
