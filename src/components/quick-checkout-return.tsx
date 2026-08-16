"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { z } from "zod";
import styles from "./quick-checkout-return.module.css";

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
  const executing = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("checkout") !== "success") return;
    const checkoutId = url.searchParams.get("checkout_id");
    if (!checkoutId) {
      queueMicrotask(() => {
        setPhase("failed");
        setMessage("결제 식별자를 확인하지 못했습니다.");
      });
      return;
    }

    let cancelled = false;
    let timer: number | undefined;

    async function poll(attempt: number) {
      if (cancelled) return;
      setPhase("waiting");
      setMessage("결제 완료 정보를 확인하고 있습니다.");

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
          setMessage("분석을 완료하지 못했습니다. 결제 내역은 보존되어 있으니 다시 결제하지 마세요.");
          return;
        }
        if (status.analysisStatus === "RUNNING") {
          setPhase("analyzing");
          setMessage("자기소개서를 분석하고 있습니다.");
          timer = window.setTimeout(() => void poll(attempt + 1), 2000);
          return;
        }
        if (status.entitlementStatus === "ACTIVE" && !executing.current) {
          executing.current = true;
          setPhase("analyzing");
          setMessage("결제가 확인되었습니다. 자기소개서를 분석하고 있습니다.");
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
          setMessage("결제 확인이 지연되고 있습니다. 다시 결제하지 말고 잠시 후 이 페이지를 새로고침해 주세요.");
        }
      }
    }

    void poll(0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (phase === "idle") return null;

  return (
    <section className={styles.status} data-phase={phase}>
      {phase === "failed" ? <TriangleAlert /> : phase === "waiting" ? <LoaderCircle className={styles.spin} /> : <CheckCircle2 />}
      <div>
        <b>{phase === "failed" ? "확인이 필요합니다" : phase === "waiting" ? "결제 확인 중" : "분석 진행 중"}</b>
        <p>{message}</p>
      </div>
    </section>
  );
}
