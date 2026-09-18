"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, BriefcaseBusiness, CheckCircle2, ClipboardList, ShieldCheck, Target, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { CareerInterpretationOutput } from "@/domain/career-ai-contract";
import { CAREER_AI_REPORT_STORAGE_PREFIX, computeReportHero } from "@/domain/career-report-hero";
import styles from "./career-ai-sample-design-three.module.css";

type StoredReport = { scope: string; output: CareerInterpretationOutput };
const subscribe = () => () => undefined;
const tones = ["primary", "secondary", "tertiary"] as const;

/**
 * 결제한 뒤 AI가 만든 실제 결과를 심층해설 "예시"(`career-ai-sample-design-three.tsx`)와
 * 같은 디자인·같은 섹션 구성으로 보여 준다. 예전엔 profileSummary·업무환경 가설·질문
 * 목록만 있는 훨씬 단순한 카드였는데(예시와 다른 컴포넌트), 2026-09-19에 AI 응답
 * 스키마를 예시와 같은 항목(성격 키워드·강점·성장방향·업무환경·코칭 3종)까지 늘려
 * 실제로 같은 구성이 나오게 했다(`career-ai-contract.ts`/`career-interpretation-gateway.ts`).
 *
 * 결과는 `career_ai_builds.output`에 저장돼(`saveBuildOutput`) 이 탭이 아니어도
 * `/api/career-ai-builds/[buildId]`로 다시 불러올 수 있다 — 예전엔 응답과 함께
 * 사라져서 새로고침·다른 기기에서는 못 봤다.
 */
export function CareerAiReportPage({ buildId }: { buildId: string }) {
  const router = useRouter();
  const storageKey = `${CAREER_AI_REPORT_STORAGE_PREFIX}${buildId}`;
  const raw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem(storageKey), () => undefined);
  const interestRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem("mooa-career-interest-answers-v1"), () => null);
  const valuesRaw = useSyncExternalStore(subscribe, () => window.sessionStorage.getItem("mooa-career-work-values-v1"), () => null);
  const localStored = useMemo<StoredReport | null>(() => { try { return raw ? JSON.parse(raw) as StoredReport : null; } catch { return null; } }, [raw]);
  const [remoteStored, setRemoteStored] = useState<StoredReport | null | undefined>(undefined);

  // 이 탭에 결과가 없으면(새 기기·재방문) 계정에 저장된 결과를 서버에서 불러온다.
  useEffect(() => {
    if (localStored || raw === undefined || !buildId) return;
    let active = true;
    void fetch(`/api/career-ai-builds/${buildId}`, { cache: "no-store" })
      .then(async (response) => (response.ok ? await response.json() as { scope: string; output: CareerInterpretationOutput } : null))
      .then((body) => { if (active) setRemoteStored(body ? { scope: body.scope, output: body.output } : null); })
      .catch(() => { if (active) setRemoteStored(null); });
    return () => { active = false; };
  }, [localStored, raw, buildId]);

  const stored = localStored ?? (remoteStored ?? null);
  const hero = useMemo(() => (stored ? computeReportHero(stored.scope, interestRaw, valuesRaw) : null), [stored, interestRaw, valuesRaw]);

  if (raw === undefined) return null;
  if (!stored) {
    if (!localStored && remoteStored === undefined) return <main className={styles.page}><main className={styles.container}><section className={styles.deepCard}><div className={styles.sectionHeading}><ShieldCheck /><h2>결과를 불러오는 중이에요.</h2></div></section></main></main>;
    return <main className={styles.page}><main className={styles.container}><section className={styles.deepCard}><div className={styles.sectionHeading}><ShieldCheck /><h2>이 결과를 찾지 못했어요.</h2></div><div className={styles.deepCopy}><p>결제 계정으로 로그인했는지 확인해 주세요. 그래도 안 보이면 심층해설을 다시 선택해 주세요.</p><p><Link href="/career/ai?scope=combined">심층해설 화면으로 돌아가기</Link></p></div></section></main></main>;
  }

  const { output, scope } = stored;
  const coachingIcon = [BriefcaseBusiness, Target, TrendingUp];

  return <main className={styles.page}>
    <header className={styles.topbar}><button type="button" className={styles.backButton} onClick={() => router.push(`/career/ai?scope=${scope}`)}><ArrowLeft />심층해설 화면으로</button><h1>Career Insight</h1><span /></header>
    <main className={styles.container}>
      <section className={styles.heroCard}>
        <div className={styles.heroCopy}>
          <span className={styles.badge}>AI 심층해설 · 내 결과</span>
          <div>
            {hero && <p className={styles.code}>{hero.code}<span>· {hero.title}</span></p>}
            <h2>{hero?.descriptor ?? "내 심층해설 결과"}</h2>
            <p className={styles.axisSummary}>{output.profileSummary}</p>
            <p className={styles.intro}>{output.deepInterpretation}</p>
          </div>
        </div>
        {hero && <div className={styles.visualColumn}><div className={styles.visual}><Image src={hero.imagePath} alt={`${hero.code} ${hero.title} 캐릭터 카드`} fill sizes="(max-width: 760px) 100vw, 560px" quality={100} unoptimized /></div></div>}
      </section>

      <section className={styles.insightGrid}>
        <InsightCard icon={<Brain />} tone="primary" title="성격 키워드" items={output.personalityKeywords} />
        <InsightCard icon={<BriefcaseBusiness />} tone="secondary" title="일할 때 강점" items={output.workStrengths} />
        <InsightCard icon={<TrendingUp />} tone="tertiary" title="성장 방향" items={output.growthDirections} />
      </section>

      {output.workEnvironmentHypotheses.length > 0 && <section className={styles.deepCard}>
        <div className={styles.sectionHeading}><ClipboardList /><h2>업무 환경 가설</h2></div>
        <div className={styles.deepGrid}>
          {output.workEnvironmentHypotheses.map((hypothesis, index) => <article key={hypothesis.title} className={`${styles.infoBlock} ${styles[tones[index % 3]]}`}>
            <h3>{hypothesis.title}</h3>
            <p>{hypothesis.description}</p>
            <p><b>근거</b> {hypothesis.evidence.map((e) => e.quote).join(" · ")}</p>
          </article>)}
        </div>
      </section>}

      <section className={styles.deepCard}>
        <div className={styles.sectionHeading}><Brain /><h2>AI 심층 해설</h2></div>
        <div className={styles.deepGrid}>
          <InfoBlock tone="primary" title="핵심 가치" text={output.coreValue} />
          <InfoBlock tone="secondary" title="의사결정 스타일" text={output.decisionStyle} />
          <InfoBlock tone="tertiary" title="커뮤니케이션 패턴" text={output.communicationPattern} />
          <InfoBlock tone="primary" title="팀 시너지" text={output.teamSynergy} />
        </div>
      </section>

      <section className={styles.coaching}><h2>맞춤형 커리어 코칭</h2><div className={styles.coachingGrid}>
        {output.coaching.map((section, index) => <CoachingCard key={section.area} icon={coachingIcon[index % 3]} tone={tones[index % 3]} title={section.area} text={section.summary} />)}
      </div></section>

      <section className={styles.coachingDetail}>
        {output.coaching.map((section, index) => <CoachingDetail key={section.area} tone={tones[index % 3]} title={section.area} cards={section.items.map((item) => item.title)} texts={section.items.map((item) => item.text)} />)}
      </section>

      <section className={styles.environment}><h2>나에게 맞는 업무 환경</h2><div>{output.idealEnvironments.map((environment) => <article key={environment}><i><ClipboardList /></i><p>{environment}</p></article>)}</div></section>

      <div className={styles.deepCard}><div className={styles.sectionHeading}><ShieldCheck /><h2 style={{ fontSize: 15 }}>{output.experiencePrompts.length ? "실제 경험 확인 질문" : ""}</h2></div>
        {output.experiencePrompts.length > 0 && <ul className={styles.applicationList}>{output.experiencePrompts.map((p) => <li key={p}>{p}</li>)}</ul>}
        {output.jobPostingQuestions.length > 0 && <><div className={styles.sectionHeading} style={{ marginTop: 24 }}><ClipboardList /><h2 style={{ fontSize: 15 }}>공고·면접에서 확인할 질문</h2></div><ul className={styles.applicationList}>{output.jobPostingQuestions.map((q) => <li key={q}>{q}</li>)}</ul></>}
      </div>

      <p className={styles.disclaimer}>{output.limitations.join(" ")}</p>
      <p className={styles.disclaimer}>이 결과는 내 계정에 저장돼 있어 언제든 다시 볼 수 있습니다.</p>
    </main>
  </main>;
}

function InsightCard({ icon, tone, title, items }: { icon: React.ReactNode; tone: "primary" | "secondary" | "tertiary"; title: string; items: string[] }) {
  return <article className={`${styles.insightCard} ${styles[tone]}`}><div className={styles.sectionHeading}>{icon}<h2>{title}</h2></div><ul>{items.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul></article>;
}
function InfoBlock({ tone, title, text }: { tone: "primary" | "secondary" | "tertiary"; title: string; text: string }) { return <article className={`${styles.infoBlock} ${styles[tone]}`}><h3>{title}</h3><p>{text}</p></article>; }
function CoachingCard({ icon, tone, title, text }: { icon: React.ComponentType; tone: "primary" | "secondary" | "tertiary"; title: string; text: string }) { const Icon = icon; return <article className={`${styles.coachingCard} ${styles[tone]}`}><div><Icon /><h3>{title}</h3></div><p>{text}</p></article>; }
function CoachingDetail({ tone, title, cards, texts }: { tone: "primary" | "secondary" | "tertiary"; title: string; cards: string[]; texts: string[] }) { return <article className={`${styles.coachingSection} ${styles[tone]}`}><h2>{title}</h2><div>{cards.map((card, index) => <section key={card}><h3>{card}</h3><p>{texts[index]}</p></section>)}</div></article>; }
