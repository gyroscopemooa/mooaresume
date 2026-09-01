"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import styles from "../admin.module.css";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS_TOTAL_BYTES,
  attachmentCheckMessage,
  checkAttachments,
  formatBytes,
  isInlineImage,
} from "@/domain/mail-attachments";

/**
 * The same send flow as `/MAIL`, on the console's own gate and styling.
 *
 * `/MAIL` is left in place and still works; this is a second entrance to the
 * one `/api/mail/send` route, not a replacement for it. Files are picked here
 * only — `/MAIL` keeps posting the plain JSON it always posted.
 */
/** 파일 목록이 실제로 달라졌는지 보는 값. 이름과 크기면 충분합니다. */
function signatureOf(files: File[]): string {
  return files.map((file) => `${file.name}:${file.size}`).join("|");
}

export function MailComposer({ campaignId, initialSubject = "", initialBody = "", initialFiles }: {
  /** 캠페인에서 열렸으면 발송 기록이 그 캠페인에 묶입니다. */
  campaignId?: string;
  initialSubject?: string;
  initialBody?: string;
  /**
   * 팜플렛 PNG와 코드 CSV처럼, 캠페인 화면이 붙여 주는 파일.
   *
   * **첫 렌더에만 읽으면 안 됩니다.** 팜플렛은 캔버스에 그린 뒤에야 파일이
   * 되므로 이 화면이 이미 뜬 **다음에** 도착합니다. `useState`의 초깃값으로만
   * 받던 동안에는, 캠페인 화면의 "첨부 1개"는 파일을 세고 있는데 정작 보내는
   * 쪽은 빈 목록이었습니다 — 붙은 것처럼 보이고 안 붙어 나갔습니다.
   */
  initialFiles?: File[];
} = {}) {
  const [to, setTo] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [files, setFiles] = useState<File[]>(initialFiles ?? []);
  // 부모가 넘긴 목록이 실제로 바뀔 때만 반영합니다. 부모는 렌더마다 새 배열을
  // 만들기 때문에, 배열 자체가 아니라 내용을 봐야 합니다.
  const appliedSignature = useRef(signatureOf(initialFiles ?? []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const filePicker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const incoming = initialFiles ?? [];
    const signature = signatureOf(incoming);
    if (signature === appliedSignature.current) return;
    appliedSignature.current = signature;
    setFiles((current) => {
      // 같은 이름은 새로 온 것으로 갈아 끼웁니다(다른 캠페인을 열면 팜플렛이
      // 다시 그려집니다). 운영자가 직접 고른 파일은 건드리지 않고, 운영자가
      // 지운 자동 첨부는 다시 붙지 않습니다 — 목록이 그대로면 여기까지 오지
      // 않기 때문입니다.
      const arriving = new Set(incoming.map((file) => file.name));
      return [...current.filter((file) => !arriving.has(file.name)), ...incoming];
    });
  }, [initialFiles]);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);

  function clearPicker() {
    // Without this the same file cannot be picked again after removing it:
    // the input's value never changed, so no change event fires.
    if (filePicker.current) filePicker.current.value = "";
  }

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    clearPicker();
    if (picked.length === 0) return;

    // Added to what is already there rather than replacing it, so a second
    // trip to the file dialog does not quietly drop the first pick.
    const next = [...files];
    for (const file of picked) {
      if (!next.some((existing) => existing.name === file.name && existing.size === file.size)) next.push(file);
    }

    const check = checkAttachments(next.map((file) => ({ name: file.name, type: file.type, size: file.size })));
    if (!check.ok) {
      // Refused here rather than after the upload: a 5MB file rejected by the
      // server has already cost the operator the wait.
      setMessage(attachmentCheckMessage(check));
      return;
    }
    setMessage("");
    setFiles(next);
  }

  function removeFile(target: File) {
    setFiles(files.filter((file) => file !== target));
    clearPicker();
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    // multipart rather than JSON: base64-ing the files in the browser first
    // would grow every attachment by a third before it even leaves the machine.
    const form = new FormData();
    form.set("to", to);
    form.set("replyTo", replyTo);
    form.set("subject", subject);
    form.set("body", body);
    for (const file of files) form.append("attachments", file);
    if (campaignId) form.set("campaignId", campaignId);

    const response = await fetch("/api/mail/send", { method: "POST", body: form });
    const result = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(result.error || "메일을 보내지 못했습니다.");
      return;
    }
    if (result.failedRecipients?.length) {
      setMessage(`${result.sent}명에게 보냈습니다. 실패: ${result.failedRecipients.join(", ")}`);
      return;
    }
    setMessage(`${result.sent}명에게 보냈습니다.`);
    // Only cleared on a clean send: with failures on the list, the operator
    // needs the addresses still there to trim and retry.
    setTo("");
    setSubject("");
    setBody("");
    setFiles([]);
    clearPicker();
  }

  return (
    <form className={styles.form} onSubmit={send}>
      <label>
        받는 사람 <small>여러 명은 쉼표·세미콜론·줄바꿈으로 구분, 최대 50명</small>
        <textarea value={to} onChange={(event) => setTo(event.target.value)} rows={3} placeholder="담당자@학교.ac.kr, 담당자2@학교.ac.kr" required />
      </label>
      <label>
        회신 받을 주소 <small>비워두면 기본 회신 주소로 갑니다</small>
        <input type="email" value={replyTo} onChange={(event) => setReplyTo(event.target.value)} placeholder="다른 주소로 답장을 받고 싶을 때만 입력" />
      </label>
      <label>
        제목
        <input value={subject} onChange={(event) => setSubject(event.target.value)} required />
      </label>
      <label>
        본문
        <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={14} placeholder="안녕하세요..." required />
      </label>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>
          첨부파일 <small>최대 {MAX_ATTACHMENTS}개, 하나당 {formatBytes(MAX_ATTACHMENT_BYTES)}, 합쳐서 {formatBytes(MAX_ATTACHMENTS_TOTAL_BYTES)}까지</small>
        </span>
        <input ref={filePicker} className={styles.fileInput} type="file" multiple onChange={addFiles} disabled={busy} />
        <p className={styles.hint}>PNG·JPG·GIF·WEBP 사진은 본문 아래에 바로 보이게 넣고, 첨부파일로도 함께 갑니다. 그 밖의 파일은 첨부파일로만 갑니다.</p>
        {files.length > 0 && (
          <ul className={styles.fileList}>
            {files.map((file) => (
              <li key={`${file.name}-${file.size}`}>
                <span className={styles.wrap}>{file.name}</span>
                <small>{formatBytes(file.size)}{isInlineImage(file.type) ? " · 본문에 표시" : ""}</small>
                <button type="button" onClick={() => removeFile(file)} disabled={busy}>빼기</button>
              </li>
            ))}
            <li className={styles.fileTotal}>
              <span>합계 {files.length}개</span>
              <small>{formatBytes(totalBytes)}</small>
            </li>
          </ul>
        )}
      </div>

      <button disabled={busy}>{busy ? "보내는 중..." : "메일 보내기"}</button>
      {files.length > 0 && <p className={styles.hint}>첨부파일은 받는 사람 한 명당 한 번씩 올라갑니다. 인원이 많으면 발송이 오래 걸릴 수 있으니 창을 닫지 마세요.</p>}
      {message && <p className={styles.formMessage}>{message}</p>}
    </form>
  );
}
