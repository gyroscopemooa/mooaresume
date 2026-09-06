"use client";

import { ChangeEvent, DragEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle, ArrowRight, CheckCircle2, Download, FileText, FolderKanban, Layers, Loader2, LogIn, Mail, Plus, Sparkles, Trash2, UploadCloud, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ARCHIVE_DOCUMENT_ACCEPT, extractLocalDocuments } from "@/lib/local-document";
import { CLASSIFIED_KIND_LABEL, CLASSIFIED_KIND_ORDER, classifyDocument, type ClassifiedKind } from "@/domain/document-classify";
import { checkUploads, describeRejections, formatBytes } from "@/domain/upload-limits";
import {
  PORTFOLIO_BUILD_MAX_DIRECTION_CHARS, PORTFOLIO_BUILD_MAX_FILES, PORTFOLIO_BUILD_MAX_PROJECTS, PORTFOLIO_BUILD_MAX_PROJECT_NOTE_CHARS,
  PORTFOLIO_BUILD_MIN_SOURCE_CHARS, PORTFOLIO_BUILD_PRICE_KRW,
  countPortfolioBuildSourceCharacters, describePortfolioBuildResult, hasEnoughPortfolioBuildSource,
  portfolioBuildOutputSchema, type PortfolioBuildOutput, type PortfolioBuildSource, type PortfolioProjectInput,
} from "@/domain/portfolio-build";
import { portfolioSampleOutput } from "@/fixtures/portfolio-sample";
import { buildDocx, DOCX_MIME_TYPE, type DocxBlock } from "@/lib/docx";
import styles from "./document-build-tool.module.css";

/**
 * 포트폴리오 설명글 도구.
 *
 * 앞의 두 빌더와 입력 모양이 하나 다릅니다. 저쪽은 자료를 한 덩이로 받으면
 * 됐지만, 포트폴리오는 **프로젝트라는 단위가 먼저** 있습니다. 그래서 왼쪽이
 * 큰 칸 하나가 아니라 프로젝트 카드 여러 장입니다 — 세 개를 한 칸에 몰아
 * 적게 하면 A의 성과가 B에 붙고, 그건 면접에서 바로 걸립니다.
 *
 * 파는 것은 서식이 아니라 글입니다. PPT를 만들어 주지 않습니다.
 */

const STORAGE_KEY = "mooa.portfolio-build.sources.v1";

type Phase = "idle" | "creating" | "running" | "done";

type StoredSources = { projects: PortfolioProjectInput[]; direction: string; sources: PortfolioBuildSource[] };

function createProject(): PortfolioProjectInput {
  return { id: `p-${Math.random().toString(36).slice(2, 10)}`, title: "", period: "", note: "" };
}

function readStored(): StoredSources | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredSources>;
    if (!value || typeof value !== "object") return null;
    return {
      projects: Array.isArray(value.projects) && value.projects.length ? (value.projects as PortfolioProjectInput[]) : [createProject()],
      direction: typeof value.direction === "string" ? value.direction : "",
      sources: Array.isArray(value.sources) ? (value.sources as PortfolioBuildSource[]) : [],
    };
  } catch {
    return null;
  }
}

function outputToDocxBlocks(output: PortfolioBuildOutput): DocxBlock[] {
  const blocks: DocxBlock[] = [{ text: "포트폴리오", style: "title" }];
  if (output.headline) blocks.push({ text: output.headline, style: "body" });
  if (output.tableOfContents.length) {
    blocks.push({ text: "목차", style: "heading" });
    for (const line of output.tableOfContents) blocks.push({ text: line, style: "body" });
  }
  for (const project of output.projects) {
    blocks.push({ text: [project.title, project.period].filter(Boolean).join("   "), style: "heading" });
    if (project.oneLiner) blocks.push({ text: project.oneLiner, style: "body" });
    if (project.summary) blocks.push({ text: `소개: ${project.summary}`, style: "body" });
    if (project.role) blocks.push({ text: `담당 역할: ${project.role}`, style: "body" });
    if (project.problem) blocks.push({ text: `문제: ${project.problem}`, style: "body" });
    if (project.actions.length) {
      blocks.push({ text: "실행", style: "body" });
      for (const line of project.actions) blocks.push({ text: `- ${line}`, style: "body" });
    }
    if (project.results.length) {
      blocks.push({ text: "성과", style: "body" });
      for (const line of project.results) blocks.push({ text: `- ${line}`, style: "body" });
    }
    if (project.skills) blocks.push({ text: `사용 기술·역량: ${project.skills}`, style: "body" });
  }
  if (output.notes.length) {
    blocks.push({ text: "확인이 필요합니다", style: "heading" });
    for (const note of output.notes) blocks.push({ text: `- ${note}`, style: "body" });
  }
  return blocks;
}

function OutputPreview({ output }: { output: PortfolioBuildOutput }) {
  return <>
    {output.headline && <p className={styles.previewHeadline}>{output.headline}</p>}
    {output.tableOfContents.length > 0 && <div className={styles.toc}>
      <b>목차</b>
      <ol>{output.tableOfContents.map((line, index) => <li key={index}>{line.replace(/^\d+\.\s*/, "")}</li>)}</ol>
    </div>}
    {output.projects.length > 0
      ? <div className={styles.entries}>{output.projects.map((project) => <div key={project.index} className={styles.entry}>
        <div className={styles.entryHead}>
          <b>{project.title || `프로젝트 ${project.index}`}</b>
          <span>{project.period}</span>
        </div>
        {project.oneLiner && <p className={styles.entrySub}>{project.oneLiner}</p>}
        {project.summary && <p className={styles.entrySub}>{project.summary}</p>}
        {project.role && <p className={styles.entrySub}><b>담당 역할</b> · {project.role}</p>}
        {project.problem && <p className={styles.entrySub}><b>문제</b> · {project.problem}</p>}
        {project.actions.length > 0 && <ul>{project.actions.map((line, index) => <li key={index}>{line}</li>)}</ul>}
        {project.results.length > 0 && <p className={styles.achievement}>{project.results.join(" · ")}</p>}
        {project.skills && <p className={styles.evidence}>사용 기술·역량: {project.skills}</p>}
        {project.evidence && <p className={styles.evidence}>근거: {project.evidence}</p>}
      </div>)}</div>
      : <p className={styles.entrySub}>자료에서 설명할 프로젝트를 찾지 못했습니다.</p>}
    {output.notes.length > 0 && <div className={styles.notes}>
      <b>확인이 필요합니다</b>
      <ul>{output.notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
    </div>}
  </>;
}

export function PortfolioBuildPanel() {
  const [projects, setProjects] = useState<PortfolioProjectInput[]>([createProject()]);
  const [direction, setDirection] = useState("");
  const [sources, setSources] = useState<PortfolioBuildSource[]>([]);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [truncated, setTruncated] = useState<string[]>([]);
  const [output, setOutput] = useState<PortfolioBuildOutput | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [buildId, setBuildId] = useState<string | null>(null);
  const restored = useRef(false);

  const request = { projects, direction, sources };
  const characters = countPortfolioBuildSourceCharacters(request);
  const enough = hasEnoughPortfolioBuildSource(request);

  useEffect(() => {
    if (!direction && !sources.length && projects.every((project) => !project.title && !project.note)) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, direction, sources }));
    } catch {
      // 자료가 커서 저장에 실패할 수 있습니다. 작성은 계속됩니다.
    }
  }, [projects, direction, sources]);

  const runBuild = useCallback(async (targetBuildId: string, payload: StoredSources) => {
    setPhase("running");
    setMessage("");
    try {
      const response = await fetch(`/api/portfolio-builds/${targetBuildId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setPhase("idle");
        setMessage(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "포트폴리오 설명글을 만들지 못했습니다.");
        return;
      }
      const parsed = portfolioBuildOutputSchema.safeParse((body as { output?: unknown }).output);
      if (!parsed.success) {
        setPhase("idle");
        setMessage("결과를 읽지 못했습니다. 결제는 그대로 남아 있으니 다시 시도해 주세요.");
        return;
      }
      setOutput(parsed.data);
      setTruncated(Array.isArray((body as { truncated?: unknown }).truncated) ? (body as { truncated: string[] }).truncated : []);
      setPhase("done");
      try {
        window.localStorage.removeItem(STORAGE_KEY);
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

      const stored = readStored();
      if (stored) {
        setProjects(stored.projects);
        setDirection(stored.direction);
        setSources(stored.sources);
      }
      const params = new URLSearchParams(window.location.search);
      const returned = params.get("portfolio_build");
      if (!returned) return;
      setBuildId(returned);
      if (params.get("checkout") !== "success") return;
      if (!member) {
        setMessage("결제는 되었는데 로그인이 풀렸습니다. 아래에서 다시 로그인하시면 결제한 건으로 이어서 만들어 드립니다.");
        return;
      }
      if (!stored || !hasEnoughPortfolioBuildSource(stored)) {
        setMessage("결제는 확인됐지만 적어 두신 내용을 이 브라우저에서 찾지 못했습니다. 다시 적으신 뒤 아래 '결제한 건으로 만들기'를 눌러 주세요.");
        return;
      }
      await runBuild(returned, stored);
    })();
  }, [runBuild]);

  function updateProject(id: string, patch: Partial<PortfolioProjectInput>) {
    setProjects((current) => current.map((project) => (project.id === id ? { ...project, ...patch } : project)));
  }

  async function addFiles(incoming: File[]) {
    if (!incoming.length) return;
    setMessage("");
    const bytes = sources.reduce((total, source) => total + source.sizeBytes, 0);
    const { accepted, rejected } = checkUploads(incoming, { count: sources.length, bytes });
    if (rejected.length) setMessage(describeRejections(rejected));
    if (!accepted.length) return;

    setReading(true);
    const added: PortfolioBuildSource[] = [];
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
    setSources((current) => [...current, ...added].slice(0, PORTFOLIO_BUILD_MAX_FILES));
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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/portfolio")}` },
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
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/portfolio")}` },
    });
    if (error) { setAuthBusy(false); setMessage("Google 로그인을 시작하지 못했습니다."); }
  }

  async function startCheckout() {
    setPhase("creating");
    setMessage("");
    try {
      const response = await fetch("/api/portfolio-builds", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body: unknown = await response.json();
      if (response.status === 401) { setSignedIn(false); setPhase("idle"); setMessage("로그인이 필요합니다."); return; }
      if (!response.ok || !body || typeof body !== "object" || !("checkoutUrl" in body) || typeof body.checkoutUrl !== "string") {
        setPhase("idle");
        setMessage(body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "결제 페이지로 연결하지 못했습니다.");
        return;
      }
      window.location.assign(body.checkoutUrl);
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
    anchor.download = "포트폴리오_설명글.docx";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const busy = phase === "creating" || phase === "running";

  return <section className={styles.page} id="portfolio-build" aria-labelledby="portfolio-build-title">
    <div className={styles.head}>
      <h1 id="portfolio-build-title">프로젝트만 적어 주세요. 설명은 이쪽에서 씁니다</h1>
      <p>포트폴리오에서 제일 오래 막히는 건 배치가 아니라 &quot;이 프로젝트를 뭐라고 설명하지&quot;입니다. 프로젝트마다 <b>소개 · 담당 역할 · 문제 · 실행 · 성과 · 사용 기술</b>과 전체 목차를 만들어 드립니다. 없는 성과는 지어내지 않습니다.</p>
      <div className={styles.priceRow}>
        <span className={styles.priceTag}><b>{PORTFOLIO_BUILD_PRICE_KRW.toLocaleString()}원</b><small>&nbsp;· 1건 · 부가세 포함</small></span>
      </div>
    </div>

    <div className={styles.layout}>
      <div className={styles.card}>
        <p className={styles.sectionLabel}><FolderKanban />프로젝트 입력</p>

        <div className={styles.projectList}>
          {projects.map((project, index) => <div key={project.id} className={styles.projectCard}>
            <div className={styles.projectHead}>
              <b>{index + 1}</b>
              <input
                type="text"
                value={project.title}
                onChange={(event) => updateProject(project.id, { title: event.target.value })}
                placeholder="프로젝트 이름"
                aria-label={`프로젝트 ${index + 1} 이름`}
                maxLength={120}
              />
              {projects.length > 1 && <button
                type="button"
                aria-label={`프로젝트 ${index + 1} 빼기`}
                onClick={() => setProjects((current) => current.filter((item) => item.id !== project.id))}
              ><Trash2 /></button>}
            </div>
            <div className={styles.projectRow}>
              <div className={styles.field}>
                <input
                  type="text"
                  value={project.period}
                  onChange={(event) => updateProject(project.id, { period: event.target.value })}
                  placeholder="기간 (예: 2024.03 ~ 2024.09)"
                  aria-label={`프로젝트 ${index + 1} 기간`}
                  maxLength={60}
                />
              </div>
              <div className={styles.field}>
                <textarea
                  value={project.note}
                  onChange={(event) => updateProject(project.id, { note: event.target.value })}
                  maxLength={PORTFOLIO_BUILD_MAX_PROJECT_NOTE_CHARS}
                  placeholder={"아는 대로 적어 주세요. 무엇을 왜 했고, 본인이 맡은 부분은 무엇이었는지.\n예) 팀마다 엑셀로 재고를 관리해서 수량이 서로 달랐습니다. 제가 요구사항 정리하고 화면 설계해서 웹으로 옮겼습니다."}
                  rows={4}
                  aria-label={`프로젝트 ${index + 1} 설명`}
                />
              </div>
            </div>
          </div>)}
        </div>

        <button
          type="button"
          className={styles.addProject}
          disabled={projects.length >= PORTFOLIO_BUILD_MAX_PROJECTS}
          onClick={() => setProjects((current) => [...current, createProject()])}
        ><Plus />프로젝트 추가 ({projects.length}/{PORTFOLIO_BUILD_MAX_PROJECTS})</button>

        <div className={styles.field}>
          <label htmlFor="portfolio-direction">지원 방향 <small>선택</small></label>
          <input
            id="portfolio-direction"
            type="text"
            value={direction}
            maxLength={PORTFOLIO_BUILD_MAX_DIRECTION_CHARS}
            onChange={(event) => setDirection(event.target.value)}
            placeholder="예) 서비스 기획자 · 커머스"
          />
          <small>그 직무가 볼 만한 부분을 앞세우고 그쪽 말로 씁니다. 없는 경험을 만들지는 않습니다.</small>
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>자료 올리기 <small>선택 · 최대 {PORTFOLIO_BUILD_MAX_FILES}개</small></span>
          <label
            className={`${styles.dropzone} ${dragging ? styles.dropzoneOn : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {reading ? <Loader2 className={styles.spin} /> : <UploadCloud />}
            <b>{reading ? "파일을 읽고 있습니다" : "여기로 끌어다 놓거나 눌러서 고르세요"}</b>
            <small>기획서 · 결과 보고서 · 예전 포트폴리오 · 회고 (PDF · DOCX · TXT · ZIP)</small>
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
          <p>적어 두신 내용은 이 브라우저에 그대로 남아 있습니다.</p>
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
            <small>{enough ? "이 정도면 쓸 수 있습니다." : `최소 ${PORTFOLIO_BUILD_MIN_SOURCE_CHARS}자는 필요합니다. 프로젝트 설명을 조금 더 적어 주세요.`}</small>
          </div>
          <div className={styles.actions}>
            {buildId && phase !== "done" && <button type="button" className={styles.ghost} disabled={busy || !enough} onClick={() => void runBuild(buildId, request)}>결제한 건으로 만들기</button>}
            <button
              type="button"
              className={styles.buy}
              disabled={busy || !enough || !signedIn}
              title={!signedIn ? "로그인 후 결제할 수 있습니다." : enough ? undefined : "적어 주신 내용이 조금 더 필요합니다."}
              onClick={() => void startCheckout()}
            >
              {busy ? <><Loader2 className={styles.spin} />{phase === "running" ? "설명글을 쓰는 중" : "결제 페이지로 이동 중"}</> : <>{PORTFOLIO_BUILD_PRICE_KRW.toLocaleString()}원 · AI로 만들기<ArrowRight /></>}
            </button>
          </div>
          <p className={styles.terms}>1건 정액 {PORTFOLIO_BUILD_PRICE_KRW.toLocaleString()}원(부가세 포함). 프로젝트 개수와 상관없이 한 번에 정리합니다. 올린 자료는 설명글을 만드는 데만 쓰이고 서버에 저장하지 않습니다. 결과가 나오지 않으면 결제한 건이 그대로 남아 다시 시도할 수 있고, 그래도 실패하면 환불해 드립니다.</p>
        </footer>

        {sources.some((source) => source.unreadable) && <p className={styles.scanNote}><X />글자가 없는 스캔본은 읽지 못합니다. 이미지로 된 자료라면 그 내용을 프로젝트 설명 칸에 직접 적어 주세요.</p>}
      </div>

      <div className={`${styles.card} ${styles.previewCard}`}>
        <div className={styles.previewHead}>
          <p className={styles.sectionLabel}><Layers />완성본</p>
          {phase === "done"
            ? <span className={styles.doneBadge}><CheckCircle2 />내 결과</span>
            : <span className={styles.sampleBadge}>예시</span>}
        </div>

        {phase === "running" && <div className={styles.emptyState}>
          <Loader2 className={styles.spin} />
          <p>프로젝트를 읽고 설명글을 쓰고 있습니다. 최대 3분 정도 걸립니다.</p>
        </div>}

        {phase !== "running" && <OutputPreview output={phase === "done" && output ? output : portfolioSampleOutput} />}

        {phase === "done" && output && <>
          <p className={styles.entrySub} style={{ marginTop: 14 }}>{describePortfolioBuildResult(output)} 적힌 내용이 사실과 맞는지는 본인이 확인해 주세요.</p>
          {truncated.length > 0 && <p className={styles.evidence}>자료가 많아 다 읽지 못한 것: {truncated.join(", ")}</p>}
          <div className={styles.downloadRow}>
            <button type="button" className={styles.download} onClick={downloadDocx}><Download />DOCX로 저장</button>
          </div>
        </>}

        {phase !== "done" && <p className={styles.evidence} style={{ marginTop: 14 }}><Sparkles style={{ width: 11, verticalAlign: "-1px" }} /> 프로젝트를 적고 만들면 이 자리가 실제 결과로 바뀝니다.</p>}
      </div>
    </div>
  </section>;
}
