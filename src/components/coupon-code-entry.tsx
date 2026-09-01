"use client";

import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PENDING_COUPON_CODE, stashPendingCode, takePendingCode } from "@/lib/pending-code";
import { announceCreditChange } from "@/lib/credit-events";
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
   * 로그아웃이어도 칸을 열어 두고, 등록할 때 로그인을 거칩니다.
   *
   * 이용권은 계정에 붙는 물건이라 `claim_coupon_code`는 로그인을 요구합니다.
   * 그렇다고 칸을 잠가 두면, 무료 이용권을 손에 쥔 사람이 결제 화면에서
   * 그걸 못 쓰고 **돈을 냅니다.** 그래서 입력은 받고, 등록을 누른 순간
   * 코드를 맡겨 둔 채 로그인으로 보냈다가 돌아와서 대신 등록합니다.
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

  // 로그인하러 갔다 돌아온 경우. 맡겨 둔 코드를 대신 등록하고 결과를 보여
  // 줍니다 — 돌아왔더니 칸이 비어 있으면 방금 친 것을 또 치게 됩니다.
  useEffect(() => {
    if (signedIn !== true) return;
    const pending = takePendingCode(PENDING_COUPON_CODE);
    if (!pending) return;
    void (async () => {
      setCode(pending);
      await apply(pending);
    })();
    // apply는 렌더마다 새로 만들어지므로 의존성에 넣지 않습니다. 이 효과는
    // 로그인 상태가 정해지는 그 한 번만 돌아야 합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

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

  async function apply(given?: string) {
    const trimmed = (given ?? code).trim().toUpperCase();
    if (!trimmed) { setMessage("쿠폰 코드를 넣어 주세요."); return; }

    // 로그인 전에는 코드가 맞는지 확인해 줄 수 없습니다. 확인해 주는 창구를
    // 열어 두면 코드를 찍어 보며 남의 쿠폰을 캐낼 수 있기 때문입니다. 그래서
    // 오타는 로그인하고 돌아온 뒤에야 알려드리게 됩니다.
    if (requireSignIn && signedIn === false) {
      stashPendingCode(PENDING_COUPON_CODE, trimmed);
      setMessage("로그인 후 자동으로 등록해 드립니다.");
      await signIn();
      return;
    }

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
      // 같은 화면의 "무료 이용권으로 시작"은 뜰 때 한 번만 조회합니다. 알리지
      // 않으면 방금 만든 이용권을 못 보고 결제 화면으로 보냅니다.
      announceCreditChange();
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
          {done ? "완료" : busy ? "확인 중" : needsSignIn ? "로그인하고 등록" : "등록"}
        </button>
      </div>
      {/* 누르기 전에 무슨 일이 생길지 미리 말해 둡니다. 구글 화면으로 넘어가는
          것은 놀랄 만한 일이라, 버튼을 누른 다음에 알리면 늦습니다. */}
      {needsSignIn && !message && (
        <p className={styles.hint}>등록을 누르면 로그인 후 자동으로 적용됩니다.</p>
      )}
      {message && <p className={styles.message} data-ok={done}>{message}</p>}
    </div>
  );
}
