"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { z } from "zod";
import styles from "./quick-checkout-return.module.css";
import { createClient } from "@/lib/supabase/client";
import { reportPurchaseConversion } from "@/lib/google-ads-conversion";

const statusSchema = z.object({
  checkoutId: z.string(),
  checkoutStatus: z.enum(["OPEN", "SUCCEEDED", "EXPIRED"]),
  analysisRunId: z.string().uuid(),
  analysisStatus: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED"]),
  product: z.enum(["QUICK", "PRO", "FINAL"]).optional(),
  entitlementStatus: z.enum(["ACTIVE", "CONSUMED", "REVOKED"]).nullable(),
  hasResult: z.boolean(),
  timeoutRefunded: z.boolean().optional(),
  retryAvailable: z.boolean().optional(),
  failureCode: z.string().nullable().optional(),
  attemptCount: z.number().int().nullable().optional(),
  // 광고 전환 보고용. 결제가 확정되기 전에는 서버가 null로 내려보냅니다.
  orderId: z.string().nullable().optional(),
  amount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
});

type Phase = "idle" | "waiting" | "analyzing" | "failed";
/**
 * 무엇이 실패했는가.
 *
 * `failed` 하나가 서로 다른 두 상황을 함께 쓰고 있었습니다. 결제를 확인하지
 * 못한 것과 분석이 실패한 것은 손님이 할 일이 정반대입니다 — 앞은 로그인하면
 * 결과가 나오고, 뒤는 로그인해도 볼 것이 없습니다. 그런데 두 경우 모두에
 * "이메일로 다시 안내받기"가 떠서, 분석이 실패한 손님이 로그인 링크를 받아
 * 눌렀다가 결제 화면으로 되돌아왔습니다.
 */
type FailureKind = "checkout" | "analysis";
// Analysis normally takes 2~5 minutes and the server auto-refunds past 10
// minutes (claim_quick_analysis_timeout_refund's 600s window). Poll well
// past that server-side bound so a slow-but-healthy run is never mistaken
// for a client-side timeout.
const MAX_POLLS = 330;

const formatElapsed = (seconds: number) => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

type Props = {
  onProductConfirmed?: (product: "QUICK" | "PRO" | "FINAL") => void;
  /** Set when a run was paid for with a reward credit instead of a checkout. */
  creditRunId?: string | null;
  /**
   * 결제·분석이 시작되면 알립니다.
   *
   * The progress block sits at the top of the page while the payment section
   * stays mounted below it, so the screen keeps offering decisions about a run
   * that is already going. Only this component knows a checkout came back, so
   * it is the one that has to say so.
   */
  onRunActive?: (active: boolean) => void;
};

/**
 * 서버가 준 문장을 그대로 씁니다.
 *
 * 전에는 사유를 괄호에 덧붙였는데, 운영에서는 서버가 사유를 숨기므로 괄호
 * 안에 **같은 문장이 한 번 더** 들어갔습니다("분석을 완료하지 못했습니다.
 * (분석을 완료하지 못했습니다.)"). 아무 정보도 아닌 데다 고장 난 것처럼
 * 보입니다. 이제 서버가 갈래별 문장을 보내므로 그것을 그대로 보여 주고,
 * 갈래 이름만 작게 덧붙여 문의할 때 댈 수 있게 합니다.
 */
function describeFailure(payload: unknown): string {
  const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : null;
  const message = typeof body?.error === "string" ? body.error : "분석을 완료하지 못했습니다. 추가 결제 없이 다시 시도하실 수 있습니다.";
  const code = typeof body?.code === "string" ? body.code : null;
  const detail = typeof body?.detail === "string"
    ? body.detail
    // 요청 값 오류는 무엇이 잘못됐는지가 곧 사유입니다.
    : Array.isArray(body?.issues)
      ? body.issues.map((issue) => (issue && typeof issue === "object" && "message" in issue ? String((issue as { message: unknown }).message) : "invalid input")).join("; ")
      : null;
  // 개발 중에는 진짜 사유가 붙어 오므로 그대로 보여 줍니다.
  if (detail && detail !== message) return `${message} (${detail})`;
  return code && code !== "UNKNOWN" ? `${message} [${code}]` : message;
}

export function QuickCheckoutReturn({ onProductConfirmed, creditRunId = null, onRunActive }: Props = {}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [product, setProduct] = useState<"QUICK" | "PRO" | "FINAL" | null>(null);
  const [message, setMessage] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [failureKind, setFailureKind] = useState<FailureKind>("checkout");
  // 로그인 링크가 돌아올 자리. 결과를 보러 온 사람을 결제 화면으로 돌려보내면
  // "이 탭에 저장된 작성본이 없습니다"를 만나게 됩니다.
  const [runId, setRunId] = useState<string | null>(null);
  const [retryRunId, setRetryRunId] = useState<string | null>(null);
  /**
   * 실패했지만 아직 끝나지 않은 상태.
   *
   * 서버는 재시도가 남아 있으면 스스로 한 번 더 돌립니다. 그런데 화면은
   * `FAILED`를 보자마자 폴링을 멈춰 버려서, **결과가 만들어져도 알지
   * 못했습니다** — 관리자 화면에는 `완료 · 시도 2회`로 남는데 신청한 사람은
   * 실패 화면을 보고 있었습니다. 돈을 낸 사람에게 이보다 나쁜 화면은 없습니다.
   */
  const [autoRetrying, setAutoRetrying] = useState(false);
  // 실행 호출이 연달아 거절당하면 그때는 진짜로 멈춥니다. 한 번의 실패로
  // 포기하지 않되, 영원히 도는 것도 아닙니다.
  const executeFailures = useRef(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const startedAt = useRef<number | null>(null);
  const executing = useRef(false);
  const rootRef = useRef<HTMLElement | null>(null);

  // A failed run is not active: the applicant needs the decisions back so they
  // can retry.
  useEffect(() => {
    onRunActive?.(phase === "waiting" || phase === "analyzing");
  }, [phase, onRunActive]);

  // A failed run is not active: the applicant needs the decisions back so they
  // can retry.
  useEffect(() => {
    onRunActive?.(phase === "waiting" || phase === "analyzing");
  }, [phase, onRunActive]);

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
          `/api/checkouts/quick/status?checkoutId=${encodeURIComponent(checkoutId!)}&reconcile=${attempt === 0 ? "1" : "0"}`,
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
        setRunId(status.analysisRunId);
        // 결제가 확정된 그 순간에 한 번만 보고합니다. 이 확인은 몇 초마다
        // 다시 도는데, 같은 주문 번호로 보내므로 구글이 한 건으로 합칩니다.
        if (status.checkoutStatus === "SUCCEEDED" && status.orderId) {
          reportPurchaseConversion({
            transactionId: status.orderId,
            value: status.amount ?? null,
            currency: status.currency ?? null,
          });
        }
        if (status.product) {
          setProduct(status.product);
          onProductConfirmed?.(status.product);
        }
        if (status.hasResult || status.analysisStatus === "COMPLETED") {
          window.location.replace(`/result?analysisRunId=${status.analysisRunId}`);
          return;
        }
        if (status.analysisStatus === "FAILED" || status.entitlementStatus === "REVOKED") {
          // 결제는 됐고 분석이 실패한 것입니다. 로그인 링크는 도움이 되지
          // 않습니다 — 로그인해도 볼 결과가 없습니다.
          setFailureKind("analysis");
          setPhase("failed");
          if (status.timeoutRefunded) {
            setMessage("\uBD84\uC11D\uC774 10\uBD84\uC744 \uCD08\uACFC\uD574 \uC790\uB3D9\uC73C\uB85C \uC885\uB8CC\uD558\uACE0 \uD658\uBD88\uC744 \uC694\uCCAD\uD588\uC2B5\uB2C8\uB2E4.");
            return;
          }
          if (status.retryAvailable) {
            setRetryRunId(status.analysisRunId);
            setAutoRetrying(true);
            setMessage(
              `한 번 실패해 자동으로 다시 시도하고 있습니다${status.attemptCount ? ` (시도 ${status.attemptCount}/3)` : ""}. `
              + "추가 결제는 없습니다. 이 화면을 그대로 두시면 끝나는 대로 결과로 이동합니다. "
              + `직접 눌러 바로 시도하실 수도 있습니다. 원인 코드: ${status.failureCode ?? "UNKNOWN"}`,
            );
            // 여기서 멈추지 않습니다. 서버가 남은 시도를 스스로 돌리는데
            // 화면이 폴링을 끊으면, 완성된 결과를 두고 실패 화면이 남습니다.
            if (attempt < MAX_POLLS) {
              timer = window.setTimeout(() => void poll(attempt + 1), 2000);
            }
            return;
          }
          setAutoRetrying(false);
          setMessage("분석을 완료하지 못했습니다. 결제는 다시 하지 마시고 문의해 주세요.");
          return;
        }
        if (status.analysisStatus === "RUNNING") {
          setPhase("analyzing");
          setMessage("결제가 확인되어 AI가 첨삭을 진행하고 있습니다. 창을 닫으셔도 계속 진행되며, 끝나면 결과 링크를 이메일로 보내드립니다.");
          if (!executing.current) {
            executing.current = true;
            try {
              const advanceResponse = await fetch("/api/analysis-runs/quick/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ analysisRunId: status.analysisRunId }) });
              // Every non-202 response here used to be discarded, so a
              // permanently broken backend (e.g. a bad OPENAI_API_KEY) polled
              // silently every 2s for up to the 10-minute server timeout with
              // the screen still saying "진행하고 있습니다". Surface it like
              // the sibling branch below does.
              if (!advanceResponse.ok && advanceResponse.status !== 202) {
                const failure: unknown = await advanceResponse.json().catch(() => null);
                executeFailures.current += 1;
                // 한 번의 거절로 끝내지 않습니다 — 첫 시도만 실패하고 두 번째가
                // 성공하는 일이 실제로 있었고, 그때 화면만 실패로 굳었습니다.
                // 다만 계속 거절당하면(설정이 깨진 경우) 조용히 돌지 않습니다.
                if (executeFailures.current >= 3) {
                  setFailureKind("analysis");
                  setPhase("failed");
                  setAutoRetrying(false);
                  setMessage(describeFailure(failure));
                  return;
                }
                setAutoRetrying(true);
                setMessage("한 번 실패해 다시 시도하고 있습니다. 추가 결제는 없습니다.");
              }
            } finally { executing.current = false; }
          }
          timer = window.setTimeout(() => void poll(attempt + 1), 2000);
          return;
        }
        if (status.entitlementStatus === "ACTIVE" && !executing.current) {
          executing.current = true;
          setPhase("analyzing");
          setMessage("결제가 확인되어 AI가 첨삭을 진행하고 있습니다. 창을 닫으셔도 계속 진행되며, 끝나면 결과 링크를 이메일로 보내드립니다.");
          try {
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
            } else if (executeResponse.status !== 202) {
              const failure: unknown = await executeResponse.json().catch(() => null);
              executeFailures.current += 1;
              if (executeFailures.current >= 3) {
                setFailureKind("analysis");
                setPhase("failed");
                setAutoRetrying(false);
                setMessage(describeFailure(failure));
                return;
              }
              setAutoRetrying(true);
              setMessage("한 번 실패해 다시 시도하고 있습니다. 추가 결제는 없습니다.");
            }
          } catch {
            // A network-level failure here does not mean the analysis itself
            // failed: begin_quick_analysis already flipped the run to RUNNING
            // server-side before the AI call started. Keep polling status
            // instead of declaring failure from a dropped connection.
          } finally {
            executing.current = false;
          }
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
  }, [onProductConfirmed]);

  /**
   * The same screen, entered without a checkout.
   *
   * A run paid for with a reward credit never goes to Polar, so it never comes
   * back with `checkout=success` — and the applicant was left on a line of text
   * saying the analysis had started, with no progress and no result. This runs
   * the one loop that matters for them: ask the server to advance the run, and
   * keep asking while it is still working.
   *
   * Deliberately its own effect rather than a branch inside the checkout poll.
   * That loop is about reconciling a payment, which is not a question this path
   * has, and threading a second meaning through it would put the paid flow at
   * risk for the sake of the free one.
   *
   * Driven by a prop rather than a query parameter, because this component and
   * the checkout button live on the same page: navigating to the same route
   * with a different query does not remount anything, so an effect keyed on the
   * URL never fires. That is exactly what happened — the credit was spent and
   * the screen sat still.
   */
  useEffect(() => {
    if (!creditRunId) return;
    const analysisRunId = creditRunId;

    startedAt.current = Date.now();
    // This block sits directly under the page header while the button that
    // starts a credit run is far down the page. Without this the progress
    // appears entirely above the fold and the applicant, still looking at the
    // button, sees nothing move — which is exactly what was reported.
    queueMicrotask(() => rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    let cancelled = false;
    let timer: number | undefined;

    async function run(attempt: number) {
      if (cancelled) return;
      setPhase("analyzing");
      setMessage("무료 이용권으로 분석을 시작했습니다. 창을 닫으셔도 계속 진행되며, 끝나면 결과 링크를 이메일로 보내드립니다.");
      try {
        const response = await fetch("/api/analysis-runs/quick/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysisRunId }),
        });
        const payload: unknown = await response.json().catch(() => null);
        if (response.ok && payload && typeof payload === "object" && "resultUrl" in payload && typeof payload.resultUrl === "string") {
          window.location.replace(payload.resultUrl);
          return;
        }
        // 202는 "아직 하는 중"이고, 이 런 대부분의 시간이 그렇습니다.
        //
        // 그 밖의 거절이라고 곧바로 끝내지는 않습니다. 서버는 재시도가 남아
        // 있으면 스스로 한 번 더 돌리는데, 여기서 화면을 닫아 버리면 **결과가
        // 만들어져도 실패 화면이 남습니다** — 실제로 무료 이용권으로 돌린 분이
        // 실패 화면을 보고, 메일 링크로 들어가서야 결과를 찾았습니다.
        if (response.status !== 202 && !response.ok) {
          executeFailures.current += 1;
          if (executeFailures.current >= 3) {
            setFailureKind("analysis");
            setPhase("failed");
            setAutoRetrying(false);
            setMessage(describeFailure(payload));
            return;
          }
          setAutoRetrying(true);
          setMessage("한 번 실패해 다시 시도하고 있습니다. 이용권은 그대로이고 추가 결제도 없습니다.");
        }
      } catch {
        // A dropped connection does not mean the analysis failed — the run is
        // already RUNNING server-side. Keep asking.
      }
      if (attempt < MAX_POLLS) {
        timer = window.setTimeout(() => void run(attempt + 1), 3000);
        return;
      }
      setPhase("failed");
      setMessage("분석이 예상보다 오래 걸리고 있습니다. 창을 닫으셔도 서버에서 계속 진행되며, 끝나면 결과 링크를 이메일로 보내드립니다.");
    }

    void run(0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [creditRunId]);

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
      if (response.status === 202) { window.location.reload(); return; }
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
          // 어느 분석인지 알면 결과로 바로 보냅니다. 예전에는 무조건
          // `/analysis/prepare`로 보내서, 결과를 보러 로그인한 사람이 결제
          // 화면과 "저장된 작성본이 없습니다"를 만났습니다.
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(runId ? `/result?analysisRunId=${runId}` : "/analysis/prepare")}`,
        },
      });
      setMessage(error ? "이메일 안내를 보내지 못했습니다." : "로그인 링크를 이메일로 보냈습니다. 링크는 한 번만 쓸 수 있으니, 메일을 연 그 브라우저에서 바로 눌러 주세요.");
    } finally {
      setEmailBusy(false);
    }
  }

  if (phase === "idle") return null;

  return (
    <>
    <section ref={rootRef} className={styles.status} data-phase={phase}>
      {phase === "failed" && !autoRetrying ? <TriangleAlert /> : phase === "waiting" || autoRetrying ? <LoaderCircle className={styles.spin} /> : <CheckCircle2 />}
      <div>
        <b>{product ? `${product} · ` : ""}{autoRetrying ? "다시 시도 중" : phase === "failed" ? "확인이 필요합니다" : phase === "waiting" ? "결제 확인 중" : "분석 진행 중"}</b>
        <p>{message}</p>
        {phase === "failed" && retryRunId && <button type="button" className={styles.emailButton} onClick={() => void retryAnalysis()}>
          {"\uAE30\uC874 \uACB0\uC81C\uB85C \uB2E4\uC2DC \uBD84\uC11D\uD558\uAE30"}
        </button>}
        {/* 결제를 확인하지 못한 경우에만 띄웁니다. 분석이 실패한 손님에게
            로그인 링크는 할 일이 아니라 헛걸음입니다 — 로그인해도 결과가
            없고, 그 사이에 손님은 자기가 뭘 잘못한 줄 압니다. */}
        {phase === "failed" && failureKind === "checkout" && <button type="button" className={styles.emailButton} disabled={emailBusy} onClick={() => void requestEmailLink()}>
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
