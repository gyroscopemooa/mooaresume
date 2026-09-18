"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, FolderPlus, Loader2, LogIn, Mail, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  legalCaseTypeSchema, legalDocumentTypeSchema, legalPartyRoleSchema, findLegalDocumentDefinition,
  LEGAL_CASE_TYPE_LABEL, LEGAL_CAUTIONS, LEGAL_PARTY_ROLE_LABEL,
  type LegalCase, type LegalCaseType, type LegalDocumentType, type LegalPartyRole,
} from "@/domain/legal-case";
import baseStyles from "./document-build-tool.module.css";
import legalStyles from "./legal-tool-design.module.css";

const styles = { ...baseStyles, ...legalStyles };

/**
 * 사건 목록과 "새 사건 만들기".
 *
 * 사건을 만드는 것과 자료를 넣는 것은 무료입니다. 값은 문서를 만들 때 받습니다 —
 * 자기 사건이 어떤 모양인지 보지도 못한 채로 결제부터 하라고 하면 아무도 하지
 * 않습니다.
 */
export function LegalCaseStarter({ initialCases, signedIn }: { initialCases: LegalCase[]; signedIn: boolean }) {
  const router = useRouter();
  const [cases] = useState(initialCases);
  const [title, setTitle] = useState("");
  const [caseType, setCaseType] = useState<LegalCaseType>("CIVIL");
  const [myRole, setMyRole] = useState<LegalPartyRole>("UNDECIDED");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  // 나홀로소송 드로어에서 문서 하나를 골라 들어온 경우입니다("/legal?doc=...").
  // 사건은 그대로 하나로 열되, 어느 사건을 고르거나 만들든 그 문서로 이어서
  // 갈 수 있게 caseId 뒤에 이 값을 그대로 붙여 보냅니다.
  const [docType, setDocType] = useState<LegalDocumentType | null>(null);

  useEffect(() => {
    const parsed = legalDocumentTypeSchema.safeParse(new URLSearchParams(window.location.search).get("doc"));
    if (!parsed.success) return;
    void Promise.resolve().then(() => setDocType(parsed.data));
  }, []);

  function caseHref(caseId: string): string {
    return docType ? `/legal/${caseId}?doc=${docType}` : `/legal/${caseId}`;
  }

  async function createCase() {
    if (!title.trim()) { setMessage("사건 이름을 적어 주세요. 나중에 목록에서 찾을 이름입니다."); return; }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/legal-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), caseType, myRole, summary }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setBusy(false);
        setMessage(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "사건을 만들지 못했습니다.");
        return;
      }
      const created = (body as { case?: LegalCase }).case;
      if (!created) { setBusy(false); setMessage("사건을 만들지 못했습니다."); return; }
      router.push(caseHref(created.id));
    } catch {
      setBusy(false);
      setMessage("사건을 만들지 못했습니다.");
    }
  }

  async function sendLoginCode() {
    if (!email.trim()) { setMessage("로그인 코드를 받을 이메일을 적어 주세요."); return; }
    setAuthBusy(true);
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/legal")}` },
    });
    setAuthBusy(false);
    if (error) { setMessage("로그인 코드를 보내지 못했습니다."); return; }
    setOtpSent(true);
    setMessage("이메일로 6자리 코드를 보냈습니다.");
  }

  async function verifyLoginCode() {
    if (!otpCode.trim()) { setMessage("받으신 코드를 적어 주세요."); return; }
    setAuthBusy(true);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: otpCode.trim(), type: "email" });
    setAuthBusy(false);
    if (error) { setMessage("코드가 올바르지 않거나 만료됐습니다."); return; }
    router.refresh();
  }

  async function continueWithGoogle() {
    setAuthBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/legal")}` },
    });
    if (error) { setAuthBusy(false); setMessage("Google 로그인을 시작하지 못했습니다."); }
  }

  return <section className={styles.page} aria-labelledby="legal-home-title">
    <div className={styles.head}>
      <span className={styles.eyebrow}>내 사건을 정리하는 공간</span>
      <h1 id="legal-home-title">복잡한 사건 자료,<br />서면 준비는 차근차근.</h1>
      <p>계약서부터 주고받은 문자까지, 사건별로 모아 두세요.<br />같은 자료를 바탕으로 필요한 문서의 초안을 만들고 확인할 수 있습니다.</p>
      {docType && <p><b>{findLegalDocumentDefinition(docType).label}</b>을(를) 고르고 들어오셨습니다. 아래에서 사건을 만들거나 고르면 그 문서로 이어집니다.</p>}
      <ol className={styles.steps} aria-label="서비스 이용 순서">
        <li><span>01</span><div><b>사건 만들기</b><small>이름과 상황을 정리해요</small></div></li>
        <li><span>02</span><div><b>자료 모으기</b><small>필요한 자료를 저장해요</small></div></li>
        <li><span>03</span><div><b>문서 작성·확인</b><small>문서별 결제 후 초안을 받아요</small></div></li>
      </ol>
    </div>

    <div className={styles.layout}>
      <div className={styles.card}>
        <p className={styles.sectionLabel}><FolderPlus />새 사건 만들기</p>

        <div className={styles.field}>
          <label htmlFor="new-case-title">사건 이름</label>
          <input id="new-case-title" type="text" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="예) OO에게 빌려준 대여금" />
          <small>나중에 목록에서 찾을 이름입니다. 실제 사건번호가 아니어도 됩니다.</small>
        </div>

        <div className={styles.field}>
          <label htmlFor="new-case-type">사건 종류</label>
          <select id="new-case-type" value={caseType} onChange={(event) => setCaseType(legalCaseTypeSchema.parse(event.target.value))}>
            {legalCaseTypeSchema.options.map((option) => <option key={option} value={option}>{LEGAL_CASE_TYPE_LABEL[option]}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="new-case-role">지금 어느 쪽이신가요</label>
          <select id="new-case-role" value={myRole} onChange={(event) => setMyRole(legalPartyRoleSchema.parse(event.target.value))}>
            {legalPartyRoleSchema.options.map((option) => <option key={option} value={option}>{LEGAL_PARTY_ROLE_LABEL[option]}</option>)}
          </select>
          <small>소장을 받으셨다면 답변서를, 소송을 거시려면 소장을 먼저 보여 드립니다.</small>
        </div>

        <div className={styles.field}>
          <label htmlFor="new-case-summary">사건 경위 <small>나중에 적어도 됩니다</small></label>
          <textarea
            id="new-case-summary"
            value={summary}
            maxLength={4_000}
            rows={6}
            onChange={(event) => setSummary(event.target.value)}
            placeholder={"언제 무슨 일이 있었는지 시간 순서대로 적어 주세요.\n예) 2024년 3월 1일 500만원을 빌려주고 차용증을 썼습니다. 9월까지 갚기로 했는데 아직 받지 못했습니다."}
          />
        </div>

        {message && <p className={styles.message} role="status"><AlertCircle />{message}</p>}

        {!signedIn && <div className={styles.login}>
          <b><LogIn /> 사건을 저장하려면 로그인이 필요합니다</b>
          <p>사건 자료는 본인만 볼 수 있게 계정에 묶여 저장됩니다.</p>
          <div className={styles.loginRow}>
            <button type="button" className={styles.googleButton} onClick={() => void continueWithGoogle()} disabled={authBusy}>Google로 계속하기</button>
            <span className={styles.or}>또는</span>
            <input type="email" autoComplete="email" aria-label="로그인 코드를 받을 이메일" value={email} placeholder="이메일" onChange={(event) => setEmail(event.target.value)} disabled={authBusy} />
            {otpSent
              ? <><input type="text" inputMode="numeric" autoComplete="one-time-code" aria-label="이메일 인증 코드" value={otpCode} placeholder="6자리 코드" onChange={(event) => setOtpCode(event.target.value)} disabled={authBusy} />
                <button type="button" onClick={() => void verifyLoginCode()} disabled={authBusy}>확인</button></>
              : <button type="button" onClick={() => void sendLoginCode()} disabled={authBusy}><Mail />코드 받기</button>}
          </div>
        </div>}

        <footer className={styles.footer}>
          <div className={styles.summary}>
            <b>사건 만들기는 무료입니다</b>
            <small>자료를 넣어 보고 무엇을 만들지 정한 뒤에 결제하시면 됩니다.</small>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.buy} disabled={busy || !signedIn} onClick={() => void createCase()}>
              {busy ? <><Loader2 className={styles.spin} />사건을 만드는 중</> : <>사건 만들기<ArrowRight /></>}
            </button>
          </div>
        </footer>

        {/* 사건을 만들기 전에 읽는 자리입니다. 한 줄짜리 고지는 만들어진 문서에
            따라붙지만, 시작하기 전에 알아야 하는 것은 목록으로 보여 줍니다. */}
        <div className={styles.disclaimer}>
          <b>쓰시기 전에 꼭 읽어 주세요</b>
          <ul>{LEGAL_CAUTIONS.map((caution, index) => <li key={index}>{caution}</li>)}</ul>
        </div>
      </div>

      <div className={`${styles.card} ${styles.previewCard}`}>
        <div className={styles.previewHead}>
          <p className={styles.sectionLabel}><Scale />내 사건</p>
          {cases.length > 0 && <span className={styles.sampleBadge}>{cases.length}건</span>}
        </div>

        {cases.length > 0
          ? <div className={styles.caseList}>
            {cases.map((item) => <button key={item.id} type="button" className={styles.caseCard} onClick={() => router.push(caseHref(item.id))}>
              <div>
                <b>{item.title}</b>
                <small>{LEGAL_CASE_TYPE_LABEL[item.caseType]} · {new Date(item.updatedAt).toLocaleDateString("ko-KR")} 수정</small>
              </div>
              <ArrowRight />
            </button>)}
          </div>
          : <div className={styles.emptyState}>
            <Scale />
            <p>{signedIn ? "아직 만든 사건이 없습니다. 새 사건을 만들어 자료를 정리해 보세요." : "로그인하면 저장한 사건을 여기서 이어갈 수 있습니다."}</p>
          </div>}
      </div>
    </div>
  </section>;
}
