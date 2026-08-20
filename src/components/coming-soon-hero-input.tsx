"use client";

import { ChangeEvent, useState } from "react";
import { ArrowRight, LockKeyhole, Upload } from "lucide-react";
import { decideWritingMode } from "@/domain/writing-mode";
import { saveGuestDraft } from "@/lib/guest-draft";
import { AttachmentCard } from "./attachment-card";
import styles from "./coming-soon-hero-input.module.css";

type AttachedFile = {
  filename: string;
  extension: string;
  sizeBytes: number;
};

export function ComingSoonHeroInput() {
  const [draft, setDraft] = useState("");
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { extractLocalDocument } = await import("@/lib/local-document");
      const extracted = await extractLocalDocument(file);
      setDraft(extracted.text);
      setAttachedFile({
        filename: extracted.filename,
        extension: extracted.extension,
        sizeBytes: extracted.sizeBytes,
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "파일을 읽지 못했어요. 내용을 직접 붙여넣어 주세요.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  // The public landing remains a waitlist during pre-launch, but preserve the
  // draft in the same session-backed format used by the live intake flow.
  // At launch the CTA can switch to onboarding without losing what the user
  // pasted or extracted from their file.
  function preserveDraftForLaunch() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      saveGuestDraft({ draftText: "", targetLength: 700, temporaryWritingMode: "CREATE" });
      return;
    }

    const decision = decideWritingMode({
      draft: trimmedDraft,
      targetLength: 700,
      hasJobPosting: true,
    });
    saveGuestDraft({
      draftText: trimmedDraft,
      targetLength: 700,
      sourceFilename: attachedFile?.filename,
      sourceFileExtension: attachedFile?.extension,
      sourceFileSizeBytes: attachedFile?.sizeBytes,
      temporaryWritingMode: decision.mode,
    });
  }

  return (
    <div className={styles.wrap}>
      {attachedFile && <AttachmentCard {...attachedFile} onRemove={() => setAttachedFile(null)} />}
      <div className={styles.inputBox}>
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setError("");
          }}
          rows={6}
          placeholder="자소서 내용을 붙여넣어 보세요"
        />
        <div className={styles.meta}>
          <label>
            <Upload />
            {busy ? "파일 확인 중..." : attachedFile ? "파일 교체" : "파일 첨부"}
            <input type="file" accept=".pdf,.docx,.txt,.md" onChange={selectFile} disabled={busy} />
          </label>
          <span>PDF · DOCX · TXT · MD (HWP 지원 예정)</span>
          <small>공백 제외 {draft.replace(/\s/g, "").length.toLocaleString()}자</small>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <a href="#waitlist" className={styles.primary} onClick={preserveDraftForLaunch}>
        무료 진단 시작하기 <ArrowRight />
      </a>
      <div className={styles.sub}>
        <span><LockKeyhole /> 현재 정식 AI 진단 기능을 준비하고 있습니다 · 출시 알림을 받아보세요</span>
      </div>
    </div>
  );
}
