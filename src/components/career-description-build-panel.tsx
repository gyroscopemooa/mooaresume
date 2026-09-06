"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, ArrowRight, Briefcase, CheckCircle2, Download, FileStack, FileText, Loader2, LogIn, Mail, Sparkles, Trash2, UploadCloud, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ARCHIVE_DOCUMENT_ACCEPT, extractLocalDocuments } from "@/lib/local-document";
import { CLASSIFIED_KIND_LABEL, CLASSIFIED_KIND_ORDER, classifyDocument, type ClassifiedKind } from "@/domain/document-classify";
import { checkUploads, describeRejections, formatBytes } from "@/domain/upload-limits";
import {
  CAREER_DESCRIPTION_BUILD_MAX_DIRECTION_CHARS, CAREER_DESCRIPTION_BUILD_MAX_FILES, CAREER_DESCRIPTION_BUILD_MAX_NARRATIVE_CHARS,
  CAREER_DESCRIPTION_BUILD_MIN_SOURCE_CHARS, CAREER_DESCRIPTION_BUILD_PRICE_KRW,
  countCareerDescriptionBuildSourceCharacters, describeCareerDescriptionBuildResult, formatCareerDescriptionDuration, hasEnoughCareerDescriptionBuildSource,
  careerDescriptionBuildOutputSchema, type CareerDescriptionBuildOutput, type CareerDescriptionBuildSource,
} from "@/domain/career-description-build";
import { careerDescriptionSampleOutput } from "@/fixtures/career-description-sample";
import { buildDocx, DOCX_MIME_TYPE, type DocxBlock } from "@/lib/docx";
import styles from "./document-build-tool.module.css";

/**
 * 경력기술서를 자료에서 만드는 유료 도구.
 *
 * 이력서 제작(`resume-build-panel.tsx`)과 입력 방식은 같습니다 — 줄글과 파일을
 * 함께 받습니다. 다른 점은 결과를 다른 화면의 폼에 얹지 않고, **이 화면
 * 오른쪽에 그대로 완성본으로 보여 준다**는 것입니다. 그래서 만들기 전에는
 * 예시 완성본을, 만든 뒤에는 실제 결과를 같은 자리에 놓습니다 — 자료를 붙여도
 * 왼쪽 입력 칸은 그대로 남아 있어 추가 설명을 계속 적을 수 있습니다.
 *
 * 결과는 서버에 저장하지 않습니다. 자료는 실행 요청에 실려 갔다가 응답과
 * 함께 사라지고, 완성된 문서는 이 브라우저에만(그리고 내려받은 DOCX 파일에만)
 * 남습니다.
 */

const SOURCE_STORAGE_KEY = "mooa.career-description-build.sources.v1";

type Phase = "idle" | "creating" | "running" | "done";

type StoredSources = { narrative: string; direction: string; sources: CareerDescriptionBuildSource[] };

function readStoredSources(): StoredSources | null {
  try {
    const raw = window.localStorage.getItem(SOURCE_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredSources>;
    if (!value || typeof value !== "object") return null;
    return {
      narrative: typeof value.narrative === "string" ? value.narrative : "",
      direction: typeof value.direction === "string" ? value.direction : "",
      sources: Array.isArray(value.sources) ? (value.sources as CareerDescriptionBuildSource[]) : [],
    };
  } catch {
    return null;
  }
}

function outputToDocxBlocks(output: CareerDescriptionBuildOutput): DocxBlock[] {
  const blocks: DocxBlock[] = [{ text: "경력기술서", style: "title" }];
  if (output.headline) blocks.push({ text: output.headline, style: "body" });
  for (const entry of output.entries) {
    const duration = formatCareerDescriptionDuration(entry.period);
    const periodLabel = [entry.period, duration].filter(Boolean).join(" · ");
    blocks.push({ text: [entry.company, periodLabel].filter(Boolean).join("   "), style: "heading" });
    const subLine = [entry.department, entry.roleTitle].filter(Boolean).join(" · ");
    if (subLine) blocks.push({ text: subLine, style: "body" });
    for (const duty of entry.duties) blocks.push({ text: `- ${duty}`, style: "body" });
    if (entry.achievement) blocks.push({ text: `- ${entry.achievement}`, style: "body" });
  }
  if (output.supportingFacts.length) {
    blocks.push({ text: "참고사항", style: "heading" });
    for (const fact of output.supportingFacts) {
      blocks.push({ text: `${fact.title}${fact.period ? ` (${fact.period})` : ""}${fact.detail ? ` — ${fact.detail}` : ""}`, style: "body" });
    }
  }
  if (output.notes.length) {
    blocks.push({ text: "확인이 필요합니다", style: "heading" });
    for (const note of output.notes) blocks.push({ text: `- ${note}`, style: "body" });
  }
  return blocks;
}

function EntryPreview({ entry }: { entry: CareerDescriptionBuildOutput["entries"][number] }) {
  const duration = formatCareerDescriptionDuration(entry.period);
  return <div className={styles.entry}>
    <div className={styles.entryHead}>
      <b>{entry.company || "회사명 미확인"}</b>
      <span>{[entry.period, duration].filter(Boolean).join(" · ")}</span>
    </div>
    {(entry.department || entry.roleTitle) && <p className={styles.entrySub}>{[entry.department, entry.roleTitle].filter(Boolean).join(" · ")}</p>}
    {entry.duties.length > 0 && <ul>{entry.duties.map((duty, index) => <li key={index}>{duty}</li>)}</ul>}
    {entry.achievement && <p className={styles.achievement}>{entry.achievement}</p>}
    {entry.evidence && <p className={styles.evidence}>근거: {entry.evidence}</p>}
  </div>;
}

function OutputPreview({ output }: { output: CareerDescriptionBuildOutput }) {
  return <>
    {output.headline && <p className={styles.previewHeadline}>{output.headline}</p>}
    {output.entries.length > 0
      ? <div className={styles.entries}>{output.entries.map((entry, index) => <EntryPreview key={index} entry={entry} />)}</div>
      : <p className={styles.entrySub}>자료에서 정리할 경력을 찾지 못했습니다.</p>}
    {output.supportingFacts.length > 0 && <>
      <p className={styles.supportTitle}>참고사항</p>
      <ul className={styles.support}>
        {output.supportingFacts.map((fact, index) => <li key={index}><b>{fact.title}</b> {fact.period && <span>({fact.period})</span>} {fact.detail && <span>— {fact.detail}</span>}</li>)}
      </ul>
    </>}
    {output.notes.length > 0 && <div className={styles.notes}>
      <b>확인이 필요합니다</b>
      <ul>{output.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
    </div>}
  </>;
}

export function CareerDescriptionBuildPanel() {
  const [narrative, setNarrative] = useState("");
  const [direction, setDirection] = useState("");
  const [sources, setSources] = useState<CareerDescriptionBuildSource[]>([]);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [truncated, setTruncated] = useState<string[]>([]);
  const [output, setOutput] = useState<CareerDescriptionBuildOutput | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const restored = useRef(false);

  const characters = countCareerDescriptionBuildSourceCharacters({ narrative, direction, sources });
  const enough = hasEnoughCareerDescriptionBuildSource({ narrative, direction, sources });

  useEffect(() => {
    if (!narrative && !direction && !sources.length) return;
    try {
      window.localStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify({ narrative, direction, sources }));
    } catch {
      // 자료가 커서 저장에 실패할 수 있습니다. 작성은 계속됩니다.
    }
  }, [narrative, direction, sources]);

  const runBuild = useCallback(async (targetBuildId: string, request: StoredSources) => {
    setPhase("running");
    setMessage("");
    try {
      const response = await fetch(`/api/career-description-builds/${targetBuildId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const error = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error : "경력기술서를 만들지 못했습니다.";
        setPhase("idle");
        setMessage(error);
        return;
      }
      const parsed = careerDescriptionBuildOutputSchema.safeParse((payload as { output?: unknown }).output);
      if (!parsed.success) {
        setPhase("idle");
        setMessage("결과를 읽지 못했습니다. 결제는 그대로 남아 있으니 다시 시도해 주세요.");
        return;
      }
      setOutput(parsed.data);
      setTruncated(Array.isArray((payload as { truncated?: unknown }).truncated) ? (payload as { truncated: string[] }).truncated : []);
      setPhase("done");
      try {
        window.localStorage.removeItem(SOURCE_STORAGE_KEY);
      } catch {
        // 지우지 못해도 다음 결제 때 새로 덮어씁니다.
      }
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      setPhase("idle");
      setMessage("연결이 끊겼습니다. 결제는 그대로 남아 있으니 다시 시도해 주세요.");
    }
  }, []);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    void (async () => {
      let member = false;
      try {
        const { data } = await createClient().auth.getUser();
        member = Boolean(data.user);
      } catch {
        member = false;
      }
      setSignedIn(member);

      const stored = readStoredSources();
      if (stored) {
        setNarrative(stored.narrative);
        setDirection(stored.direction);
        setSources(stored.sources);
      }
      const params = new URLSearchParams(window.location.search);
      const returned = params.get("career_description_build");
      if (!returned) return;
      setBuildId(returned);
      if (params.get("checkout") !== "success") return;
      if (!member) {
        setMessage("결제는 되었는데 로그인이 풀렸습니다. 아래에서 다시 로그인하시면 결제한 건으로 이어서 만들어 드립니다.");
        return;
      }
      if (!stored || !hasEnoughCareerDescriptionBuildSource(stored)) {
        setMessage("결제는 확인됐지만 적어 두신 자료를 이 브라우저에서 찾지 못했습니다. 자료를 다시 넣고 아래 '결제한 건으로 만들기'를 눌러 주세요.");
        return;
      }
      await runBuild(returned, stored);
    })();
  }, [runBuild]);

  async function addFiles(incoming: File[]) {
    if (!incoming.length) return;
    setMessage("");
    const bytes = sources.reduce((total, source) => total + source.sizeBytes, 0);
    const { accepted, rejected } = checkUploads(incoming, { count: sources.length, bytes });
    if (rejected.length) setMessage(describeRejections(rejected));
    if (!accepted.length) return;

    setReading(true);
    const added: CareerDescriptionBuildSource[] = [];
    for (const file of accepted) {
      try {
        const batch = await extractLocalDocuments(file);
        for (const document of batch.documents) {
          added.push({
            id: `${document.filename}-${document.sizeBytes}-${Math.random().toString(36).slice(2, 8)}`,
            filename: document.filename,
            extension: document.extension,
            sizeBytes: document.sizeBytes,
            text: document.text,
            kind: classifyDocument({ filename: document.filename, text: document.text }).kind,
            unreadable: document.unreadable,
          });
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : `${file.name}을(를) 읽지 못했습니다.`);
      }
    }
    setReading(false);
    setSources((current) => [...current, ...added].slice(0, CAREER_DESCRIPTION_BUILD_MAX_FILES));
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files ?? []));
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    void addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  async function sendLoginCode() {
    if (!email.trim()) { setMessage("로그인 코드를 받을 이메일을 적어 주세요."); return; }
    setAuthBusy(true);
    setMessage("");
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/career-description")}` },
    });
    setAuthBusy(false);
    if (error) { setMessage("로그인 코드를 보내지 못했습니다. 잠시 후 다시 시도해 주세요."); return; }
    setOtpSent(true);
    setMessage("이메일로 6자리 코드를 보냈습니다.");
  }

  async function verifyLoginCode() {
    if (!otpCode.trim()) { setMessage("받으신 코드를 적어 주세요."); return; }
    setAuthBusy(true);
    const { error } = await createClient().auth.verifyOtp({ email: email.trim(), token: otpCode.trim(), type: "email" });
    setAuthBusy(false);
    if (error) { setMessage("코드가 올바르지 않거나 만료됐습니다."); return; }
    setSignedIn(true);
    setMessage("");
  }

  async function continueWithGoogle() {
    setAuthBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/career-description")}` },
    });
    if (error) { setAuthBusy(false); setMessage("Google 로그인을 시작하지 못했습니다."); }
  }

  async function startCheckout() {
    setPhase("creating");
    setMessage("");
    try {
      const response = await fetch("/api/career-description-builds", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const payload: unknown = await response.json();
      if (response.status === 401) { setSignedIn(false); setPhase("idle"); setMessage("로그인이 필요합니다."); return; }
      if (!response.ok || !payload || typeof payload !== "object" || !("checkoutUrl" in payload) || typeof payload.checkoutUrl !== "string") {
        setPhase("idle");
        setMessage(payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "결제 페이지로 연결하지 못했습니다.");
        return;
      }
      window.location.assign(payload.checkoutUrl);
    } catch {
      setPhase("idle");
      setMessage("결제 페이지로 연결하지 못했습니다. 아무것도 청구되지 않았습니다.");
    }
  }

  function downloadDocx() {
    if (!output) return;
    const blob = new Blob([buildDocx(outputToDocxBlocks(output))], { type: DOCX_MIME_TYPE });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = "경력기술서.docx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const busy = phase === "creating" || phase === "running";

  return <section className={styles.page} id="career-description-build" aria-labelledby="career-description-build-title">
    <div className={styles.head}>
      <h1 id="career-description-build-title">자료를 모으면, 경력기술서로 정리해 드립니다</h1>
      <p>이력서·자기소개서·자격증·수료증·경력증명서를 올리거나 기억나는 대로 적어 주세요. 회사별로 소속·직무·기간·담당업무를 정리한 경력기술서 한 장으로 만들어 드립니다. <b>없는 경력은 지어내지 않습니다.</b></p>
      <div className={styles.priceRow}>
        <span className={styles.priceTag}><b>{CAREER_DESCRIPTION_BUILD_PRICE_KRW.toLocaleString()}원</b><small>&nbsp;· 1건 · 부가세 포함</small></span>
      </div>
    </div>

    <div className={styles.layout}>
      <div className={styles.card}>
        <p className={styles.sectionLabel}><FileStack />자료 입력</p>

        <div className={styles.field}>
          <label htmlFor="career-description-narrative">기억나는 대로 적기</label>
          <textarea
            id="career-description-narrative"
            value={narrative}
            maxLength={CAREER_DESCRIPTION_BUILD_MAX_NARRATIVE_CHARS}
            onChange={(event) => setNarrative(event.target.value)}
            placeholder={"예) 2022년 3월부터 지금까지 OO자동차부품 품질관리팀에서 사출 공정 검사와 SPC 관리를 맡고 있습니다.\n2021년에는 OO산업에서 6개월 정도 생산관리 인턴을 했습니다."}
            rows={7}
          />
          <small>{narrative.length.toLocaleString()} / {CAREER_DESCRIPTION_BUILD_MAX_NARRATIVE_CHARS.toLocaleString()}자 · 날짜가 정확하지 않아도 됩니다. 파일을 올려도 이 칸에 더 적을 수 있습니다.</small>
        </div>

        <div className={styles.field}>
          <label htmlFor="career-description-direction">만들 방향 <small>선택</small></label>
          <input
            id="career-description-direction"
            type="text"
            value={direction}
            maxLength={CAREER_DESCRIPTION_BUILD_MAX_DIRECTION_CHARS}
            onChange={(event) => setDirection(event.target.value)}
            placeholder="예) 심리상담사 채용에 맞춰서"
          />
          <small>어느 경험을 앞세울지만 바꿉니다. 없는 경험이나 자격을 새로 만들지는 않습니다.</small>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>자료 올리기 <small>선택 · 최대 {CAREER_DESCRIPTION_BUILD_MAX_FILES}개</small></span>
          <label
            className={`${styles.dropzone} ${dragging ? styles.dropzoneOn : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {reading ? <Loader2 className={styles.spin} /> : <UploadCloud />}
            <b>{reading ? "파일을 읽고 있습니다" : "여기로 끌어다 놓거나 눌러서 고르세요"}</b>
            <small>이력서 · 자기소개서 · 경력기술서 · 자격증 · 수료증 (PDF · DOCX · TXT · ZIP)</small>
            <input type="file" multiple accept={ARCHIVE_DOCUMENT_ACCEPT} onChange={onPick} disabled={busy} />
          </label>

          {sources.length > 0 && <ul className={styles.fileList}>
            {sources.map((source) => <li key={source.id}>
              <FileText />
              <div>
                <b>{source.filename}</b>
                <small>{formatBytes(source.sizeBytes)} · {source.unreadable ? "글자가 없는 스캔본 — 보낼 내용이 없습니다" : `${source.text.trim().length.toLocaleString()}자`}</small>
              </div>
              <select
                value={source.kind}
                aria-label={`${source.filename} 자료 종류`}
                onChange={(event) => setSources((current) => current.map((item) => (item.id === source.id ? { ...item, kind: event.target.value as ClassifiedKind } : item)))}
              >
                {(["UNSET", ...CLASSIFIED_KIND_ORDER] as ClassifiedKind[]).map((kind) => <option key={kind} value={kind}>{CLASSIFIED_KIND_LABEL[kind]}</option>)}
              </select>
              <button type="button" aria-label={`${source.filename} 빼기`} onClick={() => setSources((current) => current.filter((item) => item.id !== source.id))}><Trash2 /></button>
            </li>)}
          </ul>}
        </div>

        {message && <p className={styles.message}><AlertCircle />{message}</p>}

        {signedIn === false && <div className={styles.login}>
          <b><LogIn /> 결제와 결과 확인을 위해 로그인이 필요합니다</b>
          <p>적어 두신 자료는 이 브라우저에 그대로 남아 있습니다.</p>
          <div className={styles.loginRow}>
            <button type="button" className={styles.googleButton} onClick={() => void continueWithGoogle()} disabled={authBusy}>Google로 계속하기</button>
            <span className={styles.or}>또는</span>
            <input type="email" value={email} placeholder="이메일" onChange={(event) => setEmail(event.target.value)} disabled={authBusy} />
            {otpSent
              ? <><input type="text" inputMode="numeric" value={otpCode} placeholder="6자리 코드" onChange={(event) => setOtpCode(event.target.value)} disabled={authBusy} />
                <button type="button" onClick={() => void verifyLoginCode()} disabled={authBusy}>확인</button></>
              : <button type="button" onClick={() => void sendLoginCode()} disabled={authBusy}><Mail />코드 받기</button>}
          </div>
        </div>}

        <footer className={styles.footer}>
          <div className={styles.summary}>
            <b>{characters.toLocaleString()}자</b>
            <small>{enough ? "이 정도면 정리할 수 있습니다." : `최소 ${CAREER_DESCRIPTION_BUILD_MIN_SOURCE_CHARS}자는 필요합니다. 경력을 조금 더 적거나 파일을 올려 주세요.`}</small>
          </div>
          <div className={styles.actions}>
            {buildId && phase !== "done" && <button type="button" className={styles.ghost} disabled={busy || !enough} onClick={() => void runBuild(buildId, { narrative, direction, sources })}>결제한 건으로 만들기</button>}
            <button
              type="button"
              className={styles.buy}
              disabled={busy || !enough || !signedIn}
              title={!signedIn ? "로그인 후 결제할 수 있습니다." : enough ? undefined : "자료가 조금 더 필요합니다."}
              onClick={() => void startCheckout()}
            >
              {busy ? <><Loader2 className={styles.spin} />{phase === "running" ? "경력기술서를 만드는 중" : "결제 페이지로 이동 중"}</> : <>{CAREER_DESCRIPTION_BUILD_PRICE_KRW.toLocaleString()}원 · AI로 만들기<ArrowRight /></>}
            </button>
          </div>
          <p className={styles.terms}>1건 정액 {CAREER_DESCRIPTION_BUILD_PRICE_KRW.toLocaleString()}원(부가세 포함). 올린 자료는 경력기술서를 만드는 데만 쓰이고 서버에 저장하지 않습니다. 결과가 나오지 않으면 결제한 건이 그대로 남아 다시 시도할 수 있고, 그래도 실패하면 환불해 드립니다.</p>
        </footer>

        {sources.some((source) => source.unreadable) && <p className={styles.scanNote}><X />글자가 없는 스캔본은 읽지 못합니다. 사진으로 된 증명서라면 그 내용을 위 칸에 직접 적어 주세요.</p>}
      </div>

      <div className={`${styles.card} ${styles.previewCard}`}>
        <div className={styles.previewHead}>
          <p className={styles.sectionLabel}><Briefcase />완성본</p>
          {phase === "done"
            ? <span className={styles.doneBadge}><CheckCircle2 />내 결과</span>
            : <span className={styles.sampleBadge}>예시</span>}
        </div>

        {phase === "running" && <div className={styles.emptyState}>
          <Loader2 className={styles.spin} />
          <p>자료를 읽고 경력기술서를 만들고 있습니다. 최대 3분 정도 걸립니다.</p>
        </div>}

        {phase !== "running" && <OutputPreview output={phase === "done" && output ? output : careerDescriptionSampleOutput} />}

        {phase === "done" && output && <>
          <p className={styles.entrySub} style={{ marginTop: 14 }}>{describeCareerDescriptionBuildResult(output)} 적힌 내용이 사실과 맞는지는 본인이 확인해 주세요.</p>
          {truncated.length > 0 && <p className={styles.evidence}>자료가 많아 다 읽지 못한 것: {truncated.join(", ")}</p>}
          <div className={styles.downloadRow}>
            <button type="button" className={styles.download} onClick={downloadDocx}><Download />DOCX로 저장</button>
          </div>
        </>}

        {phase !== "done" && <p className={styles.evidence} style={{ marginTop: 14 }}><Sparkles style={{ width: 11, verticalAlign: "-1px" }} /> 자료를 넣고 만들면 이 자리가 실제 결과로 바뀝니다.</p>}
      </div>
    </div>
  </section>;
}
