"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Mail } from "lucide-react";
import type { GuestDraft } from "@/lib/guest-draft";
import { createClient } from "@/lib/supabase/client";
import { candidateMaterialDraftSchema } from "@/domain/candidate-material";
import { createCoverLetterQuestion } from "@/domain/cover-letter-question";
import styles from "./application-case-handoff.module.css";

type Props = { guest: GuestDraft | null };

const emptyMaterials = {
  schemaVersion: "1.0" as const,
  freeformNotes: "",
  freeformAttachments: [],
  experiences: [],
  profileEntries: [],
};

export function ApplicationCaseHandoff({ guest }: Props) {
  const [email, setEmail] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [savedAnalysisRunId, setSavedAnalysisRunId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setAuthenticated(Boolean(data.user)));
  }, []);

  async function sendLoginLink() {
    if (!email.trim()) {
      setMessage("로그인 링크를 받을 이메일을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/analysis/prepare`,
      },
    });
    setBusy(false);
    setMessage(error ? "로그인 링크를 보내지 못했습니다." : "이메일로 로그인 링크를 보냈습니다.");
  }

  async function saveApplicationCase() {
    if (!guest) {
      setMessage("저장할 입력 내용을 찾지 못했습니다.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const postingText = sessionStorage.getItem("mooa:guest-job-posting:v1") ?? "";
      const postingSourceRaw = sessionStorage.getItem("mooa:guest-job-posting-source:v1");
      const materialRaw = sessionStorage.getItem("mooa:guest-candidate-materials:v1");
      const postingSource: unknown = postingSourceRaw ? JSON.parse(postingSourceRaw) : {};
      const source = postingSource && typeof postingSource === "object" ? postingSource as Record<string, unknown> : {};
      const materialParsed = candidateMaterialDraftSchema.safeParse(materialRaw ? JSON.parse(materialRaw) : emptyMaterials);
      const questions = guest.questions ?? (guest.questionDrafts ?? [guest.draftText])
        .map((answer, index) => createCoverLetterQuestion(answer, index));

      const response = await fetch("/api/application-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "새 지원서",
          product: guest.selectedProduct ?? "QUICK",
          writingMode: guest.temporaryWritingMode ?? "POLISH",
          writingStyle: guest.writingStyle,
          targetLength: guest.targetLength,
          questions,
          sourceFilename: guest.sourceFilename,
          jobPosting: {
            text: typeof source.text === "string" ? source.text : postingText,
            url: typeof source.url === "string" ? source.url : "",
            filenames: Array.isArray(source.filenames)
              ? source.filenames.filter((item): item is string => typeof item === "string")
              : [],
          },
          candidateMaterials: materialParsed.success ? materialParsed.data : emptyMaterials,
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "지원 건을 저장하지 못했습니다.";
        setMessage(errorMessage);
        return;
      }
      if (result && typeof result === "object" && "applicationCaseId" in result && typeof result.applicationCaseId === "string") {
        setSavedCaseId(result.applicationCaseId);
        if ("analysisRunId" in result && typeof result.analysisRunId === "string") {
          setSavedAnalysisRunId(result.analysisRunId);
        }
        setMessage("지원 건과 분석 Snapshot을 비공개로 저장했습니다.");
      }
    } catch {
      setMessage("브라우저 입력을 저장하는 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (savedCaseId) {
  async function startQuickCheckout() {
    if (!savedAnalysisRunId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkouts/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisRunId: savedAnalysisRunId }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error
          : "결제 페이지를 만들지 못했습니다.";
        setMessage(errorMessage);
        return;
      }
      if (!result || typeof result !== "object" || !("checkoutUrl" in result) || typeof result.checkoutUrl !== "string") {
        setMessage("결제 페이지 주소를 확인하지 못했습니다.");
        return;
      }
      window.location.assign(result.checkoutUrl);
    } catch {
      setMessage("결제 페이지로 연결하는 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

    return <div className={styles.action}><div className={styles.saved}><CheckCircle2/><span><b>비공개 저장 완료</b><small>지원 건 ID · {savedCaseId}</small></span></div>{(guest?.selectedProduct ?? "QUICK") === "QUICK" && savedAnalysisRunId && <button type="button" disabled={busy} onClick={() => void startQuickCheckout()}>{busy ? "결제 페이지 준비 중..." : "결제하고 분석 시작"} <ArrowRight/></button>}{message && <p>{message}</p>}</div>;
  }

  if (authenticated) {
    return <div className={styles.action}><button type="button" disabled={busy || !guest} onClick={() => void saveApplicationCase()}>{busy ? "저장 중..." : "지원 건 비공개 저장"} <ArrowRight/></button>{message && <p>{message}</p>}</div>;
  }

  return <div className={styles.login}>
    <label><Mail/><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일 주소"/></label>
    <button type="button" disabled={busy} onClick={() => void sendLoginLink()}>{busy ? "전송 중..." : "로그인 링크 받기"} <ArrowRight/></button>
    {message && <p>{message}</p>}
  </div>;
}
