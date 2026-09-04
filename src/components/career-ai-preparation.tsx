"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, FileText, LayoutDashboard, LoaderCircle, LockKeyhole, ShieldCheck, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CAREER_AI_SAMPLE_SCOPES, getCareerAiSample } from "@/domain/career-ai-sample";
import styles from "./career-ai-preparation.module.css";

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

export function CareerAiPreparation({ scope }: { scope: Scope }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [accountCompleted, setAccountCompleted] = useState<AssessmentKey[]>([]);
  const [accountLoading, setAccountLoading] = useState(true);

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

  const interestRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(assessments[0].storage), () => null);
  const workStyleRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(assessments[1].storage), () => null);
  const valuesRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(assessments[2].storage), () => null);
  const complete = useMemo(() => assessments.filter((assessment, index) => Boolean([interestRaw, workStyleRaw, valuesRaw][index]) || accountCompleted.includes(assessment.key)), [accountCompleted, interestRaw, workStyleRaw, valuesRaw]);
  const required = scope === "combined" ? assessments : assessments.filter((assessment) => assessment.key === scope);
  const missing = required.filter((assessment) => !complete.some((done) => done.key === assessment.key));
  const isCombined = scope === "combined";

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

  return <AiFrame eyebrow="AI CAREER INSIGHTS" title={title} description={description} status="출시 준비 중">
    <section className={styles.analysisGrid}>
      <div className={styles.analysisColumn}>
        <section className={styles.choiceSection} aria-label="심층해설 범위 선택">
          <div className={styles.sectionTitle}><small>REPORT SCOPE</small><b>어떤 결과를 자세히 볼까요?</b></div>
          <div className={styles.choiceGrid}>
            {complete.length === 3 && <Link className={isCombined ? styles.choiceActive : ""} href="/career/ai?scope=combined"><CheckCircle2 /><span><b>종합해설</b><small>세 검사 결과를 함께 비교합니다.</small></span><ArrowRight /></Link>}
            {complete.map((assessment) => <Link key={assessment.key} className={scope === assessment.key ? styles.choiceActive : ""} href={`/career/ai?scope=${assessment.key}`}><CheckCircle2 /><span><b>{assessment.label} 해설</b><small>{assessment.hint}를 중심으로 살펴봅니다.</small></span><ArrowRight /></Link>)}
          </div>
        </section>
        <section className={styles.featureList}>{featureCopy.map(([Icon, titleText, body]) => <article key={titleText}><span><Icon /></span><div><b>{titleText}</b><p>{body}</p></div></article>)}</section>
      </div>
      <aside className={styles.packageCard}>
        <div className={styles.packageHead}><small>AI DEEP INTERPRETATION</small><h2>{isCombined ? "종합 심층해설" : "개별 심층해설"}</h2><p>출시 후 선택한 결과와 사용자가 직접 제공한 자료를 바탕으로 해설을 준비합니다.</p></div>
        <ul>{["검사 결과 핵심 요약", isCombined ? "세 결과의 공통점·차이점" : "해당 결과의 의미와 확인 질문", "실제 경험과 공고를 볼 기준"].map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul>
        <Link className={styles.sampleButton} href={`/career/ai/sample?scope=${scope}`}>심층해설 예시 보기 <ArrowRight /></Link>
        <button type="button" disabled>심층해설 준비 중 <ArrowRight /></button>
        <span className={styles.packageFoot}><ShieldCheck />현재는 결제·AI 호출이 진행되지 않습니다.</span>
      </aside>
    </section>
    <SampleReportGallery activeScope={scope} />
    <Link className={styles.ghostLink} href="/career/profile">종합 커리어 프로필로</Link>
  </AiFrame>;
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
