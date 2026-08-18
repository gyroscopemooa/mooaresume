"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { z } from "zod";
import styles from "./quick-checkout-return.module.css";
import { createClient } from "@/lib/supabase/client";

const statusSchema = z.object({
  checkoutId: z.string(),
  checkoutStatus: z.enum(["OPEN", "SUCCEEDED", "EXPIRED"]),
  analysisRunId: z.string().uuid(),
  analysisStatus: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]),
  entitlementStatus: z.enum(["ACTIVE", "CONSUMED", "REVOKED"]).nullable(),
  hasResult: z.boolean(),
  timeoutRefunded: z.boolean().optional(),
  retryAvailable: z.boolean().optional(),
});

type Phase = "idle" | "waiting" | "analyzing" | "failed";
const MAX_POLLS = 45;

const formatElapsed = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

export function QuickCheckoutReturn() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [retryRunId, setRetryRunId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);
  const executing = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    const checkoutId = url.searchParams.get("checkout_id");
    startedAt.current = Date.now();
    if (!checkoutId) {
      queueMicrotask(() => {
        setPhase("failed");
        setMessage("결제 완료 정보를 확인하고 있습니다. 이 화면을 닫거나 나가도 괜찮습니다. 결제가 확인되면 분석을 자동으로 시작합니다.");
      });
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function poll(attempt: number) {
      if (cancelled) return;
      if (attempt === 0) {
        setPhase("waiting");
        setMessage("결제 완료 정보를 확인하고 있습니다. 이 화면을 닫거나 나가도 괜찮습니다. 결제가 확인되면 분석을 자동으로 시작합니다.");
      }

      try {
        const response = await fetch(
          `/api/checkouts/quick/status?checkoutId=${encodeURIComponent(checkoutId!)}`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          if (attempt < MAX_POLLS) {
            timer = window.setTimeout(() => void poll(attempt + 1), 2000);
            return;
          }
          throw new Error("CHECKOUT_STATUS_TIMEOUT");
        }

        const status = statusSchema.parse(await response.json());
        if (status.hasResult || status.analysisStatus === "COMPLETED") {
          window.location.replace(`/result?analysisRunId=${status.analysisRunId}`);
          return;
        }
        if (status.analysisStatus === "FAILED" || status.entitlementStatus === "REVOKED") {
          setPhase("failed");
          if (status.timeoutRefunded) {
            setMessage("\uBD84\uC11D\uC774 10\uBD84\uC744 \uCD08\uACFC\uD574 \uC790\uB3D9\uC73C\uB85C \uC885\uB8CC\uD558\uACE0 \uD658\uBD88\uC744 \uC694\uCCAD\uD588\uC2B5\uB2C8\uB2E4.");
            return;
          }
          if (status.retryAvailable) {
            setRetryRunId(status.analysisRunId);
            setMessage("\uACB0\uC81C\uB294 \uB2E4\uC2DC \uD558\uC9C0 \uC54A\uC544\uB3C4 \uB429\uB2C8\uB2E4. \uAE30\uC874 \uACB0\uC81C\uB85C \uBD84\uC11D\uC744 \uD55C \uBC88 \uB2E4\uC2DC \uC2DC\uB3C4\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
            return;
          }
          setMessage("\uBD84\uC11D\uC744 \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uACB0\uC81C\uB294 \uB2E4\uC2DC \uC2DC\uB3C4\uD558\uC9C0 \uB9C8\uC138\uC694.");
          return;
        }
        if (status.analysisStatus === "RUNNING") {
          setPhase("analyzing");
          setMessage("결제가 확인되어 AI가 첨삭을 진행하고 있습니다. 화면을 닫아도 작업은 계속됩니다.");
          timer = window.setTimeout(() => void poll(attempt + 1), 2000);
          return;
        }
        if (status.entitlementStatus === "ACTIVE" && !executing.current) {
          executing.current = true;
          setPhase("analyzing");
          setMessage("결제가 확인되어 AI가 첨삭을 진행하고 있습니다. 화면을 닫아도 작업은 계속됩니다.");
          const executeResponse = await fetch("/api/analysis-runs/quick/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ analysisRunId: status.analysisRunId }),
          });
          if (executeResponse.ok) {
            const executed: unknown = await executeResponse.json();
            if (executed && typeof executed === "object" && "resultUrl" in executed && typeof executed.resultUrl === "string") {
              window.location.replace(executed.resultUrl);
              return;
            }
          } else {
            const failure: unknown = await executeResponse.json().catch(() => null);
            const detail = failure && typeof failure === "object" && "detail" in failure && typeof failure.detail === "string"
              ? failure.detail : "ANALYSIS_EXECUTION_FAILED";
            setPhase("failed");
            setMessage(`\uBD84\uC11D\uC744 \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. (${detail})`);
            return;
          }
          executing.current = false;
        }

        if (attempt < MAX_POLLS) {
          timer = window.setTimeout(() => void poll(attempt + 1), 2000);
          return;
        }
        throw new Error("CHECKOUT_RETURN_TIMEOUT");
      } catch {
        if (!cancelled) {
          setPhase("failed");
          setMessage("결제 확인이 지연되고 있습니다. 다시 결제하지 마세요. 결제가 확인되면 분석을 시작하고 결과를 대시보드에 저장합니다.");
        }
      }
    }

    void poll(0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (phase === "idle" || phase === "failed" || startedAt.current === null) return;
    const updateElapsed = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt.current!) / 1000)));
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  async function retryAnalysis() {
    if (!retryRunId || executing.current) return;
    executing.current = true;
    const analysisRunId = retryRunId;
    setRetryRunId(null);
    setPhase("analyzing");
    setMessage("\uAE30\uC874 \uACB0\uC81C\uB85C \uC9C0\uC6D0\uC11C\uB97C \uB2E4\uC2DC \uBD84\uC11D\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4.");
    try {
      const response = await fetch("/api/analysis-runs/quick/execute", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisRunId, retry: true }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (response.ok && payload && typeof payload === "object" && "resultUrl" in payload && typeof payload.resultUrl === "string") {
        window.location.replace(payload.resultUrl);
        return;
      }
      setPhase("failed");
      setMessage("\uC7AC\uBD84\uC11D\uC744 \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
    } finally { executing.current = false; }
  }

  async function requestEmailLink() {
    setEmailBusy(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email;
      if (!email) {
        setMessage("결제 확인이 지연되고 있습니다. 다시 결제하지 마세요. 결제가 확인되면 분석을 시작하고 결과를 대시보드에 저장합니다.");
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/analysis/prepare`,
        },
      });
      setMessage(error ? "이메일 안내를 보내지 못했습니다." : "로그인 링크를 이메일로 보냈습니다. 결제 확인 후 결과를 확인할 수 있습니다.");
    } finally {
      setEmailBusy(false);
    }
  }

  if (phase === "idle") return null;

  return (
    <>
    <section className={styles.status} data-phase={phase}>
      {phase === "failed" ? <TriangleAlert /> : phase === "waiting" ? <LoaderCircle className={styles.spin} /> : <CheckCircle2 />}
      <div>
        <b>{phase === "failed" ? "확인이 필요합니다" : phase === "waiting" ? "결제 확인 중" : "분석 진행 중"}</b>
        <p>{message}</p>
        {phase === "failed" && retryRunId && <button type="button" className={styles.emailButton} onClick={() => void retryAnalysis()}>
          {"\uAE30\uC874 \uACB0\uC81C\uB85C \uB2E4\uC2DC \uBD84\uC11D\uD558\uAE30"}
        </button>}
        {phase === "failed" && <button type="button" className={styles.emailButton} disabled={emailBusy} onClick={() => void requestEmailLink()}>
          {emailBusy ? "전송 중..." : "이메일로 다시 안내받기"}
        </button>}
      </div>
    </section>
    {phase !== "failed" && (
      <section className={styles.progressPanel}>
        <div className={styles.progressHeadline}>
          <strong>{"\uC9C0\uC6D0\uC11C\uB97C \uAF3C\uAF3C\uD558\uAC8C \uBD84\uC11D\uD558\uACE0 \uC788\uC5B4\uC694"}</strong>
          <span>{"\uBCF4\uD1B5 2~5\uBD84 \uC815\uB3C4 \uAC78\uB9BD\uB2C8\uB2E4."}</span>
        </div>
        <div className={styles.progressTrack} role="progressbar" aria-label="analysis"><i /></div>
        <ol className={styles.progressSteps}>
          <li className={phase === "waiting" ? styles.activeStep : ""}>{"\uACB0\uC81C\uC640 \uC9C0\uC6D0\uC790\uB8CC \uD655\uC778"}</li>
          <li className={phase === "analyzing" ? styles.activeStep : ""}>{"\uBB38\uD56D\uBCC4 \uBB38\uC81C\uC810\uACFC \uADFC\uAC70 \uBD84\uC11D"}</li>
          <li>{"\uB0B4 \uACBD\uD5D8\uACFC \uBB38\uD56D \uC5F0\uACB0"}</li>
          <li>{"\uCD5C\uC885 \uCCA8\uC0AD \uACB0\uACFC \uC815\uB9AC"}</li>
        </ol>
        <div className={styles.elapsed}>{formatElapsed(elapsedSeconds)} {"\uACBD\uACFC"}</div>
        {elapsedSeconds >= 300 && <small className={styles.delayed}>{"\uD3C9\uC18C\uBCF4\uB2E4 \uC790\uB8CC\uB97C \uB354 \uAF3C\uAF3C\uD558\uAC8C \uD655\uC778\uD558\uACE0 \uC788\uC5B4\uC694."}</small>}
      </section>
    )}
    </>
  );
}
