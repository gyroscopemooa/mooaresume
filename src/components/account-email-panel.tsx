"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createAuthCallbackUrl } from "@/lib/app-context";
import { canStartWithDelivery, hasVerifiedAccountEmail, isDashboardEligible, isDashboardOnly } from "@/lib/auth/delivery-preference";
import styles from "./account-email-panel.module.css";

type Confirmation = { email: string; type: "email_change" | "signup" };
const normalize = (email: string | undefined) => email?.trim().toLowerCase() ?? "";
const sameEmail = (left: string | undefined, right: string) => normalize(left) === normalize(right);
const confirmed = (user: User, email: string) => Boolean(user.email_confirmed_at && sameEmail(user.email, email));
const staleMessage = "로그인 계정이 바뀌었거나 만료됐습니다. 화면을 새로고침한 뒤 다시 확인해 주세요.";

/** Displays the same Auth email used by checkout and analysis notifications. No separate recipient is stored. */
export type DeliveryReadiness = { userId: string | null; ready: boolean };

export function AccountEmailPanel({ locked = false, onReadinessChange }: { locked?: boolean; onReadinessChange?: (state: DeliveryReadiness) => void }) {
  const id = useId();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [accountChecked, setAccountChecked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [codeAddress, setCodeAddress] = useState<"new" | "current">("new");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState("");
  const mounted = useRef(false);
  const pending = useRef(false);
  const initiatingUserId = useRef<string | null>(null);
  const stale = useRef(false);
  const initialized = useRef(false);
  const target = useRef<Confirmation | null>(null);

  useEffect(() => {
    onReadinessChange?.({ userId: user?.id ?? null, ready: accountChecked && !busy && !blocked && Boolean(user && canStartWithDelivery(user)) });
  }, [accountChecked, blocked, busy, onReadinessChange, user]);

  const readAccount = useCallback(async () => {
    const { data, error } = await createClient().auth.getUser();
    if (error) throw new Error("로그인 정보를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.");
    if (stale.current || !data.user || (initiatingUserId.current && initiatingUserId.current !== data.user.id)) {
      stale.current = true;
      if (mounted.current) { setAccountChecked(false); setUser(null); setConfirmation(null); setEmail(""); setToken(""); setBlocked(true); }
      throw new Error(staleMessage);
    }
    initiatingUserId.current ??= data.user.id;
    if (mounted.current) setAccountChecked(true);
    return data.user;
  }, []);

  const finish = useCallback((current: User) => {
    setUser(current);
    setEmail(current.email ?? "");
    target.current = null;
    setConfirmation(null);
    setToken("");
    setEditing(false);
    setMessage("이메일 확인이 완료되어 현재 계정에 적용됐습니다.");
  }, []);

  const refreshAccount = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    try {
      const current = await readAccount();
      if (!mounted.current) return;
      setUser(current);
      if (target.current && confirmed(current, target.current.email)) {
        finish(current);
      } else if (!target.current && (!initialized.current || current.new_email)) {
        const restored: Confirmation | null = current.new_email ? { email: current.new_email, type: "email_change" } : null;
        target.current = restored;
        setConfirmation(restored);
        setEmail(restored?.email ?? current.email ?? "");
        setEditing(Boolean(restored || (!isDashboardOnly(current) && (!current.email || !current.email_confirmed_at))));
        setMessage("");
      } else if (target.current) {
        setMessage("이메일 확인이 아직 완료되지 않았습니다. 기존 주소와 새 주소로 받은 메일을 모두 확인해 주세요.");
      }
      initialized.current = true;
    } catch (error) {
      if (mounted.current) setAccountChecked(false);
      if (mounted.current) setMessage(error instanceof Error && error.message === staleMessage ? staleMessage : "로그인 정보를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.");
    } finally {
      pending.current = false;
      if (mounted.current) { setReady(true); setBusy(false); }
    }
  }, [finish, readAccount]);

  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(() => { if (mounted.current) void refreshAccount(); });
    const refresh = () => { void refreshAccount(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    return () => {
      mounted.current = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [refreshAccount]);

  async function sendConfirmation(resend = false) {
    if (pending.current || locked || stale.current) return;
    const value = normalize(resend ? confirmation?.email : email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) {
      setMessage("확인 가능한 이메일 주소를 입력해 주세요.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const current = await readAccount();
      if (!mounted.current) return;
      setUser(current);
      if (confirmed(current, value)) { setMessage("이미 현재 계정에 적용된 이메일입니다."); return; }
      const type = sameEmail(current.email, value) ? "signup" : "email_change";
      const client = createClient();
      const emailRedirectTo = createAuthCallbackUrl("/analysis/prepare");
      // Updating to an unchanged address is a no-op in Auth. Resend its existing
      // signup confirmation instead; never create or sign in to another account.
      const result = type === "signup"
        ? await client.auth.resend({ type: "signup", email: value, options: { emailRedirectTo } })
        : await client.auth.updateUser({ email: value }, { emailRedirectTo });
      if (result.error) {
        setMessage("확인 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요. 다른 계정에서 사용하는 이메일은 사용할 수 없습니다.");
        return;
      }
      // Do not trust updateUser success as confirmation, or a session that changed
      // while the request was in flight. Keep the old displayed email meanwhile.
      await readAccount();
      if (!mounted.current) return;
      const next: Confirmation = { email: value, type };
      target.current = next;
      setConfirmation(next);
      setEmail(value);
      setToken("");
      setCodeAddress("new");
      setEditing(true);
      setMessage("확인 메일을 요청했습니다. 받은 메일의 링크를 열거나 확인 코드를 입력해 주세요. 새 탭에서 확인했다면 작성하던 원래 탭으로 돌아오세요.");
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error && error.message === staleMessage ? staleMessage : "확인 메일을 요청하지 못했습니다. 로그인 상태와 네트워크를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function verifyCode() {
    if (pending.current || locked || !confirmation || stale.current) return;
    if (!/^\d{6,10}$/.test(token.trim())) { setMessage("메일에 받은 확인 코드를 입력해 주세요."); return; }
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const current = await readAccount();
      if (!mounted.current) return;
      if (confirmed(current, confirmation.email)) { finish(current); return; }
      if (confirmation.type === "email_change" && !sameEmail(current.new_email, confirmation.email)) {
        setMessage("진행 중인 이메일 변경 요청이 달라졌습니다. 이메일 정보를 다시 확인해 주세요.");
        return;
      }
      if (confirmation.type === "signup" && !sameEmail(current.email, confirmation.email)) {
        setMessage("현재 이메일이 달라졌습니다. 이메일 정보를 다시 확인해 주세요.");
        return;
      }
      const address = confirmation.type === "email_change" && codeAddress === "current" ? current.email : confirmation.email;
      if (!address) return;
      const { error } = await createClient().auth.verifyOtp({ email: address, token: token.trim(), type: confirmation.type });
      if (error) { setMessage("코드가 올바르지 않거나 만료됐습니다. 메일을 다시 확인하거나 확인 메일을 다시 받아 주세요."); return; }
      const verified = await readAccount();
      if (!mounted.current) return;
      setUser(verified);
      setToken("");
      if (confirmed(verified, confirmation.email)) finish(verified);
      else setMessage("아직 변경이 완료되지 않았습니다. 기존 주소와 새 주소로 받은 확인 메일을 모두 확인해 주세요.");
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error && error.message === staleMessage ? staleMessage : "이메일을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  async function chooseDashboardOnly(dashboardOnly: boolean) {
    if (pending.current || locked || stale.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    try {
      const current = await readAccount();
      if (!mounted.current) return;
      if (!isDashboardEligible(current)) throw new Error(staleMessage);
      if (!dashboardOnly && !hasVerifiedAccountEmail(current)) {
        setEditing(true);
        setMessage("알림을 다시 받으려면 아래에서 계정 이메일을 확인해 주세요. 확인 전까지 대시보드 전용 설정은 유지됩니다.");
        return;
      }
      const response = await fetch("/api/account/delivery-preference", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: current.id, dashboardOnly }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || !result || typeof result !== "object" || !("userId" in result) || result.userId !== current.id) {
        throw new Error("이용 방식을 저장하지 못했습니다. 다시 시도해 주세요.");
      }
      const refreshed = await readAccount();
      if (!mounted.current) return;
      if (isDashboardOnly(refreshed) !== dashboardOnly) throw new Error("저장 상태를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.");
      setUser(refreshed);
      if (dashboardOnly) setEditing(false);
      setMessage(dashboardOnly ? "대시보드 전용으로 저장했습니다. 서비스 알림 메일은 보내지 않습니다." : "확인된 계정 이메일로 서비스 알림을 받습니다.");
    } catch (error) {
      if (mounted.current) { setAccountChecked(false); setMessage(error instanceof Error ? error.message : "이용 방식을 저장하지 못했습니다. 다시 시도해 주세요."); }
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const disabled = busy || locked || blocked;
  return <section id="account-delivery" tabIndex={-1} className={styles.panel} aria-labelledby={`${id}-title`} data-clarity-mask="True">
    <div className={styles.heading}>
      <h3 id={`${id}-title`}>분석 완료 알림 이메일</h3>
      {ready && user && <button type="button" className={styles.change} disabled={disabled} aria-expanded={editing} aria-controls={`${id}-form`} onClick={() => { setEditing(!editing); setMessage(""); }}>{editing ? "닫기" : user.email ? "변경" : "등록"}</button>}
    </div>
    {!ready ? <p className={styles.help}>현재 계정 이메일을 확인하고 있어요.</p> : user ? <>
      <p className={styles.current}>{user.email || "등록된 이메일이 없습니다."}</p>
      <p className={styles.help}>{!user.email ? "알림을 원하면 이메일을 입력하고 확인해 주세요. 네이버·카카오 계정은 아래에서 대시보드 전용 이용도 선택할 수 있습니다." : user.email_confirmed_at ? "현재 계정에 적용된 주소입니다. 대시보드 전용을 선택하면 이 주소로도 서비스 알림을 보내지 않습니다." : "아직 확인되지 않은 이메일입니다. 알림을 받으려면 메일 인증을 완료해 주세요."}</p>
      {isDashboardEligible(user) && <>
        <label className={styles.choice}>
          <input type="checkbox" checked={isDashboardOnly(user)} disabled={disabled} onChange={(event) => void chooseDashboardOnly(event.target.checked)} />
          <span>추가 이메일 인증 없이, 서비스 알림 메일을 받지 않고 대시보드에서 확인</span>
        </label>
        <p className={styles.help}>분석 결과는 대시보드에서 직접 확인해 주세요. MOOA의 분석 완료·환불 안내 메일은 보내지 않습니다. 환불은 결제 내역과 결제 서비스 안내를 확인해 주세요. 다시 방문할 때도 같은 네이버·카카오 계정으로 로그인해야 합니다. 계정 이메일은 삭제되지 않습니다.</p>
        <p className={styles.help}>결제 시 이메일 입력이 필요할 수 있으며, 결제 서비스의 영수증·환불 안내는 별도로 발송될 수 있습니다.</p>
        <a className={styles.secondary} href="/app/my">대시보드에서 내 분석 보기</a>
        {isDashboardOnly(user) && <p className={styles.pending}>대시보드 전용 사용 중 · 이메일 확인 후 위 선택을 해제하면 서비스 알림을 다시 받을 수 있습니다.</p>}
      </>}
      <p className={styles.help}>계정·알림 이메일과 소셜 로그인은 별개입니다. 이메일을 바꿔도 연결된 소셜 로그인은 유지되며, 다른 계정과 합쳐지지 않습니다.</p>
      {confirmation && <p className={styles.pending}>확인 대기: {confirmation.email}<br/>확인이 끝나기 전까지 현재 계정 이메일은 바뀌지 않습니다.</p>}
      {editing && <div id={`${id}-form`} className={styles.editor}>
        <p className={styles.help}>알림 전용 주소가 아니라 현재 계정 이메일을 변경합니다. 기존 주소와 새 주소 모두에 확인 메일이 오면 각각 인증해 주세요. 다른 계정과 구매 내역이 합쳐지지는 않습니다.</p>
        <form onSubmit={(event) => { event.preventDefault(); void sendConfirmation(); }} noValidate>
          <label htmlFor={`${id}-email`}>사용할 이메일</label>
          <input id={`${id}-email`} type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} disabled={disabled} />
          <button type="submit" className={styles.primary} disabled={disabled}>확인 메일 받기</button>
          <p className={styles.help}>네이버·다음·Gmail 등 실제로 확인할 수 있는 메일 주소를 사용할 수 있습니다. 메일이 오지 않으면 스팸함과 주소를 확인한 뒤 다시 요청해 주세요. 다른 계정이 사용 중인 주소는 등록할 수 없습니다.</p>
        </form>
        {confirmation && <>
          <form onSubmit={(event) => { event.preventDefault(); void verifyCode(); }} noValidate>
            {confirmation.type === "email_change" && user.email && !sameEmail(user.email, confirmation.email) && <>
              <label htmlFor={`${id}-address`}>코드를 받은 주소</label>
              <select id={`${id}-address`} value={codeAddress} onChange={(event) => { setCodeAddress(event.target.value === "current" ? "current" : "new"); setToken(""); }} disabled={disabled}>
                <option value="new">새 이메일: {confirmation.email}</option>
                <option value="current">기존 이메일: {user.email}</option>
              </select>
            </>}
            <label htmlFor={`${id}-code`}>이메일 확인 코드</label>
            <input id={`${id}-code`} inputMode="numeric" autoComplete="one-time-code" maxLength={10} value={token} onChange={(event) => setToken(event.target.value)} disabled={disabled} />
            <button type="submit" className={styles.primary} disabled={disabled}>코드 확인</button>
          </form>
          <div className={styles.controls}>
            <button type="button" className={styles.secondary} disabled={disabled} onClick={() => void sendConfirmation(true)}>확인 메일 다시 받기</button>
            <button type="button" className={styles.secondary} disabled={busy} onClick={() => void refreshAccount()}>메일 확인 후 새로 확인</button>
          </div>
        </>}
      </div>}
      <button type="button" className={styles.secondary} disabled={busy || locked || blocked} onClick={() => void refreshAccount()}>이메일·이용 방식 다시 확인</button>
    </> : <button type="button" className={styles.secondary} disabled={busy || blocked} onClick={() => void refreshAccount()}>이메일 정보 다시 확인</button>}
    {message && <p role="status" className={styles.message}>{message}</p>}
  </section>;
}
