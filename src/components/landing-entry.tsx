"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Upload } from "lucide-react";
import { decideWritingMode } from "@/domain/writing-mode";
import { saveGuestDraft } from "@/lib/guest-draft";
import { extractLocalDocument } from "@/lib/local-document";
import { AttachmentCard } from "./attachment-card";
import styles from "./landing-entry.module.css";

type AttachedFile = {
  filename: string;
  extension: string;
  sizeBytes: number;
};

export function LandingEntry() {
  const router = useRouter();
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

  function continueWithDraft() {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      saveGuestDraft({ draftText: "", targetLength: 700, temporaryWritingMode: "CREATE" });
      router.push("/onboarding?from=landing&empty=1");
      return;
    }

    const decision = decideWritingMode({ draft: trimmedDraft, targetLength: 700, hasJobPosting: true });
    saveGuestDraft({
      draftText: trimmedDraft,
      targetLength: 700,
      sourceFilename: attachedFile?.filename,
      sourceFileExtension: attachedFile?.extension,
      sourceFileSizeBytes: attachedFile?.sizeBytes,
      temporaryWritingMode: decision.mode,
    });
    router.push("/onboarding?from=landing");
  }

  const hasDraft = Boolean(draft.trim());

  return <div className={styles.wrap}>
    {attachedFile && <AttachmentCard {...attachedFile} onRemove={() => setAttachedFile(null)} />}
    <div className={styles.inputBox}>
      <textarea
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError("");
        }}
        rows={6}
        placeholder="작성한 자기소개서가 있다면 붙여넣어 보세요. 없어도 바로 시작할 수 있어요."
      />
      <div className={styles.meta}>
        <label><Upload />{busy ? "파일 확인 중..." : attachedFile ? "파일 교체" : "파일 첨부"}<input type="file" accept=".pdf,.docx,.txt,.md" onChange={selectFile} disabled={busy} /></label>
        <span>{attachedFile ? "원본과 추출 내용을 함께 유지" : "PDF · DOCX · TXT · MD"}</span>
        <small>공백 제외 {draft.replace(/\s/g, "").length.toLocaleString()}자</small>
      </div>
    </div>
    {error && <p className={styles.error}>{error}</p>}
    <button type="button" className={styles.primary} onClick={continueWithDraft}>
      {hasDraft ? "내 지원서 무료로 확인하기" : "무료로 시작하기"}<ArrowRight />
    </button>
    <div className={styles.sub}><span><LockKeyhole /> 로그인 없이 시작 · 결제 전 AI 호출 없음</span></div>
  </div>;
}
