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
});

type Phase = "idle" | "waiting" | "analyzing" | "failed";
const MAX_POLLS = 45;

export function QuickCheckoutReturn() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const executing = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    const checkoutId = url.searchParams.get("checkout_id");
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
          setMessage("결제 정보를 확인하지 못했습니다. 결제는 다시 시도하지 말고 잠시 후 대시보드에서 상태를 확인해 주세요.");
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
    <section className={styles.status} data-phase={phase}>
      {phase === "failed" ? <TriangleAlert /> : phase === "waiting" ? <LoaderCircle className={styles.spin} /> : <CheckCircle2 />}
      <div>
        <b>{phase === "failed" ? "확인이 필요합니다" : phase === "waiting" ? "결제 확인 중" : "분석 진행 중"}</b>
        <p>{message}</p>
        {phase === "failed" && <button type="button" className={styles.emailButton} disabled={emailBusy} onClick={() => void requestEmailLink()}>
          {emailBusy ? "전송 중..." : "이메일로 다시 안내받기"}
        </button>}
      </div>
    </section>
  );
}
