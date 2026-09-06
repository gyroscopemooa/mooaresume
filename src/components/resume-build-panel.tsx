"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, LogIn, Mail, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ARCHIVE_DOCUMENT_ACCEPT, extractLocalDocuments } from "@/lib/local-document";
import { CLASSIFIED_KIND_LABEL, CLASSIFIED_KIND_ORDER, classifyDocument, type ClassifiedKind } from "@/domain/document-classify";
import { checkUploads, describeRejections, formatBytes } from "@/domain/upload-limits";
import {
  RESUME_BUILD_MAX_FILES, RESUME_BUILD_MAX_NARRATIVE_CHARS, RESUME_BUILD_MIN_SOURCE_CHARS, RESUME_BUILD_PRICE_KRW,
  countResumeBuildSourceCharacters, hasEnoughResumeBuildSource,
  resumeBuildOutputSchema, type ResumeBuildOutput, type ResumeBuildSource,
} from "@/domain/resume-build";
import styles from "./resume-build-panel.module.css";

/**
 * AI 이력서 제작 — 무료 메이커 아래에 붙는 유료 칸.
 *
 * 위 도구는 칸을 나눠 줄 뿐이라, 채우는 일은 여전히 본인 몫입니다. 경력증명서를
 * 열어 놓고 회사 이름과 기간을 옮겨 적는 그 30분이 여기서 파는 것입니다.
 *
 * 입력은 두 갈래를 **함께** 받습니다. 파일만 있는 사람도, 파일이 하나도 없고
 * 기억만 있는 사람도 있기 때문입니다. 후자가 더 흔합니다 — 경력증명서는 회사에
 * 요청해야 나오고, 아르바이트·단기 근무는 아예 서류가 없습니다.
 *
 * 결과는 서버에 저장하지 않습니다. 위 메이커가 "서버로 보내지 않습니다"라고
 * 약속했고, 이 칸 때문에 그 약속을 깨면 안 됩니다. 자료는 실행 요청에 실려
 * 갔다가 응답과 함께 사라지고, 채워진 이력서는 이 브라우저에만 남습니다.
 */

const SOURCE_STORAGE_KEY = "mooa.resume-build.sources.v1";

type Phase = "idle" | "creating" | "running" | "done";

type StoredSources = { narrative: string; sources: ResumeBuildSource[] };

function readStoredSources(): StoredSources | null {
  try {
    const raw = window.localStorage.getItem(SOURCE_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredSources>;
    if (!value || typeof value !== "object") return null;
    return {
      narrative: typeof value.narrative === "string" ? value.narrative : "",
      sources: Array.isArray(value.sources) ? (value.sources as ResumeBuildSource[]) : [],
    };
  } catch {
    return null;
  }
}

export function ResumeBuildPanel() {
  const [narrative, setNarrative] = useState("");
  const [sources, setSources] = useState<ResumeBuildSource[]>([]);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [truncated, setTruncated] = useState<string[]>([]);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const restored = useRef(false);

  const characters = countResumeBuildSourceCharacters({ narrative, sources });
  const enough = hasEnoughResumeBuildSource({ narrative, sources });

  /** 결제하러 나갔다 돌아오면 적어 둔 자료가 그대로 있어야 합니다. */
  useEffect(() => {
    if (!narrative && !sources.length) return;
    try {
      window.localStorage.setItem(SOURCE_STORAGE_KEY, JSON.stringify({ narrative, sources }));
    } catch {
      // 자료가 커서 저장에 실패할 수 있습니다. 작성은 계속됩니다.
    }
  }, [narrative, sources]);

  const runBuild = useCallback(async (targetBuildId: string, request: StoredSources) => {
    setPhase("running");
    setMessage("");
    try {
      const response = await fetch(`/api/resume-builds/${targetBuildId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const error = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error : "이력서를 만들지 못했습니다.";
        setPhase("idle");
        setMessage(error);
        return;
      }
      const parsed = resumeBuildOutputSchema.safeParse((payload as { output?: unknown }).output);
      if (!parsed.success) {
        setPhase("idle");
        setMessage("결과를 읽지 못했습니다. 결제는 그대로 남아 있으니 다시 시도해 주세요.");
        return;
      }
      const output: ResumeBuildOutput = parsed.data;
      // 위 메이커가 듣고 자기 칸에 얹습니다. 이 칸이 이력서 상태를 직접 들고
      // 있지 않은 이유는, 두 곳에서 같은 값을 고치면 어느 한쪽이 반드시
      // 옛 값을 덮어쓰기 때문입니다.
      window.dispatchEvent(new CustomEvent<ResumeBuildOutput>("mooa:resume-build-filled", { detail: output }));
      setNotes(output.notes);
      setTruncated(Array.isArray((payload as { truncated?: unknown }).truncated) ? (payload as { truncated: string[] }).truncated : []);
      setPhase("done");
      try {
        window.localStorage.removeItem(SOURCE_STORAGE_KEY);
      } catch {
        // 지우지 못해도 다음 결제 때 새로 덮어씁니다.
      }
      // 주소에서 결제 흔적을 지웁니다. 남겨 두면 새로고침할 때마다 "결제한
      // 건"을 다시 실행하려다 이미 쓴 건이라는 오류를 만나게 됩니다.
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      setPhase("idle");
      setMessage("연결이 끊겼습니다. 결제는 그대로 남아 있으니 다시 시도해 주세요.");
    }
  }, []);

  /**
   * 화면을 열 때 한 번: 로그인 상태를 확인하고, 적어 뒀던 자료를 되살리고,
   * 결제를 마치고 돌아온 길이면 바로 실행합니다.
   *
   * 셋을 한 줄로 묶은 이유는 순서가 있기 때문입니다. Polar가
   * `?resume_build=...&checkout=success`로 되돌려 보내면 바로 실행해야 하는데
   * (여기서 단추를 한 번 더 누르게 하면 결제하고 나간 사람의 절반은 그 단추를
   * 못 찾습니다), 실행 요청에는 로그인 세션이 필요합니다. 세션 확인을 기다리지
   * 않고 부르면 결제를 마친 사람이 401을 받습니다.
   */
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
        setSources(stored.sources);
      }
      const params = new URLSearchParams(window.location.search);
      const returned = params.get("resume_build");
      if (!returned) return;
      setBuildId(returned);
      if (params.get("checkout") !== "success") return;
      if (!member) {
        setMessage("결제는 되었는데 로그인이 풀렸습니다. 아래에서 다시 로그인하시면 결제한 건으로 이어서 만들어 드립니다.");
        return;
      }
      if (!stored || !hasEnoughResumeBuildSource(stored)) {
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
    const added: ResumeBuildSource[] = [];
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
    setSources((current) => [...current, ...added].slice(0, RESUME_BUILD_MAX_FILES));
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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/resume")}` },
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
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/resume")}` },
    });
    if (error) { setAuthBusy(false); setMessage("Google 로그인을 시작하지 못했습니다."); }
  }

  /** 결제창으로 보냅니다. 자료는 보내지 않습니다 — 결제 전에 서버에 둘 이유가 없습니다. */
  async function startCheckout() {
    setPhase("creating");
    setMessage("");
    try {
      const response = await fetch("/api/resume-builds", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
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

  const busy = phase === "creating" || phase === "running";

  return <section className={styles.panel} id="resume-ai-build" aria-labelledby="resume-ai-build-title">
    <header className={styles.head}>
      <span className={styles.kicker}>AI RESUME BUILD · 유료</span>
      <h2 id="resume-ai-build-title">자료를 던져 두면, 칸은 이쪽에서 채웁니다</h2>
      <p>경력증명서·재직증명서·예전 이력서를 올리거나, 기억나는 대로 줄글로 적어 주세요. 위 이력서의 경력·학력·자격 칸으로 옮겨 적어 드립니다. <b>없는 경력을 지어내지 않습니다</b> — 자료로 확인되지 않는 칸은 비워 두고 무엇이 없는지 알려 드립니다.</p>
    </header>

    <div className={styles.grid}>
      <div className={styles.field}>
        <label htmlFor="resume-build-narrative">기억나는 대로 적기</label>
        <textarea
          id="resume-build-narrative"
          value={narrative}
          maxLength={RESUME_BUILD_MAX_NARRATIVE_CHARS}
          onChange={(event) => setNarrative(event.target.value)}
          placeholder={"예) 2021년 3월부터 2023년 5월까지 OO전자 품질관리팀에서 일했습니다. 사출 공정 검사랑 SPC 관리했고, 2023년 6월부터 지금까지는 OO산업에서 생산관리 하고 있어요.\n2019년에 XX대학교 기계공학과 졸업했고, 지게차 운전기능사랑 컴활 2급 있습니다."}
          rows={9}
        />
        <small>{narrative.length.toLocaleString()} / {RESUME_BUILD_MAX_NARRATIVE_CHARS.toLocaleString()}자 · 날짜가 정확하지 않아도 됩니다. 아는 만큼만 적으세요.</small>
      </div>

      <div className={styles.field}>
        <span className={styles.fieldLabel}>자료 올리기 <small>선택 · 최대 {RESUME_BUILD_MAX_FILES}개</small></span>
        <label
          className={`${styles.dropzone} ${dragging ? styles.dropzoneOn : ""}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          {reading ? <Loader2 className={styles.spin} /> : <UploadCloud />}
          <b>{reading ? "파일을 읽고 있습니다" : "여기로 끌어다 놓거나 눌러서 고르세요"}</b>
          <small>경력증명서 · 재직증명서 · 예전 이력서 · 경력기술서 (PDF · DOCX · TXT · ZIP)</small>
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
              {/* 분류를 못 고른 파일도 목록에 그대로 있어야 합니다. UNSET이
                  선택지에 없으면 그 파일의 선택 칸이 남의 종류를 가리킵니다. */}
              {(["UNSET", ...CLASSIFIED_KIND_ORDER] as ClassifiedKind[]).map((kind) => <option key={kind} value={kind}>{CLASSIFIED_KIND_LABEL[kind]}</option>)}
            </select>
            <button type="button" aria-label={`${source.filename} 빼기`} onClick={() => setSources((current) => current.filter((item) => item.id !== source.id))}><Trash2 /></button>
          </li>)}
        </ul>}
      </div>
    </div>

    {phase === "done" && <div className={styles.result}>
      <CheckCircle2 />
      <div>
        <b>위 이력서에 채웠습니다. 화면 맨 위에서 확인하고 고치세요.</b>
        {notes.length > 0 && <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>}
        {truncated.length > 0 && <p className={styles.truncated}>자료가 많아 다 읽지 못한 것: {truncated.join(", ")}</p>}
        <p className={styles.resultFoot}>적힌 내용이 사실과 맞는지는 본인이 확인해 주세요. 자료에 없던 것은 채우지 않았습니다.</p>
      </div>
    </div>}

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
        <small>{enough ? "이 정도면 채울 수 있습니다." : `최소 ${RESUME_BUILD_MIN_SOURCE_CHARS}자는 필요합니다. 이력을 조금 더 적거나 파일을 올려 주세요.`}</small>
      </div>
      <div className={styles.actions}>
        {buildId && phase !== "done" && <button type="button" className={styles.ghost} disabled={busy || !enough} onClick={() => void runBuild(buildId, { narrative, sources })}>결제한 건으로 만들기</button>}
        {/* 로그인·자료가 모자라면 감추지 않고 비활성으로 둡니다. 단추가 통째로
            사라지면 왜 못 사는지 알 방법이 없습니다. 이유는 title에 적습니다. */}
        <button
          type="button"
          className={styles.buy}
          disabled={busy || !enough || !signedIn}
          title={!signedIn ? "로그인 후 결제할 수 있습니다." : enough ? undefined : "자료가 조금 더 필요합니다."}
          onClick={() => void startCheckout()}
        >
          {busy ? <><Loader2 className={styles.spin} />{phase === "running" ? "이력서를 만드는 중" : "결제 페이지로 이동 중"}</> : <><Sparkles />{RESUME_BUILD_PRICE_KRW.toLocaleString()}원 · AI로 이력서 만들기</>}
        </button>
      </div>
      <p className={styles.terms}>1건 정액 {RESUME_BUILD_PRICE_KRW.toLocaleString()}원(부가세 포함). 올린 자료는 이력서를 만드는 데만 쓰이고 서버에 저장하지 않습니다. 결과가 나오지 않으면 결제한 건이 그대로 남아 다시 시도할 수 있고, 그래도 실패하면 환불해 드립니다.</p>
    </footer>

    {sources.some((source) => source.unreadable) && <p className={styles.scanNote}><X />글자가 없는 스캔본은 읽지 못합니다. 사진으로 된 증명서라면 그 내용을 위 칸에 직접 적어 주세요.</p>}
  </section>;
}
