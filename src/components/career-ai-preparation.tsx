"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, FileText, LayoutDashboard, LoaderCircle, LockKeyhole, ShieldCheck, Target, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CAREER_AI_SAMPLE_SCOPES, getCareerAiSample } from "@/domain/career-ai-sample";
import { CAREER_AI_COMBINED_PRICE_KRW, CAREER_AI_SINGLE_PRICE_KRW } from "@/domain/builder-pricing";
import { CAREER_AI_MATERIAL_MAX_CHARS, type CareerInterpretationOutput } from "@/domain/career-ai-contract";
import { LOCAL_DOCUMENT_ACCEPT } from "@/lib/local-document";
import { computeReportHero, type ReportHero } from "@/domain/career-report-hero";
import { CAREER_AI_REPORT_STORAGE_PREFIX } from "@/domain/career-report-hero";
import styles from "./career-ai-preparation.module.css";
import { AppPaidToolNotice, useInstalledApp } from "@/components/app-paid-tool-gate";

const MATERIAL_LABEL: Record<MaterialField, string> = { resumeText: "이력서", coverLetterText: "자기소개서", jobPostingText: "채용 공고" };
const MATERIAL_FIELD_CONFIG: Array<{ field: MaterialField; id: string; placeholder: string }> = [
  { field: "resumeText", id: "career-ai-resume", placeholder: "이력서 내용을 붙여넣거나, 위에서 PDF·DOCX 파일을 올려 채우세요." },
  { field: "coverLetterText", id: "career-ai-cover-letter", placeholder: "자소서를 붙여넣거나 파일을 올리면 실제로 쓴 표현과 결과를 대조합니다." },
  { field: "jobPostingText", id: "career-ai-job-posting", placeholder: "지원하려는 공고를 붙여넣거나 파일을 올리면 그 공고에서 확인할 질문을 함께 정리합니다." },
];
const MATERIAL_STORAGE_KEY = "mooa.career-ai-build.material.v1";
type Material = { resumeText: string; coverLetterText: string; jobPostingText: string };
type MaterialField = keyof Material;
const EMPTY_MATERIAL: Material = { resumeText: "", coverLetterText: "", jobPostingText: "" };

function readStoredMaterial(): Material {
  try {
    const raw = window.localStorage.getItem(MATERIAL_STORAGE_KEY);
    if (!raw) return EMPTY_MATERIAL;
    const value = JSON.parse(raw) as Partial<Material>;
    return {
      resumeText: typeof value.resumeText === "string" ? value.resumeText : "",
      coverLetterText: typeof value.coverLetterText === "string" ? value.coverLetterText : "",
      jobPostingText: typeof value.jobPostingText === "string" ? value.jobPostingText : "",
    };
  } catch {
    return EMPTY_MATERIAL;
  }
}

const subscribe = () => () => undefined;
const assessments = [
  { key: "interest", label: "직업흥미 탐색", href: "/career/interest", storage: "mooa-career-interest-answers-v1", hint: "어떤 활동을 해 보고 싶은지" },
  { key: "work_style", label: "업무성향 분석", href: "/career/work-style", storage: "mooa-work-style-answers-v1", hint: "어떤 방식으로 일하는지" },
  { key: "work_values", label: "직업가치 우선순위", href: "/career/values", storage: "mooa-career-work-values-v1", hint: "일에서 무엇을 중요하게 보는지" },
] as const;
type AssessmentKey = (typeof assessments)[number]["key"];
type Scope = AssessmentKey | "combined";
type LatestAssessmentsResponse = { assessments?: Array<{ assessmentCode?: string }> };

function isAssessmentKey(value: string): value is AssessmentKey {
  return assessments.some((assessment) => assessment.key === value);
}

type ExecutionPhase = "idle" | "creating_checkout" | "generating" | "done" | "error";

export function CareerAiPreparation({ scope }: { scope: Scope }) {
  const router = useRouter();
  // Play 앱 안에서는 외부 결제(Polar) 버튼을 내리고 안내만 둡니다 — Play
  // 정책이 앱 안에서의 외부 결제를 금지합니다.
  const inApp = useInstalledApp();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [accountCompleted, setAccountCompleted] = useState<AssessmentKey[]>([]);
  const [accountLoading, setAccountLoading] = useState(true);
  const [phase, setPhase] = useState<ExecutionPhase>("idle");
  const [report, setReport] = useState<CareerInterpretationOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingBuildId, setPendingBuildId] = useState<string | null>(null);
  const [material, setMaterial] = useState<Material>(EMPTY_MATERIAL);
  // 파일 업로드 상태(이력서·자기소개서·공고 세 칸 공용). 모두 이 브라우저
  // 안에서만 읽어 같은 텍스트박스에 채웁니다 — 서버나 API를 하나도 늘리지 않고,
  // 붙여넣은 것과 토큰 비용이 같습니다.
  const [fileState, setFileState] = useState<Record<MaterialField, { busy: boolean; error: string; filename: string }>>({
    resumeText: { busy: false, error: "", filename: "" },
    coverLetterText: { busy: false, error: "", filename: "" },
    jobPostingText: { busy: false, error: "", filename: "" },
  });

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data, error } = await createClient().auth.getUser();
        const isSignedIn = !error && Boolean(data.user);
        if (!active) return;
        setSignedIn(isSignedIn);
        if (!isSignedIn) {
          setAccountLoading(false);
          return;
        }

        const response = await fetch("/api/career-assessments/latest", { cache: "no-store" });
        const body = await response.json().catch(() => null) as LatestAssessmentsResponse | null;
        if (!active) return;
        if (response.ok) {
          const codes = (body?.assessments ?? [])
            .map((assessment) => assessment.assessmentCode)
            .filter((code): code is string => typeof code === "string")
            .filter(isAssessmentKey);
          setAccountCompleted([...new Set(codes)]);
        }
      } catch {
        if (active) setSignedIn(false);
      } finally {
        if (active) setAccountLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // 자료 칸은 결제 전에도 계속 쓸 수 있어야 하므로(결제창 갔다 와도 지워지면 안 됨) 이 브라우저에만 저장한다.
  useEffect(() => { queueMicrotask(() => setMaterial(readStoredMaterial())); }, []);
  useEffect(() => {
    if (!material.resumeText && !material.coverLetterText && !material.jobPostingText) return;
    try {
      window.localStorage.setItem(MATERIAL_STORAGE_KEY, JSON.stringify(material));
    } catch {
      // 저장이 안 돼도 화면 입력은 계속 유지된다.
    }
  }, [material]);

  // Polar 결제 창에서 돌아온 경우: URL에 건 id가 실려 있으면 바로 실행을 건다.
  useEffect(() => {
    if (signedIn !== true) return;
    const params = new URLSearchParams(window.location.search);
    const buildId = params.get("career_ai_build");
    if (!buildId || params.get("checkout") !== "success") return;
    queueMicrotask(() => { setPendingBuildId(buildId); setPhase("generating"); });
  }, [signedIn]);

  const runExecute = useCallback(async (buildId: string, requestMaterial: Material) => {
    setPhase("generating");
    setErrorMessage(null);
    try {
      const body: Partial<Material> = {};
      if (requestMaterial.resumeText.trim()) body.resumeText = requestMaterial.resumeText;
      if (requestMaterial.coverLetterText.trim()) body.coverLetterText = requestMaterial.coverLetterText;
      if (requestMaterial.jobPostingText.trim()) body.jobPostingText = requestMaterial.jobPostingText;
      const response = await fetch(`/api/career-ai-builds/${buildId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null) as { output?: CareerInterpretationOutput; error?: string } | null;
      if (!response.ok || !payload?.output) {
        setErrorMessage(payload?.error ?? "심층해설을 만들지 못했습니다.");
        setPhase("error");
        return;
      }
      try { window.localStorage.removeItem(MATERIAL_STORAGE_KEY); } catch { /* 다음 구매 때 새로 덮어씁니다 */ }
      // 결과는 서버에 저장하지 않으므로, 이 탭에만 담아 두고 예시와 같은 디자인의 새 페이지로 보냅니다.
      try {
        window.sessionStorage.setItem(`${CAREER_AI_REPORT_STORAGE_PREFIX}${buildId}`, JSON.stringify({ scope, output: payload.output }));
        router.replace(`/career/ai/report?build=${encodeURIComponent(buildId)}`);
        return;
      } catch { /* 저장이 막힌 브라우저는 아래처럼 이 화면에 그대로 보여 줍니다 */ }
      setReport(payload.output);
      setPhase("done");
    } catch {
      setErrorMessage("네트워크 오류로 심층해설을 만들지 못했습니다.");
      setPhase("error");
    }
  }, [router, scope]);

  useEffect(() => {
    if (!pendingBuildId) return;
    queueMicrotask(() => { void runExecute(pendingBuildId, readStoredMaterial()); });
  }, [pendingBuildId, runExecute]);

  /**
   * 이력서·자기소개서·공고 중 하나를 이 브라우저 안에서만 읽어 해당 칸에
   * 채웁니다.
   *
   * extractLocalDocument는 PDF/DOCX/TXT/MD를 서버 없이 해독합니다(이미
   * 이력서 첨삭 화면이 쓰는 것과 같은 함수). 결과는 이 텍스트박스에
   * 그대로 들어가므로, 직접 붙여넣은 것과 토큰 비용이 같습니다 — 입력
   * 단계가 하나 줄었을 뿐입니다. 분량이 상한을 넘으면 잘라내고, 잘린
   * 사실을 그대로 알립니다.
   */
  async function handleMaterialFile(field: MaterialField, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setFileState((current) => ({ ...current, [field]: { ...current[field], busy: true, error: "" } }));
    try {
      const { extractLocalDocument } = await import("@/lib/local-document");
      const result = await extractLocalDocument(file);
      const truncated = result.text.slice(0, CAREER_AI_MATERIAL_MAX_CHARS);
      setMaterial((current) => ({ ...current, [field]: truncated }));
      const overflowError = result.text.length > CAREER_AI_MATERIAL_MAX_CHARS
        ? `분량이 많아 앞부분 ${CAREER_AI_MATERIAL_MAX_CHARS.toLocaleString()}자만 채웠습니다. 필요하면 직접 다듬어 주세요.`
        : "";
      setFileState((current) => ({ ...current, [field]: { busy: false, error: overflowError, filename: result.filename } }));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "파일을 읽지 못했어요.";
      setFileState((current) => ({ ...current, [field]: { ...current[field], busy: false, error: message } }));
    }
  }

  async function startCheckout() {
    // 앱에서는 외부 결제창을 열지 않습니다. 버튼도 가려져 있지만, 다른 경로로
    // 불려도 여기서 멈춥니다.
    if (inApp) return;
    setErrorMessage(null);
    setPhase("creating_checkout");
    try {
      const response = await fetch("/api/career-ai-builds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const body = await response.json().catch(() => null) as { checkoutUrl?: string; error?: string } | null;
      if (!response.ok || !body?.checkoutUrl) {
        setErrorMessage(body?.error ?? "결제 페이지를 열지 못했습니다.");
        setPhase("error");
        return;
      }
      window.location.href = body.checkoutUrl;
    } catch {
      setErrorMessage("네트워크 오류로 결제 페이지를 열지 못했습니다.");
      setPhase("error");
    }
  }

  const interestRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(assessments[0].storage), () => null);
  const workStyleRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(assessments[1].storage), () => null);
  const valuesRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(assessments[2].storage), () => null);
  const complete = useMemo(() => assessments.filter((assessment, index) => Boolean([interestRaw, workStyleRaw, valuesRaw][index]) || accountCompleted.includes(assessment.key)), [accountCompleted, interestRaw, workStyleRaw, valuesRaw]);
  const required = scope === "combined" ? assessments : assessments.filter((assessment) => assessment.key === scope);
  const missing = required.filter((assessment) => !complete.some((done) => done.key === assessment.key));
  const isCombined = scope === "combined";
  const reportHero = useMemo(() => computeReportHero(scope, interestRaw, valuesRaw, workStyleRaw), [scope, interestRaw, valuesRaw, workStyleRaw]);

  if (signedIn === null || (signedIn && accountLoading)) return <AiLoadingScreen />;

  if (missing.length) return <AiFrame eyebrow="AI CAREER INSIGHTS" title={isCombined ? "세 가지 검사를 마치면\n종합해설을 볼 수 있어요." : "먼저 이 검사를 마치면\n심층해설을 준비할 수 있어요."} description={isCombined ? "종합해설은 직업흥미, 업무성향, 직업가치를 함께 비교합니다. 아직 하지 않은 검사만 이어서 완료해 주세요." : "검사를 완료하면 결과에서 높게 나온 항목과 실제 경험을 연결해 볼 수 있어요."} status="검사 진행 필요"><section className={styles.todoList}>{missing.map((assessment) => <Link key={assessment.key} href={assessment.href}><span><i>{assessment.key === "interest" ? "01" : assessment.key === "work_style" ? "02" : "03"}</i><b>{assessment.label}</b><small>{assessment.hint}</small></span><em>검사 시작하기 <ArrowRight /></em></Link>)}</section><Link className={styles.ghostLink} href="/career">커리어 검사 홈으로</Link></AiFrame>;
  if (signedIn === false) return <AiFrame eyebrow="AI CAREER INSIGHTS" title={"결과를 안전하게 저장하고\n해설 범위를 골라 주세요."} description="로그인하면 현재 기기에서 완료한 검사 결과를 확인하고, 종합 또는 개별 해설을 선택할 수 있어요." status="로그인 필요"><Link className={styles.primary} href={`/career/login?next=${encodeURIComponent(`/career/ai?scope=${scope}`)}`}>로그인하고 심층해설 확인하기 <ArrowRight /></Link><Link className={styles.ghostLink} href="/career">커리어 검사 홈으로</Link></AiFrame>;

  const title = isCombined ? "세 결과를 한 번에\n쉽게 정리해 드려요." : "AI 전문가 심층 해설\n평가표 분석 받아보기";
  const description = isCombined ? "직업흥미·업무성향·직업가치가 실제 경험과 지원 방향에서 어디에서 만나는지 차례로 정리합니다." : "이 결과를 좋고 나쁨으로 평가하지 않고, 실제 경험과 지원 방향에서 확인할 질문으로 바꿉니다.";
  const featureCopy = isCombined ? [
    [BrainCircuit, "세 검사 결과를 함께 정리", "활동 선호·업무 방식·중요 조건을 한 흐름으로 읽습니다."],
    [Target, "서로 맞는 환경을 확인", "세 결과가 공통으로 가리키는 업무 환경과 역할 조건을 살펴봅니다."],
    [FileText, "지원서에서 확인할 경험", "검사 점수가 아닌 실제 경험을 고르는 질문으로 연결합니다."],
  ] as const : [
    [BrainCircuit, "결과 축을 쉽게 정리", "높게 나온 항목이 일하는 방식과 선택 기준에서 뜻하는 바를 읽습니다."],
    [Target, "실제 경험을 돌아볼 질문", "결과가 나타난 상황과 내가 해 본 일을 연결해 봅니다."],
    [FileText, "다음 지원에서 볼 기준", "직무와 공고에서 확인하면 좋을 업무와 조건을 정리합니다."],
  ] as const;

  const priceKrw = isCombined ? CAREER_AI_COMBINED_PRICE_KRW : CAREER_AI_SINGLE_PRICE_KRW;
  const busy = phase === "creating_checkout" || phase === "generating";

  return <AiFrame eyebrow="AI CAREER INSIGHTS" title={title} description={description} status={phase === "done" ? "해설 완료" : "결제 가능"}>
    <section className={styles.analysisGrid}>
      <div className={styles.analysisColumn}>
        <section className={styles.choiceSection} aria-label="심층해설 범위 선택">
          <div className={styles.sectionTitle}><small>REPORT SCOPE</small><b>어떤 결과를 자세히 볼까요?</b></div>
          <div className={styles.choiceGrid}>
            {complete.length === 3 && <Link className={isCombined ? styles.choiceActive : ""} href="/career/ai?scope=combined"><CheckCircle2 /><span><b>종합해설</b><small>세 검사 결과를 함께 비교합니다.</small></span><ArrowRight /></Link>}
            {complete.map((assessment) => <Link key={assessment.key} className={scope === assessment.key ? styles.choiceActive : ""} href={`/career/ai?scope=${assessment.key}`}><CheckCircle2 /><span><b>{assessment.label} 해설</b><small>{assessment.hint}를 중심으로 살펴봅니다.</small></span><ArrowRight /></Link>)}
          </div>
        </section>
        <section className={styles.choiceSection} aria-label="추가 자료 입력">
          <div className={styles.sectionTitle}><small>OPTIONAL MATERIAL</small><b>자료를 더하면 더 구체적으로 해설해요</b></div>
          <div className={styles.materialGrid}>
            {MATERIAL_FIELD_CONFIG.map(({ field, id, placeholder }) => {
              const status = fileState[field];
              return <div className={styles.materialField} key={field}>
                <div className={styles.materialFieldHead}>
                  <label htmlFor={id}>{MATERIAL_LABEL[field]} <small>선택</small></label>
                  {/* 파일에서 채우기 — extractLocalDocument가 이 브라우저 안에서만
                      읽으므로 서버 호출·토큰 비용이 붙여넣기와 같습니다. */}
                  <label className={styles.materialUpload} aria-disabled={busy || status.busy}>
                    {status.busy ? <LoaderCircle className={styles.materialUploadSpin} /> : <Upload />}
                    {status.busy ? "읽는 중..." : "파일에서 채우기"}
                    <input type="file" accept={LOCAL_DOCUMENT_ACCEPT} disabled={busy || status.busy} onChange={(event) => void handleMaterialFile(field, event)} />
                  </label>
                </div>
                <textarea id={id} rows={4} maxLength={CAREER_AI_MATERIAL_MAX_CHARS} value={material[field]} disabled={busy} placeholder={placeholder} onChange={(event) => setMaterial((current) => ({ ...current, [field]: event.target.value }))} />
                <small>{status.filename && !status.error ? `${status.filename}에서 채움 · ` : ""}{material[field].length.toLocaleString()} / {CAREER_AI_MATERIAL_MAX_CHARS.toLocaleString()}자</small>
                {status.error && <small className={styles.materialUploadError}>{status.error}</small>}
              </div>;
            })}
          </div>
          <span className={styles.materialNote}><ShieldCheck />붙여넣은 자료는 해설을 만드는 데만 쓰이고 서버에 저장하지 않습니다. 비워 두면 검사 결과만으로 해설합니다.</span>
        </section>
        <section className={styles.featureList}>{featureCopy.map(([Icon, titleText, body]) => <article key={titleText}><span><Icon /></span><div><b>{titleText}</b><p>{body}</p></div></article>)}</section>
      </div>
      <aside className={styles.packageCard}>
        <div className={styles.packageHead}><small>AI DEEP INTERPRETATION</small><h2>{isCombined ? "종합 심층해설" : "개별 심층해설"}</h2><p>결제하면 선택한 검사 결과를 바탕으로 AI가 바로 해설과 확인 질문을 만듭니다.</p></div>
        <ul>{["검사 결과 핵심 요약", isCombined ? "세 결과의 공통점·차이점" : "해당 결과의 의미와 확인 질문", "실제 경험과 공고를 볼 기준"].map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul>
        <Link className={styles.sampleButton} href={`/career/ai/sample?scope=${scope}`}>심층해설 예시 보기 <ArrowRight /></Link>
        {phase === "done"
          ? <span className={styles.packageFoot}><ShieldCheck />아래에서 해설을 확인하세요.</span>
          : <>
            {inApp ? <AppPaidToolNotice tool="AI 심층해설" /> : <>
              <button type="button" onClick={() => void startCheckout()} disabled={busy}>
                {phase === "creating_checkout" ? "결제 페이지 여는 중..." : phase === "generating" ? "AI가 해설 만드는 중..." : <>{priceKrw.toLocaleString("ko-KR")}원 · 심층해설 받기 <ArrowRight /></>}
              </button>
              <span className={styles.packageFoot}><ShieldCheck />결제 확인 후에만 AI를 호출합니다.</span>
            </>}
          </>}
        {phase === "error" && errorMessage && <span className={styles.packageFoot} role="alert">{errorMessage}</span>}
        {phase === "error" && pendingBuildId && <button type="button" onClick={() => void runExecute(pendingBuildId, material)}>결제한 건으로 다시 시도 <ArrowRight /></button>}
      </aside>
    </section>
    {phase === "generating" && <div className={styles.loading} aria-live="polite"><LoaderCircle /><span><b>AI가 심층해설을 만들고 있어요.</b><small>보통 1분 안팎으로 끝나요. 창을 닫지 말아 주세요.</small></span></div>}
    {phase === "done" && report && <CareerAiReportView output={report} hero={reportHero} />}
    <SampleReportGallery activeScope={scope} />
    <Link className={styles.ghostLink} href="/career/profile">종합 커리어 프로필로</Link>
  </AiFrame>;
}

function CareerAiReportView({ output, hero }: { output: CareerInterpretationOutput; hero: ReportHero | null }) {
  return <section className={styles.sampleReport} aria-label="AI 심층해설 결과">
    {hero && <div className={styles.reportHero}>
      <div className={styles.reportVisual}><Image src={hero.imagePath} alt={`${hero.code} ${hero.title} 캐릭터 카드`} fill sizes="(max-width: 760px) 100vw, 220px" quality={100} unoptimized /></div>
      <div className={styles.reportHeroCopy}><span className={styles.reportBadge}>{hero.badge}</span><p className={styles.reportCode}>{hero.code}<small>· {hero.title}</small></p><p>{hero.descriptor}</p></div>
    </div>}
    <div className={styles.sampleHead}><span>AI DEEP INTERPRETATION · 완료</span><h2>{output.profileSummary}</h2></div>
    <div className={styles.sampleGrid}>
      {output.workEnvironmentHypotheses.map((hypothesis) => (
        <article key={hypothesis.title}>
          <small>WORK ENVIRONMENT</small>
          <h3>{hypothesis.title}</h3>
          <p>{hypothesis.description}</p>
          <ul>{hypothesis.evidence.map((evidence, index) => <li key={index}><b>근거</b> {evidence.quote}</li>)}</ul>
        </article>
      ))}
    </div>
    <div className={styles.sampleGrid}>
      <article><small>실제 경험 확인 질문</small><ul>{output.experiencePrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}</ul></article>
      <article><small>공고·면접에서 확인할 질문</small><ul>{output.jobPostingQuestions.map((question) => <li key={question}>{question}</li>)}</ul></article>
    </div>
    <div className={styles.sampleFoot}><ShieldCheck /><p>{output.limitations.join(" ")}</p></div>
  </section>;
}

function AiFrame({ eyebrow, title, description, status, children }: { eyebrow: string; title: string; description: string; status: string; children: React.ReactNode }) {
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link className={styles.brand} href="/career">MOOA <b>CAREER</b></Link>
      <nav aria-label="커리어 탐색 메뉴"><Link href="/career"><LayoutDashboard />커리어 홈</Link><Link href="/career/profile">내 결과</Link><Link className={styles.activeNav} href="/career/ai?scope=combined">AI 심층해설</Link></nav>
      <span className={styles.status}><LockKeyhole />{status}</span>
    </header>
    <section className={styles.hero}><p>{eyebrow}</p><h1>{title.split("\n").map((line, index) => <span key={line}>{line}{index === 0 ? <br /> : null}</span>)}</h1><p className={styles.description}>{description}</p></section>
    <section className={styles.workspace}>{children}</section>
    <section className={styles.trust}><ShieldCheck /><p>검사 결과는 자기이해와 커리어 탐색을 위한 자료입니다. 의료·정신건강 진단, 채용 판정 또는 합격 가능성 예측을 제공하지 않습니다.</p></section>
    <footer className={styles.footer}><span>© MOOA Resume</span><div><Link href="/career">커리어 검사</Link><Link href="/career/profile">내 결과</Link><Link href="/">자소서 첨삭</Link></div></footer>
  </main>;
}
function AiLoadingScreen() {
  return <main className={styles.loadingPage} aria-live="polite">
    <section className={styles.loadingPanel}>
      <span className={styles.loadingEyebrow}>AI CAREER INSIGHTS</span>
      <div className={styles.loadingMark}><LoaderCircle /></div>
      <h1>검사 결과를<br />불러오는 중이에요.</h1>
      <p>잠시만요. 준비한 결과를 확인하고 있어요.</p>
      <div className={styles.loadingSkeleton} aria-hidden="true"><i /><i /><i /></div>
    </section>
  </main>;
}
function SampleReportGallery({ activeScope }: { activeScope: Scope }) {
  return <section className={styles.sampleGallery} aria-label="AI 심층해설 예시 목록">
    <div className={styles.sampleGalleryHead}><div><small>REPORT EXAMPLES</small><h2>다른 검사 해설도 미리 볼 수 있어요.</h2></div><span>예시 데이터 · 현재 내 결과 아님</span></div>
    <div className={styles.sampleGalleryGrid}>{CAREER_AI_SAMPLE_SCOPES.map((sampleScope) => {
      const sample = getCareerAiSample(sampleScope);
      return <Link key={sampleScope} className={activeScope === sampleScope ? styles.sampleGalleryActive : ""} href={`/career/ai/sample?scope=${sampleScope}`}>
        <small>{sample.badge}</small><b>{sample.reportTitle}</b><span>{sample.code} · {sample.typeName}</span><em>예시 리포트 보기 <ArrowRight /></em>
      </Link>;
    })}</div>
  </section>;
}
