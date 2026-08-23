"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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
  materialAttachments: [],
};

const subscribeToNothing = () => () => {};
const readNoAuthError = () => null;
const readAuthError = () => new URLSearchParams(window.location.search).get("auth_error");

export function ApplicationCaseHandoff({ guest }: Props) {
  const [email, setEmail] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [savedAnalysisRunId, setSavedAnalysisRunId] = useState<string | null>(null);
  // A failed sign-in redirects here with the reason in the query string, and
  // nothing was reading it — the visitor saw a plain login screen with no sign
  // their link had just been rejected, so the natural next move was to request
  // another one and hit the same wall.
  const authError = useSyncExternalStore(subscribeToNothing, readAuthError, readNoAuthError);

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

  async function signInWithGoogle() {
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/analysis/prepare`,
      },
    });
    if (error) {
      setBusy(false);
      setMessage("Google 로그인을 초기화하지 못했습니다.");
    }
  }
  async function beginCheckout(analysisRunId: string, product: "QUICK" | "PRO") {
    const response = await fetch(`/api/checkouts/${product.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisRunId }),
    });
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== "object" || !("checkoutUrl" in result) || typeof result.checkoutUrl !== "string") {
      const errorMessage = result && typeof result === "object" && "error" in result && typeof result.error === "string"
        ? result.error
        : "\uACB0\uC81C \uD398\uC774\uC9C0\uB85C \uC5F0\uACB0\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.";
      // The code is for whoever has to fix it, and showing it here saves a
      // trip through server logs that are mostly the cron's own requests. It
      // names a category of failure, never a value.
      const code = result && typeof result === "object" && "code" in result && typeof result.code === "string" ? result.code : null;
      throw new Error(code ? `${errorMessage} (\uC6D0\uC778 \uCF54\uB4DC: ${code})` : errorMessage);
    }
    window.location.assign(result.checkoutUrl);
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
          title: guest.companyName?.trim() || "새 지원서",
          companyName: guest.companyName,
          roleName: guest.roleName,
          product: guest.selectedProduct ?? "QUICK",
          writingMode: guest.temporaryWritingMode ?? "POLISH",
          writingStyle: guest.writingStyle,
          revisionRequest: guest.revisionRequest,
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
        const analysisRunId = "analysisRunId" in result && typeof result.analysisRunId === "string" ? result.analysisRunId : null;
        if (analysisRunId) setSavedAnalysisRunId(analysisRunId);
        setMessage("\uC785\uB825 \uB0B4\uC6A9\uC744 \uBE44\uACF5\uAC1C\uB85C \uC800\uC7A5\uD558\uACE0 \uACB0\uC81C \uD398\uC774\uC9C0\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4.");
        if (analysisRunId) {
          try {
            await beginCheckout(analysisRunId, guest.selectedProduct ?? "QUICK");
          } catch (checkoutError) {
            setMessage(checkoutError instanceof Error ? checkoutError.message : "결제 페이지로 연결하는 중 오류가 발생했습니다.");
          }
        }
      }
    } catch {
      setMessage("브라우저 입력을 저장하는 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (savedCaseId) {
    async function retryCheckout() {
      if (!savedAnalysisRunId) return;
      setBusy(true);
      setMessage("");
      try {
        await beginCheckout(savedAnalysisRunId, guest?.selectedProduct ?? "QUICK");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "결제 페이지로 연결하는 중 오류가 발생했습니다.");
      } finally {
        setBusy(false);
      }
    }

    return <div className={styles.action}><div className={styles.saved}><CheckCircle2/><span><b>{busy ? "결제 페이지로 이동 중..." : "비공개 저장 완료"}</b><small>지원 건 ID · {savedCaseId}</small></span></div>{savedAnalysisRunId && <button type="button" disabled={busy} onClick={() => void retryCheckout()}>{busy ? "결제 페이지 준비 중..." : "결제하고 분석 시작"} <ArrowRight/></button>}{(message || authError) && <p>{message || authError}</p>}</div>;
  }

  if (authenticated) {
    return <div className={styles.action}><button type="button" disabled={busy || !guest} onClick={() => void saveApplicationCase()}>{busy ? "\uC800\uC7A5 \uC911..." : "\uACB0\uC81C\uD558\uACE0 \uBD84\uC11D \uC2DC\uC791"} <ArrowRight/></button>{(message || authError) && <p>{message || authError}</p>}</div>;
  }

  return <div className={styles.login}>
    <button className={styles.oauthButton} type="button" disabled={busy} onClick={() => void signInWithGoogle()}>{"Google\uB85C \uACC4\uC18D\uD558\uAE30"}</button>
    <div className={styles.divider}><span>{"\uB610\uB294 \uC774\uBA54\uC77C\uB85C \uB85C\uADF8\uC778"}</span></div>
    <label><Mail/><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일 주소"/></label>
    <button type="button" disabled={busy} onClick={() => void sendLoginLink()}>{busy ? "전송 중..." : "로그인 링크 받기"} <ArrowRight/></button>
    {(message || authError) && <p>{message || authError}</p>}
  </div>;
}
