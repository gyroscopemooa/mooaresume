"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./final-test.module.css";
import adminStyles from "../admin.module.css";

/**
 * 관리자 FINAL 테스트 콘솔의 버튼들. 모두 관리자 API(/api/meensoo/final-test/*)를 부르고,
 * 서버가 관리자 쿠키·로그인 세션·승인된 테스트 계정을 다시 확인한다. 이 화면이 보낸 isAdmin 같은 값은 없다.
 */

type Result = { ok: boolean; message: string };

async function call(path: string, method: string, body?: unknown): Promise<{ ok: boolean; status: number; payload: Record<string, unknown> }> {
  try {
    const response = await fetch(path, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: response.ok, status: response.status, payload };
  } catch {
    return { ok: false, status: 0, payload: { error: "연결이 끊겼습니다." } };
  }
}

function errorText(payload: Record<string, unknown>, status: number): string {
  if (typeof payload.error === "string") return payload.error;
  return status === 404 ? "권한이 없거나 설정이 없습니다(관리자 로그인·승인된 테스트 계정·환경변수를 확인해 주세요)." : "처리하지 못했습니다.";
}

function Message({ result }: { result: Result | null }) {
  if (!result) return null;
  return <p className={styles.msg} data-kind={result.ok ? "ok" : "err"} role="status">{result.message}</p>;
}

// ───────────────────────── 샘플로 테스트 팩 만들기 ─────────────────────────

export function SamplePackButtons({ samples, disabled }: { samples: Array<{ id: string; title: string; summary: string; watch: string[] }>; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function create(sampleId: string) {
    setBusy(sampleId);
    setResult(null);
    const response = await call("/api/meensoo/final-test/packs", "POST", { source: "sample", sampleId });
    setBusy(null);
    if (response.ok && typeof response.payload.url === "string") {
      router.push(response.payload.url);
      return;
    }
    setResult({ ok: false, message: errorText(response.payload, response.status) });
  }

  return <>
    <div className={styles.samples}>
      {samples.map((sample) => <div className={styles.sample} key={sample.id}>
        <h3>{sample.title}</h3>
        <p>{sample.summary}</p>
        <details>
          <summary>기대 동작(눈으로 확인할 것)</summary>
          <ul>{sample.watch.map((line) => <li key={line}>{line}</li>)}</ul>
        </details>
        <div className={styles.row}>
          <button type="button" className={styles.btn} disabled={disabled || busy !== null} onClick={() => void create(sample.id)}>{busy === sample.id ? "만드는 중…" : "이 샘플로 실제 AI 테스트 팩 만들기"}</button>
        </div>
      </div>)}
    </div>
    <Message result={result} />
  </>;
}

// ───────────────────────── 내 자료 세트 ─────────────────────────

type SetRow = { id: string; name: string; createdAt: string; docCount: number };
const KIND_OPTIONS = [
  ["resume", "이력서"], ["cover_letter", "자기소개서"], ["job_posting", "채용공고"], ["experience", "경력·경험"], ["note", "메모"], ["other", "기타"],
] as const;

export function MaterialSetManager({ sets, disabled }: { sets: SetRow[]; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [docs, setDocs] = useState([{ kind: "resume", title: "이력서", text: "" }, { kind: "cover_letter", title: "자기소개서", text: "" }]);

  async function save() {
    setBusy("save");
    setResult(null);
    const filled = docs.filter((doc) => doc.text.trim().length > 0);
    const response = await call("/api/meensoo/final-test/material-sets", "POST", { name, company, role, docs: filled.map((doc) => ({ ...doc, title: doc.title.trim() || "자료" })) });
    setBusy(null);
    if (response.ok) {
      setResult({ ok: true, message: "저장했습니다. 이제 아래 목록에서 언제든 불러와 테스트 팩을 만들 수 있어요." });
      setName("");
      setDocs(docs.map((doc) => ({ ...doc, text: "" })));
      router.refresh();
    } else {
      setResult({ ok: false, message: errorText(response.payload, response.status) });
    }
  }

  async function createFrom(setId: string) {
    setBusy(setId);
    setResult(null);
    const response = await call("/api/meensoo/final-test/packs", "POST", { source: "material_set", setId });
    setBusy(null);
    if (response.ok && typeof response.payload.url === "string") router.push(response.payload.url);
    else setResult({ ok: false, message: errorText(response.payload, response.status) });
  }

  async function remove(setId: string) {
    setBusy(setId);
    const response = await call("/api/meensoo/final-test/material-sets", "DELETE", { setId });
    setBusy(null);
    if (response.ok) router.refresh();
    else setResult({ ok: false, message: errorText(response.payload, response.status) });
  }

  return <>
    {sets.length === 0 ? <p className={adminStyles.empty}>저장한 자료 세트가 없습니다. 아래에서 한 번만 붙여 넣어 저장해 두세요.</p> : <div className={adminStyles.scroll}>
      <table className={adminStyles.table}>
        <thead><tr><th>이름</th><th>문서</th><th>저장</th><th></th></tr></thead>
        <tbody>{sets.map((set) => <tr key={set.id}>
          <td>{set.name}</td><td>{set.docCount}개</td><td>{new Date(set.createdAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })}</td>
          <td><div className={styles.row}>
            <button type="button" className={styles.btn} data-size="sm" disabled={disabled || busy !== null} onClick={() => void createFrom(set.id)}>불러와 실제 AI 테스트 팩 만들기</button>
            <button type="button" className={styles.btn} data-size="sm" data-variant="danger" disabled={busy !== null} onClick={() => void remove(set.id)}>삭제</button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>}

    <form className={styles.body} onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <p><b>내 자료 세트 저장</b> — 내 이력서·자소서·공고를 한 번만 붙여 넣어 두면, 매번 다시 입력하지 않고 불러올 수 있어요. 자료는 이 서버의 관리자 전용 표에만 저장됩니다.</p>
      <div className={styles.fields3}>
        <div className={styles.field}><label htmlFor="set-name">세트 이름</label><input id="set-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="예: 내 자료 기본" /></div>
        <div className={styles.field}><label htmlFor="set-company">지원 회사(선택)</label><input id="set-company" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={120} /></div>
        <div className={styles.field}><label htmlFor="set-role">지원 직무(선택)</label><input id="set-role" value={role} onChange={(event) => setRole(event.target.value)} maxLength={120} /></div>
      </div>
      {docs.map((doc, index) => <div className={styles.field} key={index}>
        <div className={styles.fields3}>
          <div className={styles.field}><label htmlFor={`doc-kind-${index}`}>종류</label><select id={`doc-kind-${index}`} value={doc.kind} onChange={(event) => setDocs(docs.map((entry, at) => (at === index ? { ...entry, kind: event.target.value } : entry)))}>{KIND_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <div className={styles.field}><label htmlFor={`doc-title-${index}`}>이름</label><input id={`doc-title-${index}`} value={doc.title} maxLength={120} onChange={(event) => setDocs(docs.map((entry, at) => (at === index ? { ...entry, title: event.target.value } : entry)))} /></div>
        </div>
        <label htmlFor={`doc-text-${index}`}>내용(문서당 2만 자까지)</label>
        <textarea id={`doc-text-${index}`} value={doc.text} maxLength={20000} onChange={(event) => setDocs(docs.map((entry, at) => (at === index ? { ...entry, text: event.target.value } : entry)))} placeholder="여기에 붙여 넣어 주세요" />
      </div>)}
      <div className={styles.row}>
        {docs.length < 8 && <button type="button" className={styles.btn} data-variant="quiet" data-size="sm" onClick={() => setDocs([...docs, { kind: "experience", title: "경험", text: "" }])}>문서 칸 추가</button>}
        <button type="submit" className={styles.btn} disabled={disabled || busy !== null || !name.trim() || !docs.some((doc) => doc.text.trim())}>{busy === "save" ? "저장 중…" : "자료 세트 저장"}</button>
      </div>
    </form>
    <Message result={result} />
  </>;
}

// ───────────────────────── 내 FINAL 결과 복제 ─────────────────────────

export function CloneRuns({ runs, disabled }: { runs: Array<{ id: string; completedAt: string | null; company: string; role: string }>; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function clone(analysisRunId: string) {
    setBusy(analysisRunId);
    setResult(null);
    const response = await call("/api/meensoo/final-test/packs", "POST", { source: "clone_run", analysisRunId });
    setBusy(null);
    if (response.ok && typeof response.payload.url === "string") router.push(response.payload.url);
    else setResult({ ok: false, message: errorText(response.payload, response.status) });
  }

  return <>
    {runs.length === 0 ? <p className={adminStyles.empty}>이 계정으로 완료된 FINAL 결과가 아직 없습니다. 아래 ‘FINAL 전체 흐름 테스트’로 하나 만들면 여기에 나타납니다.</p> : <div className={adminStyles.scroll}>
      <table className={adminStyles.table}>
        <thead><tr><th>완료</th><th>회사 · 직무</th><th></th></tr></thead>
        <tbody>{runs.map((run) => <tr key={run.id}>
          <td>{run.completedAt ? new Date(run.completedAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Seoul" }) : "—"}</td>
          <td>{[run.company, run.role].filter(Boolean).join(" · ") || "(이름 없음)"}</td>
          <td><button type="button" className={styles.btn} data-size="sm" disabled={disabled || busy !== null} onClick={() => void clone(run.id)}>{busy === run.id ? "복제 중…" : "복제해서 실제 AI 테스트"}</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <Message result={result} />
  </>;
}

// ───────────────────────── 테스트 팩 목록·초기화 ─────────────────────────

export function PacksTable({ packs }: { packs: Array<{ id: string; label: string | null; origin: string; createdAt: string; initialGeneratedAt: string | null; materialsVersion: number }> }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function reset() {
    if (selected.size === 0) return;
    setBusy(true);
    const response = await call("/api/meensoo/final-test/packs/reset", "POST", { packIds: [...selected] });
    setBusy(false);
    if (response.ok) {
      setSelected(new Set());
      setResult({ ok: true, message: `${String(response.payload.deleted)}개 테스트 팩을 초기화했습니다. AI 호출 기록(하루 한도·비용)은 그대로 남습니다.` });
      router.refresh();
    } else {
      setResult({ ok: false, message: errorText(response.payload, response.status) });
    }
  }

  if (packs.length === 0) return <p className={adminStyles.empty}>만든 테스트 팩이 없습니다.</p>;
  return <>
    <div className={adminStyles.scroll}>
      <table className={adminStyles.table}>
        <thead><tr><th></th><th>이름</th><th>종류</th><th>만든 시각</th><th>답변 생성</th><th>자료 버전</th><th></th></tr></thead>
        <tbody>{packs.map((pack) => <tr key={pack.id}>
          <td><input type="checkbox" aria-label="초기화할 팩 선택" checked={selected.has(pack.id)} onChange={(event) => setSelected((previous) => { const next = new Set(previous); if (event.target.checked) next.add(pack.id); else next.delete(pack.id); return next; })} /></td>
          <td>{pack.label ?? "(이름 없음)"}</td>
          <td>{pack.origin === "admin_snapshot" ? "가상·복제 자료" : "테스트 이용권 FINAL"}</td>
          <td>{new Date(pack.createdAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Seoul" })}</td>
          <td>{pack.initialGeneratedAt ? "생성함" : "아직"}</td>
          <td>v{pack.materialsVersion}</td>
          <td><a className={styles.btn} data-size="sm" data-variant="ghost" href={`/meensoo/final-test/pack/${pack.id}`}>열기</a></td>
        </tr>)}</tbody>
      </table>
    </div>
    <div className={styles.body}>
      <div className={styles.row}>
        <button type="button" className={styles.btn} data-variant="danger" disabled={busy || selected.size === 0} onClick={() => void reset()}>{busy ? "초기화 중…" : `선택한 ${selected.size}개 초기화`}</button>
      </div>
      <p>초기화는 선택한 <b>테스트 팩</b>과 그 자료·답변·사용량만 지웁니다. 실제 구매 건과 FINAL 결과 자체는 건드리지 않고, AI 호출 원장은 남아 하루 실행 한도가 리셋되지 않습니다.</p>
      <Message result={result} />
    </div>
  </>;
}

// ───────────────────────── 테스트 이용권 ─────────────────────────

type GrantView = { id: string; targetEmail: string | null; maxUses: number; usedCount: number; expiresAt: string; revokedAt: string | null; note: string | null; status: "valid" | "revoked" | "expired" | "exhausted" };
const GRANT_STATE: Record<GrantView["status"], string> = { valid: "유효", revoked: "회수됨", expired: "만료", exhausted: "다 씀" };

export function GrantManager({ approvedEmails, defaultEmail, grants, disabled }: { approvedEmails: string[]; defaultEmail: string; grants: GrantView[]; disabled: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [maxUses, setMaxUses] = useState(2);
  const [ttlHours, setTtlHours] = useState(24);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function issue() {
    setBusy("issue");
    setResult(null);
    const response = await call("/api/meensoo/final-test/grants", "POST", { targetEmail: email, maxUses, ttlHours, note: note || undefined });
    setBusy(null);
    if (response.ok) {
      setResult({ ok: true, message: "테스트 FINAL 이용권을 발급했습니다. 대상 계정으로 FINAL 입력 화면에서 ‘테스트 이용권으로 분석 시작’이 보입니다." });
      router.refresh();
    } else {
      setResult({ ok: false, message: errorText(response.payload, response.status) });
    }
  }

  async function revoke(grantId: string) {
    setBusy(grantId);
    const response = await call("/api/meensoo/final-test/grants/revoke", "POST", { grantId });
    setBusy(null);
    if (response.ok) router.refresh();
    else setResult({ ok: false, message: errorText(response.payload, response.status) });
  }

  return <>
    {grants.length === 0 ? <p className={adminStyles.empty}>발급한 테스트 이용권이 없습니다.</p> : <div className={adminStyles.scroll}>
      <table className={adminStyles.table}>
        <thead><tr><th>대상 계정</th><th>남은 횟수</th><th>만료</th><th>상태</th><th>메모</th><th></th></tr></thead>
        <tbody>{grants.map((grant) => {
          const state = GRANT_STATE[grant.status];
          return <tr key={grant.id}>
            <td>{grant.targetEmail ?? "(알 수 없음)"}</td>
            <td>{Math.max(0, grant.maxUses - grant.usedCount)} / {grant.maxUses}</td>
            <td>{new Date(grant.expiresAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Seoul" })}</td>
            <td><span className={`${adminStyles.pill} ${state === "유효" ? adminStyles.pillOk : adminStyles.pillMuted}`}>{state}</span></td>
            <td>{grant.note ?? ""}</td>
            <td>{grant.status === "valid" && <button type="button" className={styles.btn} data-size="sm" data-variant="danger" disabled={busy !== null} onClick={() => void revoke(grant.id)}>회수</button>}</td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
    <form className={styles.body} onSubmit={(event) => { event.preventDefault(); void issue(); }}>
      <p><b>테스트 이용권 발급</b> — 결제 주문·영수증·매출을 만들지 않고, 실제 FINAL 분석이 쓰는 이용권 한 장만 테스트 출처로 만듭니다. 받을 수 있는 계정은 서버 환경변수의 승인된 테스트 계정뿐입니다.</p>
      <div className={styles.fields3}>
        <div className={styles.field}><label htmlFor="grant-email">받는 계정</label><select id="grant-email" value={email} onChange={(event) => setEmail(event.target.value)}>{approvedEmails.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></div>
        <div className={styles.field}><label htmlFor="grant-uses">사용 횟수(1~5)</label><input id="grant-uses" type="number" min={1} max={5} value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))} /></div>
        <div className={styles.field}><label htmlFor="grant-ttl">유효 시간(1~72시간)</label><input id="grant-ttl" type="number" min={1} max={72} value={ttlHours} onChange={(event) => setTtlHours(Number(event.target.value))} /></div>
      </div>
      <div className={styles.field}><label htmlFor="grant-note">메모(선택)</label><input id="grant-note" value={note} maxLength={300} onChange={(event) => setNote(event.target.value)} placeholder="예: 면접팩 회귀 점검" /></div>
      <div className={styles.row}><button type="submit" className={styles.btn} disabled={disabled || busy !== null || approvedEmails.length === 0}>{busy === "issue" ? "발급 중…" : "테스트 이용권 발급"}</button></div>
    </form>
    <Message result={result} />
  </>;
}
