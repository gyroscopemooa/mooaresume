"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Brain, BriefcaseBusiness, CheckCircle2, ClipboardList, Download, FlaskConical, Link2, Share2, Target, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { getCareerAiSample, type CareerAiSampleScope } from "@/domain/career-ai-sample";
import { getRiasecCharacterProfile } from "@/domain/career-interest";
import styles from "./career-ai-sample-design-three.module.css";

export function CareerAiSampleDesignThree({ scope }: { scope: CareerAiSampleScope }) {
  const sample = getCareerAiSample(scope);
  const profile = getRiasecCharacterProfile(sample.code);
  const [copied, setCopied] = useState(false);
  const copyResultLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { window.prompt("이 링크를 복사해 주세요.", window.location.href); }
  };
  const shareResult = async () => {
    const shareData = { title: `${sample.code} · ${profile.baseName}`, text: sample.headline, url: window.location.href };
    try {
      const response = await fetch(profile.imagePath);
      const blob = await response.blob();
      // 카드가 WebP로 바뀌었습니다. 이름만 .png로 붙여 보내면 받는 쪽이 열지
      // 못하는 파일이 되므로 확장자와 타입을 실제 파일에 맞춥니다.
      const cardFile = new File([blob], `${profile.baseCode}-career-card.webp`, { type: blob.type || "image/webp" });
      if (navigator.canShare?.({ files: [cardFile] })) {
        await navigator.share({ ...shareData, files: [cardFile] });
        return;
      }
    } catch {
      // File sharing is optional. Browsers without it fall back to link sharing.
    }
    if (navigator.share) { await navigator.share(shareData); return; }
    await copyResultLink();
  };
  const strengths = ["문제의 본질과 원인을 파고들기", "복잡한 내용을 이해하기 쉽게 정리하기", "새로운 관점으로 개선안을 설계하기", "근거를 바탕으로 협업 방향 제안하기", "배운 내용을 다음 실행으로 연결하기"];
  const workStrengths = ["자료와 정보를 구조화해 핵심을 찾기", "사용자·동료의 질문을 이해하기 쉽게 풀기", "서로 다른 관점을 하나의 실행안으로 묶기", "기존 방식의 불편을 찾아 개선안 만들기", "조사 결과를 다음 의사결정으로 연결하기"];
  const growth = ["분석을 끝내는 기준과 실행 속도 균형 잡기", "완성 전에도 피드백을 받아 관점 넓히기", "설명할 때 결론과 근거의 순서를 더 선명하게 하기", "관심 분야의 실제 산업·고객 맥락 쌓기", "혼자 깊이 파는 시간과 협업 시간을 구분하기"];
  const environments = ["문제를 깊게 이해할 시간이 있는 환경", "의견과 근거가 의사결정에 반영되는 팀", "새로운 방식을 시험하고 개선할 여지가 있는 일", "전문성을 공유하고 함께 배우는 조직", "업무의 의미와 기대 결과가 명확한 환경"];

  return <main className={`${styles.page} ${profile.baseCode === "IS" ? styles.isTheme : ""}`}>
    <header className={styles.topbar}><Link href="/career/ai?scope=interest"><ArrowLeft />심층해설 선택으로</Link><h1>Career Insight</h1><button type="button" onClick={() => void shareResult()} aria-label="결과 공유"><Share2 /></button></header>
    <main className={styles.container}>
      <section className={styles.heroCard}>
        <div className={styles.heroCopy}>
          <span className={styles.badge}>RIASEC 3개 조합형</span>
          <div><p className={styles.code}>{profile.code}<span>· {profile.baseName}</span></p><h2>{profile.baseCode} · {profile.cardTitle}</h2><strong>{profile.rankings[2].code} 보조 성향 · {profile.descriptor}</strong><p className={styles.axisSummary}>{profile.rankings.map((axis) => `${axis.label}(${axis.code})`).join(" + ")} 조합</p><p className={styles.intro}>{sample.intro}</p></div>
          <div className={styles.quickFacts}>
            <div><i><Target /></i><span><small>핵심 강점</small><b>{sample.strengths}</b></span></div>
            <div><i><FlaskConical /></i><span><small>살펴볼 분야</small><b>{sample.roles.join(" / ")}</b></span></div>
            <div><i><BriefcaseBusiness /></i><span><small>직무 예시</small><b>{sample.roleDetails.map((role) => role.title).join(" / ")}</b></span></div>
          </div>
        </div>
        <div className={styles.visualColumn}><div className={styles.visual}><Image src={profile.imagePath} alt={`${profile.baseCode} · ${profile.cardTitle} 캐릭터 카드`} fill sizes="(max-width: 760px) 100vw, 560px" quality={100} unoptimized /></div><button type="button" className={styles.download} onClick={() => void shareResult()}><Share2 />카드 이미지 저장 및 공유</button></div>
      </section>

      <section className={styles.insightGrid}>
        <InsightCard icon={<Brain />} tone="primary" title="성격 키워드" items={strengths} />
        <InsightCard icon={<BriefcaseBusiness />} tone="secondary" title="일할 때 강점" items={workStrengths} />
        <InsightCard icon={<TrendingUp />} tone="tertiary" title="성장 방향" items={growth} />
      </section>

      <section className={styles.deepCard}>
        <div className={styles.sectionHeading}><Brain /><h2>AI 심층 해설</h2></div>
        <div className={styles.deepCopy}><h3>{profile.code} · {profile.baseName}의 해석</h3><p>{profile.focusSummary} {sample.strengthGuide} 이 결과는 특정 직업을 확정하는 답이 아니라, 내가 해 본 경험과 지원할 환경을 더 정확하게 비교하기 위한 단서입니다.</p></div>
        <div className={styles.deepGrid}>
          <InfoBlock tone="primary" title="핵심 가치" text="문제의 원인을 이해하고, 사람에게 도움이 되는 방향으로 더 나은 방식을 만드는 데 의미를 둡니다." />
          <InfoBlock tone="secondary" title="의사결정 스타일" text="충분한 근거를 살핀 뒤, 관계자에게 설명 가능한 선택인지 함께 확인하는 편입니다." />
          <InfoBlock tone="tertiary" title="커뮤니케이션 패턴" text="복잡한 내용을 핵심부터 정리하고, 상대의 질문과 피드백을 반영해 전달 방식을 다듬습니다." />
          <InfoBlock tone="primary" title="팀 시너지" text="조사·분석과 설명·조율 사이를 연결해 팀이 다음 행동을 정하도록 돕는 역할에서 강점이 드러납니다." />
        </div>
      </section>

      <section className={styles.coaching}><h2>맞춤형 커리어 코칭</h2><div className={styles.coachingGrid}>
        <CoachingCard icon={<BriefcaseBusiness />} tone="primary" title="취업 코칭" text="공고의 실제 문제와 필요한 협업 방식을 먼저 읽고, 그에 맞는 경험을 자소서·면접 답변으로 연결합니다." />
        <CoachingCard icon={<Target />} tone="secondary" title="진로 코칭" text="흥미가 높은 활동을 기준으로 직무 후보를 넓힌 뒤, 업무 내용과 성장 경로를 비교하는 질문을 만듭니다." />
        <CoachingCard icon={<TrendingUp />} tone="tertiary" title="커리어 코칭" text="분석·설명·개선 경험을 성과로 증명할 수 있도록 포트폴리오와 업무 기록의 구조를 정리합니다." />
      </div></section>

      <section className={styles.coachingDetail}>
        <CoachingDetail tone="primary" title="취업 코칭" cards={["포트폴리오 전략", "면접 전술", "강점 어필"]} texts={["문제를 어떻게 파고들고 정리했는지 과정과 결과를 함께 보여주세요.", "근거를 찾아 선택했고, 사람과 어떻게 조율했는지 한 장면으로 설명해 보세요.", "분석력이라는 단어 대신 실제 개선·설명·협업 행동으로 강점을 증명하세요."]} />
        <CoachingDetail tone="secondary" title="진로 코칭" cards={["장기 성장 로드맵", "전문화 방향", "비전 정렬"]} texts={["관심 분야에서 조사·기획·실행 중 어떤 역할을 더 깊게 맡고 싶은지 확인합니다.", "도메인 지식과 분석·커뮤니케이션 경험을 함께 쌓을 수 있는 산업을 살펴봅니다.", "일의 의미·성장·협업 기준이 실제 조직 문화와 맞는지 면접 질문으로 확인합니다."]} />
        <CoachingDetail tone="tertiary" title="커리어 코칭" cards={["네트워킹 전략", "성과 관리", "업무 균형"]} texts={["배운 내용을 공유하고 질문을 주고받는 실무 커뮤니티에서 전문성을 넓혀 보세요.", "분석 결과가 다음 행동이나 개선으로 이어진 사례를 기록해 성과 근거를 만듭니다.", "깊이 파는 시간과 협업·실행 시간을 나누어 과도한 완벽주의를 조절합니다."]} />
      </section>

      <section className={styles.environment}><h2>나에게 맞는 업무 환경</h2><div>{environments.map((environment, index) => <article key={environment}><i>{index === 0 ? <ClipboardList /> : index === 1 ? <Users /> : index === 2 ? <FlaskConical /> : index === 3 ? <Users /> : <TrendingUp />}</i><p>{environment}</p></article>)}</div></section>
      <section className={styles.shareCard}><h2>나의 진로 캐릭터를 공유해 보세요.</h2><p>지원되는 기기에서는 카드 이미지 파일을 바로 공유하고, 그 외에는 결과 링크를 공유합니다.</p><div><a href={profile.imagePath} download={`${profile.baseCode}-career-card.webp`}><Download />카드 이미지 저장</a><button type="button" onClick={() => void shareResult()}><Share2 />카드 이미지 공유</button><button type="button" onClick={() => void copyResultLink()}><Link2 />{copied ? "링크 복사됨" : "링크 복사"}</button></div></section>
      <p className={styles.disclaimer}>이 결과는 자기이해와 커리어 탐색을 위한 자료입니다. 직업 적합성, 채용 결과, 합격 가능성을 판단하거나 보장하지 않습니다.</p>
    </main>
  </main>;
}

function InsightCard({ icon, tone, title, items }: { icon: React.ReactNode; tone: "primary" | "secondary" | "tertiary"; title: string; items: string[] }) {
  return <article className={`${styles.insightCard} ${styles[tone]}`}><div className={styles.sectionHeading}>{icon}<h2>{title}</h2></div><ul>{items.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul></article>;
}
function InfoBlock({ tone, title, text }: { tone: "primary" | "secondary" | "tertiary"; title: string; text: string }) { return <article className={`${styles.infoBlock} ${styles[tone]}`}><h3>{title}</h3><p>{text}</p></article>; }
function CoachingCard({ icon, tone, title, text }: { icon: React.ReactNode; tone: "primary" | "secondary" | "tertiary"; title: string; text: string }) { return <article className={`${styles.coachingCard} ${styles[tone]}`}><div>{icon}<h3>{title}</h3></div><p>{text}</p></article>; }
function CoachingDetail({ tone, title, cards, texts }: { tone: "primary" | "secondary" | "tertiary"; title: string; cards: string[]; texts: string[] }) { return <article className={`${styles.coachingSection} ${styles[tone]}`}><h2>{title}</h2><div>{cards.map((card, index) => <section key={card}><h3>{card}</h3><p>{texts[index]}</p></section>)}</div></article>; }