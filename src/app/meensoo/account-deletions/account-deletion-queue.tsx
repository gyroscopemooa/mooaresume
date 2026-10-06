"use client";

import { useState } from "react";
import type { AccountDeletionPreview, AdminAccountDeletionRequest } from "@/server/account/admin-account-deletion";
import { kst } from "../format";
import adminStyles from "../admin.module.css";
import styles from "./account-deletions.module.css";

type ApiResult = {
  request?: AdminAccountDeletionRequest;
  preview?: AccountDeletionPreview | null;
  noticeSent?: boolean;
  retainedBillingOrders?: number;
  retainedInterviewRetryOrders?: number;
  error?: string;
};

const STATUS_LABEL: Record<AdminAccountDeletionRequest["status"], string> = {
  RECEIVED: "접수",
  NEEDS_ACCOUNT_EMAIL: "가입 이메일 필요",
  READY: "삭제 준비",
  PROCESSING: "삭제 중",
  COMPLETED: "완료",
  FAILED: "실패 · 재시도 가능",
};

function replaceRequest(list: AdminAccountDeletionRequest[], next: AdminAccountDeletionRequest) {
  const exists = list.some((item) => item.id === next.id);
  return exists ? list.map((item) => item.id === next.id ? next : item) : [next, ...list];
}
export function AccountDeletionQueue({ initialRequests, loadError = "" }: { initialRequests: AdminAccountDeletionRequest[]; loadError?: string }) {
  const [requests, setRequests] = useState(initialRequests);
  const [requesterEmail, setRequesterEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [linkEmails, setLinkEmails] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, AccountDeletionPreview>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState(loadError);

  async function post(body: Record<string, unknown>): Promise<ApiResult> {
    const response = await fetch("/api/meensoo/account-deletions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({})) as ApiResult;
    if (!response.ok) throw new Error(result.error ?? "처리하지 못했습니다.");
    return result;
  }

  async function createRequest() {
    setBusy("create");
    setMessage("");
    try {
      const result = await post({ action: "CREATE", requesterEmail, ...(accountEmail.trim() ? { accountEmail } : {}) });
      if (result.request) {
        setRequests((current) => replaceRequest(current, result.request!));
        if (result.preview) setPreviews((current) => ({ ...current, [result.request!.id]: result.preview! }));
        setMessage(result.request.status === "READY" ? "요청을 등록하고 가입 계정을 찾았습니다." : "요청은 등록했지만 가입 계정을 찾지 못했습니다.");
        setRequesterEmail("");
        setAccountEmail("");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "처리하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function linkAccount(item: AdminAccountDeletionRequest) {
    const email = linkEmails[item.id]?.trim();
    if (!email) return;
    setBusy(item.id);
    setMessage("");
    try {
      const result = await post({ action: "LINK", requestId: item.id, accountEmail: email });
      if (result.request) setRequests((current) => replaceRequest(current, result.request!));
      if (result.preview) setPreviews((current) => ({ ...current, [item.id]: result.preview! }));
      setMessage("가입 계정을 연결했습니다. 삭제 대상을 확인해 주세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "처리하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function preview(item: AdminAccountDeletionRequest) {
    if (!item.accountEmail) return;
    setBusy(item.id);
    setMessage("");
    try {
      const result = await post({ action: "PREVIEW", accountEmail: item.accountEmail });
      if (result.preview) setPreviews((current) => ({ ...current, [item.id]: result.preview! }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "처리하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function execute(item: AdminAccountDeletionRequest) {
    const typed = window.prompt("되돌릴 수 없습니다. 계속하려면 '계정 삭제'를 정확히 입력하세요.");
    if (typed === null) return;
    if (typed !== "계정 삭제") {
      setMessage("확인 문구가 달라 삭제하지 않았습니다.");
      return;
    }
    if (!window.confirm(`${item.accountEmail ?? "이 계정"}의 계정·지원자료·분석결과를 영구 삭제할까요?`)) return;
    setBusy(item.id);
    setMessage("");
    try {
      const result = await post({ action: "EXECUTE", requestId: item.id, confirmation: typed });
      if (result.request) setRequests((current) => replaceRequest(current, result.request!));
      setPreviews((current) => { const next = { ...current }; delete next[item.id]; return next; });
      const retained = (result.retainedBillingOrders ?? 0) + (result.retainedInterviewRetryOrders ?? 0);
      setMessage(`계정과 데이터를 삭제했습니다. 완료 메일 ${result.noticeSent ? "발송 완료" : "발송 실패 · 목록에서 재시도 필요"}.${retained > 0 ? ` 법정 보관 결제 ${retained}건은 분리했습니다.` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "삭제하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function retryNotice(item: AdminAccountDeletionRequest) {
    setBusy(item.id);
    setMessage("");
    try {
      const result = await post({ action: "RETRY_NOTICE", requestId: item.id });
      if (result.request) setRequests((current) => replaceRequest(current, result.request!));
      setMessage("삭제 완료 메일을 발송했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "메일을 보내지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  const openCount = requests.filter((item) => item.status !== "COMPLETED").length;

  return <>
    <div className={adminStyles.head}>
      <div>
        <h1>계정 삭제 요청</h1>
        <p>메일 요청을 가입 계정에 연결해 전체 데이터를 삭제하고 완료 메일까지 보냅니다.</p>
      </div>
    </div>

    <div className={adminStyles.cards}>
      <div className={adminStyles.card}><span>처리 필요</span><strong>{openCount}건</strong></div>
      <div className={adminStyles.card}><span>최근 요청</span><strong>{requests.length}건</strong><small>최근 200건</small></div>
    </div>

    <section className={adminStyles.panel}>
      <div className={adminStyles.panelHead}><h2>받은 메일 등록</h2><small>본문은 저장하지 않습니다</small></div>
      <div className={styles.registerForm}>
        <label>메일을 보낸 주소<input type="email" value={requesterEmail} onChange={(event) => setRequesterEmail(event.target.value)} placeholder="requester@example.com" /></label>
        <label>가입 이메일이 다른 경우<input type="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} placeholder="비워 두면 발신 주소로 조회" /></label>
        <button type="button" disabled={busy === "create" || !requesterEmail.trim()} onClick={() => void createRequest()}>{busy === "create" ? "조회 중..." : "요청 등록 · 계정 조회"}</button>
      </div>
    </section>

    {message && <p className={styles.message} role="status">{message}</p>}

    <section className={adminStyles.panel}>
      <div className={adminStyles.panelHead}><h2>처리 목록</h2><small>{requests.length}건</small></div>
      {requests.length === 0 ? <p className={adminStyles.empty}>등록된 계정 삭제 요청이 없습니다.</p> : <div className={styles.queue}>
        {requests.map((item) => {
          const detail = previews[item.id];
          return <article key={item.id} className={styles.request} data-status={item.status}>
            <div className={styles.requestHead}>
              <div><b>{item.accountEmail ?? item.requesterEmail ?? "삭제 완료 요청"}</b><small>{kst(item.requestedAt)} · {item.source === "EMAIL_WEBHOOK" ? "메일 자동접수" : "관리자 등록"}</small></div>
              <span>{STATUS_LABEL[item.status]}</span>
            </div>
            {item.requesterEmail && item.accountEmail && item.requesterEmail !== item.accountEmail && <p className={styles.warning}>발신 주소와 가입 이메일이 다릅니다: {item.requesterEmail}</p>}
            {item.status === "NEEDS_ACCOUNT_EMAIL" && <div className={styles.linkAccount}>
              <input type="email" value={linkEmails[item.id] ?? ""} onChange={(event) => setLinkEmails((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="실제 가입 이메일" />
              <button type="button" disabled={busy === item.id} onClick={() => void linkAccount(item)}>계정 연결</button>
            </div>}
            {detail && <dl className={styles.preview}>
              <div><dt>가입</dt><dd>{kst(detail.createdAt)}</dd></div>
              <div><dt>지원 건</dt><dd>{detail.applicationCases}</dd></div>
              <div><dt>문서</dt><dd>{detail.documents}</dd></div>
              <div><dt>분석</dt><dd>{detail.analyses}</dd></div>
              <div><dt>결제</dt><dd>{detail.paidOrders}</dd></div>
              <div><dt>미사용 이용권</dt><dd>{detail.availableCredits}</dd></div>
            </dl>}
            {item.errorCode && <p className={styles.error}>실패 코드: {item.errorCode}</p>}
            <div className={styles.actions}>
              {(item.status === "READY" || item.status === "FAILED") && !detail && <button type="button" disabled={busy === item.id} onClick={() => void preview(item)}>삭제 대상 확인</button>}
              {(item.status === "READY" || item.status === "FAILED") && detail && <button type="button" className={styles.danger} disabled={busy === item.id} onClick={() => void execute(item)}>{busy === item.id ? "처리 중..." : "계정과 데이터 영구 삭제"}</button>}
              {item.status === "COMPLETED" && item.noticeStatus === "FAILED" && <button type="button" disabled={busy === item.id} onClick={() => void retryNotice(item)}>완료 메일 다시 보내기</button>}
              {item.status === "COMPLETED" && item.noticeStatus === "SENT" && <small>완료 메일 발송됨 · 개인정보 주소 제거됨</small>}
            </div>
          </article>;
        })}
      </div>}
    </section>
  </>;
}
