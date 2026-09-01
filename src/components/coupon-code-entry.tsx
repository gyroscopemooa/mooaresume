"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./coupon-code-entry.module.css";

/**
 * 협업 기관에서 받은 쿠폰 코드를 등록합니다.
 *
 * 추천코드 칸과 **따로** 둡니다. 둘은 이름만 비슷하고 하는 일이 반대입니다 —
 * 추천코드는 넣은 사람이 결제해야 **추천한 사람**에게 이용권이 가고, 쿠폰은
 * 넣는 즉시 **넣은 사람**이 이용권을 받습니다. 한 칸에 합치면 "추천코드
 * 넣었는데 왜 이용권이 안 생기죠"가 문의로 돌아옵니다.
 */

/**
 * 왜 안 되는지를 각각 다르게 말합니다.
 *
 * "사용할 수 없는 코드입니다" 하나로 뭉치면, 기간이 지난 것인지 수량이 찬
 * 것인지 오탈자인지 아무도 알 수 없습니다. 셋은 다음에 할 일이 전부 다릅니다.
 */
function describeCouponError(raw: string): string {
  if (raw.includes("COUPON_NOT_FOUND")) return "없는 코드입니다. 대시(-)까지 그대로 넣으셨는지 확인해 주세요.";
  if (raw.includes("COUPON_EXPIRED")) return "사용 기간이 지난 쿠폰입니다.";
  if (raw.includes("COUPON_NOT_STARTED")) return "아직 시작되지 않은 쿠폰입니다.";
  if (raw.includes("COUPON_EXHAUSTED")) return "준비된 수량이 모두 사용되었습니다.";
  if (raw.includes("COUPON_ALREADY_CLAIMED")) return "이미 사용하신 쿠폰입니다. 무료 이용권은 결제 화면에서 쓰실 수 있습니다.";
  if (raw.includes("COUPON_REVOKED")) return "사용이 중지된 쿠폰입니다.";
  if (raw.includes("AUTHENTICATION_REQUIRED")) return "로그인 후 등록하실 수 있습니다.";
  return `등록하지 못했습니다. (${raw})`;
}

export function CouponCodeEntry({
  compact = false,
  requireSignIn = false,
  returnTo = "/refer",
}: {
  compact?: boolean;
  /**
   * 로그아웃 상태에서 로그인할 길을 내줍니다.
   *
   * 이용권은 계정에 붙는 물건이라 `claim_coupon_code`가 로그인을 요구합니다.
   * 그런데 안내만 하고 버튼을 두지 않으면, 기관에서 쿠폰을 받아 온 사람이
   * "로그인하셔야 합니다"를 읽고 **어디서 로그인하는지는 못 찾는** 막다른 길에
   * 섭니다. 추천코드 칸과 같은 방식으로 엽니다.
   */
  requireSignIn?: boolean;
  returnTo?: string;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!requireSignIn) return;
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await createClient().auth.getUser();
        if (!cancelled) setSignedIn(Boolean(data.user));
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requireSignIn]);

  async function signIn() {
    setBusy(true);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=${returnTo}` },
      });
      if (error) setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  async function apply() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) { setMessage("쿠폰 코드를 넣어 주세요."); return; }
    setBusy(true);
    setMessage("");
    try {
      const { data, error } = await createClient().rpc("claim_coupon_code", { p_code: trimmed });
      if (error) {
        console.error("claim_coupon_code", error);
        setMessage(describeCouponError(error.message ?? ""));
        setBusy(false);
        return;
      }
      const result = data as { product?: string; partnerName?: string; expiresAt?: string | null } | null;
      setDone(true);
      // 무엇을 받았고 언제까지인지. 둘 다 없으면 "등록되었습니다"만 남고,
      // 그건 확인이 아니라 인사입니다.
      const until = result?.expiresAt ? ` ${new Date(result.expiresAt).toLocaleDateString("ko-KR")}까지 쓰실 수 있습니다.` : "";
      setMessage(`${result?.product ?? ""} 무료 이용권이 계정에 들어왔습니다.${until} 결제 화면에서 바로 쓰실 수 있습니다.`.trim());
    } catch (error) {
      console.error("claim_coupon_code", error);
      setMessage("등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  const needsSignIn = requireSignIn && signedIn === false;

  return (
    <div className={compact ? styles.compact : styles.card} data-done={done}>
      <div className={styles.row}>
        <span className={styles.label}><Ticket/> 쿠폰 코드<em>선택</em></span>
        {needsSignIn ? (
          compact ? (
            // 결제 화면에는 로그인 버튼이 이미 몇 줄 아래에 있습니다. 같은 일을
            // 시키는 버튼이 둘이면 어느 쪽을 눌러야 하는지를 묻게 됩니다.
            <small className={styles.hint}>로그인하시면 입력칸이 열립니다</small>
          ) : (
            <button type="button" className={styles.signIn} onClick={() => void signIn()} disabled={busy}>
              {busy ? "이동 중..." : "Google로 계속하기"} <ArrowRight size={14}/>
            </button>
          )
        ) : (
          <>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="YOUTH-MUA-2026"
              disabled={busy || done}
              maxLength={40}
              aria-label="쿠폰 코드"
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void apply(); } }}
            />
            <button type="button" onClick={() => void apply()} disabled={busy || done}>
              {done ? "완료" : busy ? "확인 중" : "등록"}
            </button>
          </>
        )}
      </div>
      {message && <p className={styles.message} data-ok={done}>{message}</p>}
    </div>
  );
}
