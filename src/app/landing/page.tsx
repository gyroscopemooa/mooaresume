import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Building2, Check, ChevronDown, FileSearch, Lightbulb,
  ListChecks, MessageSquareText, Repeat, Search, ShieldCheck, Sparkles, Target, ThumbsUp, Users,
} from "lucide-react";
import { ComingSoonHeroInput } from "@/components/coming-soon-hero-input";
import { WaitlistForm } from "@/components/waitlist-form";
import { comingSoonPlans } from "@/data/coming-soon-plans";
import { getSiteUrl } from "@/lib/site-url";
import { getWaitlistCount } from "@/server/notifications/waitlist-repository";
import styles from "./coming-soon.module.css";

export const revalidate = 300;

const engineFeatures = [
  { icon: Building2, title: "채용공고 요구역량 분석", body: "공고 문장에서 실제로 요구하는 역량과 우선순위를 정리합니다." },
  { icon: Target, title: "직무 적합도 분석", body: "지원 직무 기준으로 내 경험과 표현이 얼마나 연결되는지 봅니다." },
  { icon: ListChecks, title: "문항 적합도", body: "문항이 묻는 질문에 실제로 답하고 있는지 교차 확인합니다." },
  { icon: FileSearch, title: "내용 구체성", body: "상황·행동·결과가 구체적인 근거로 이어지는지 정밀 분석합니다." },
  { icon: Repeat, title: "경험 중복 탐지", body: "문항 간 같은 경험이 반복되지 않는지 다각도로 확인합니다." },
  { icon: AlertTriangle, title: "부족한 근거 탐지", body: "주장은 있지만 근거가 약한 문장을 데이터 기반으로 찾아냅니다." },
  { icon: MessageSquareText, title: "표현력 및 전달력", body: "문장이 읽는 사람에게 명확하게 전달되는지 살펴봅니다." },
  { icon: Sparkles, title: "핵심 경험 추출", body: "지원서 전체에서 가장 설득력 있는 경험을 교차 분석으로 골라냅니다." },
  { icon: ShieldCheck, title: "제출 전 최종 검수", body: "제출 직전 오류와 불일치를 마지막으로 점검합니다." },
];

const processSteps = [
  { title: "채용공고 분석", body: "공고 원문에서 핵심 문장을 추출합니다." },
  { title: "직무 요구사항 추출", body: "요구 역량과 우대 조건을 정리합니다." },
  { title: "자소서 분석", body: "문항별로 내용과 표현을 나눠 분석합니다." },
  { title: "부족 내용·중복 경험 탐지", body: "근거가 약한 부분과 겹치는 경험을 찾습니다." },
  { title: "개선 방향 제시", body: "무엇을, 왜 고쳐야 하는지 근거와 함께 제안합니다." },
  { title: "최종 지원서 검수", body: "제출 전 마지막 오류와 불일치를 확인합니다." },
  { title: "면접 예상질문", body: "제출한 지원서를 기준으로 예상 질문을 준비합니다." },
];

const insightCards = [
  { icon: ThumbsUp, title: "강점", body: "이미 잘 전달되고 있는 부분입니다." },
  { icon: AlertTriangle, title: "보완 필요", body: "근거를 더 채우면 좋은 문장입니다." },
  { icon: Search, title: "누락된 직무 키워드", body: "공고에는 있지만 지원서엔 없는 표현입니다." },
  { icon: Repeat, title: "반복되는 경험", body: "문항 간 같은 경험이 겹치는 지점입니다." },
  { icon: Lightbulb, title: "AI 개선 제안", body: "고칠 이유와 함께 제시하는 방향입니다." },
  { icon: MessageSquareText, title: "예상 면접 질문", body: "제출한 내용을 기준으로 준비하는 질문입니다." },
];

const roadmapFeatures = [
  "공고 자동 분석", "직무 요구사항 추출", "자소서 정밀 진단", "문장별 피드백",
  "경험 중복 검사", "부족 내용 AI 질문", "Before / After 비교", "제출 전 최종검수",
  "직무 적합도 스코어", "예상 면접 질문", "모의면접", "현직자·직업상담사 검토 연계(예정)",
];

const faqs = [
  { q: "AI 자소서 첨삭은 어떻게 진행되나요?", a: "채용공고와 자소서를 함께 분석해 문항 적합도, 구체성, 경험 중복 등을 점검하고, 고칠 이유와 함께 최종 첨삭본을 드립니다." },
  { q: "채용공고도 함께 분석하나요?", a: "네. 무아레쥬메는 자소서 문장만 보지 않고 채용공고의 요구역량과 함께 분석합니다." },
  { q: "작성하지 않은 자소서도 도움받을 수 있나요?", a: "네. 아무것도 쓰지 않은 상태라면 경험을 하나씩 여쭤보며 초안까지 만들어 드립니다. 어디까지 쓰셨는지에 맞춰 진행 방식이 달라집니다." },
  { q: "HWP나 PDF 파일도 사용할 수 있나요?", a: "현재 PDF·DOCX·TXT·MD 형식은 지원하며, HWP는 향후 지원을 준비하고 있습니다." },
  { q: "일반 ChatGPT와 무엇이 다른가요?", a: "범용 대화형 AI와 달리 채용공고 요구역량, 직무 적합도, 문항별 근거처럼 자소서 첨삭에 필요한 항목을 기준으로 분석하는 전용 엔진입니다." },
  { q: "면접 준비도 할 수 있나요?", a: "PRO에서는 제출한 지원서를 기준으로 예상 면접 질문과 답변 준비 사항, 면접에서 걸릴 수 있는 지점을 함께 드립니다. 대화형 모의면접은 준비 중입니다." },
  { q: "지금 바로 쓸 수 있나요?", a: "네. 자기소개서를 붙여넣고 바로 분석을 시작할 수 있습니다. 결제 전까지는 AI를 호출하지 않으므로 입력만 해보고 그만두셔도 비용이 들지 않습니다." },
];

export const metadata: Metadata = {
  title: "AI 자소서 첨삭 · 무아레쥬메",
  description: "채용공고와 자소서를 함께 분석하는 자소서 전용 AI 분석 엔진. 직무 적합도·문항 적합도·경험 중복까지 데이터 기반으로 진단합니다.",
  alternates: { canonical: "/landing" },
  openGraph: {
    url: "/landing",
    title: "AI 자소서 첨삭 · 무아레쥬메",
    description: "채용공고와 자소서를 함께 분석하는 자소서 전용 AI 분석 엔진.",
  },
  twitter: {
    title: "AI 자소서 첨삭 · 무아레쥬메",
    description: "채용공고와 자소서를 함께 분석하는 자소서 전용 AI 분석 엔진.",
  },
};

export default async function Home() {
  const siteUrl = getSiteUrl();
  const waitlistCount = await getWaitlistCount();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "MOOA Resume", alternateName: "무아레쥬메", url: siteUrl, description: "채용공고와 자소서를 함께 분석하는 자소서 전용 AI 분석 엔진" },
      { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: "MOOA Resume", alternateName: "무아레쥬메", inLanguage: "ko-KR", publisher: { "@id": `${siteUrl}/#organization` } },
      { "@type": "Service", "@id": `${siteUrl}/#service`, name: "무아레쥬메 AI 자소서 분석", serviceType: "채용공고 연계 AI 자기소개서 분석 및 첨삭", provider: { "@id": `${siteUrl}/#organization` }, areaServed: "KR", availableLanguage: "ko" },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: faqs.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
    ],
  };

  return (
    <main className={"home-page " + styles.theme}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />

      <header className="site-header">
        <Link href="/" className="brand" aria-label="무아레쥬메 홈"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></Link>
        <nav aria-label="주요 메뉴">
          <Link href="#features">분석 엔진</Link>
          <Link href="#process">분석 과정</Link>
          <Link href="#pricing">요금</Link>
          <Link href="#faq">FAQ</Link>
          <Link href="/onboarding" className="button button-small">첨삭 시작하기</Link>
        </nav>
      </header>

      <section className={"hero container " + styles.heroFull}>
        <div className={styles.heroTop}>
          <span className="eyebrow">자소서 전용 AI 분석 엔진</span>
          {waitlistCount !== null && waitlistCount > 0 && (
            <span className={styles.counterBadge}><Users /> <b>{waitlistCount.toLocaleString()}명</b>이 소식을 받아보고 있어요</span>
          )}
        </div>
        <h1 className={styles.subHeadline}>자소서, 감으로 고치지 마세요.<br /><em>지원하는 직무 기준</em>으로 분석하세요.</h1>
        <ComingSoonHeroInput />
      </section>

      <section className="proof container" aria-label="분석 결과 예시">
        <div className="result-preview">
          <div className="preview-head"><div><span className="status-dot" />분석 결과 예시</div><span>현대모비스 · 생산관리</span></div>
          <div className={styles.metricsRow}>
            <div className={styles.metricCard}><small>직무 적합도</small><div className={styles.metricValue}><span className="from">61</span><ArrowRight /><span className="to">82</span></div></div>
            <div className={styles.metricCard}><small>구체성</small><div className={styles.metricValue}><span className="from">58</span><ArrowRight /><span className="to">79</span></div></div>
            <div className={styles.metricCard}><small>문항 적합도</small><div className={styles.metricValue}><span className="from">75</span><ArrowRight /><span className="to">91</span></div></div>
          </div>
        </div>
        <p className={styles.previewNote}>* 실제 사용자의 분석 결과가 아닌 예시 화면입니다.</p>
        <div className={styles.insightGrid}>
          {insightCards.map(({ icon: Icon, title, body }) => (
            <article key={title} className={styles.insightCard}><span><Icon /> {title}</span><p>{body}</p></article>
          ))}
        </div>
      </section>

      <section className="section container" id="features">
        <div className="section-label">자소서 전용 분석 엔진</div>
        <h2>일반 AI 챗봇이 아니라,<br />자소서 전용 분석 엔진입니다.</h2>
        <div className="feature-grid">
          {engineFeatures.map(({ icon: Icon, title, body }) => (
            <article key={title}><div className="icon-box"><Icon /></div><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      <section className="section container process" id="process">
        <div><div className="section-label">분석 과정</div><h2>채용공고부터 면접까지,<br />하나의 흐름으로 분석합니다.</h2></div>
        <ol className={styles.timeline}>
          {processSteps.map((step, index) => (
            <li key={step.title}>
              <span className={styles.timelineDot}>{String(index + 1).padStart(2, "0")}</span>
              <div><b>{step.title}</b><p>{step.body}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="section container">
        <div className="section-label">제공 기능</div>
        <h2>정밀 분석부터 면접 준비까지,<br />한 번에 이어집니다.</h2>
        <div className={styles.roadmapGrid}>
          {roadmapFeatures.map((feature) => (
            <div key={feature} className={styles.roadmapItem}><Check /><span>{feature}</span></div>
          ))}
        </div>
      </section>

      <section className="section container" id="pricing">
        <div className="section-label">가격 미리보기</div>
        <h2>지금 필요한 범위만<br />선택하실 수 있습니다.</h2>
        <div className={styles.pricingGrid}>
          {comingSoonPlans.map((plan) => (
            <article key={plan.id} className={styles.pricingCard}>
              <small>{plan.id}</small>
              <strong>{plan.price}</strong>
              <h3>{plan.title}</h3>
              <p>{plan.description}</p>
              <Link href="/onboarding">시작하기 <ArrowRight /></Link>
            </article>
          ))}
        </div>
        <p className={styles.pricingNote}>기업 지원서 1건 기준 가격입니다.</p>
      </section>

      <section className="section container" id="faq">
        <div className="section-label">자주 묻는 질문</div>
        <h2>자주 묻는 내용을<br />정리했습니다.</h2>
        <div className={styles.faqList}>
          {faqs.map(({ q, a }) => (
            <details key={q} className={styles.faqItem}>
              <summary>{q}<ChevronDown /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.waitlistSection} id="waitlist">
        <div className="container">
          <div className="section-label">업데이트 소식</div>
          <h2>새로 추가되는 기능을,<br />가장 먼저 알려드릴게요.</h2>
          <p>이메일을 남겨주시면 새 기능과 개선 소식을 보내드립니다. 스팸 없이 제품 소식만 보내드려요.</p>
          <WaitlistForm />
        </div>
      </section>

      <footer className="container">
        <div className="brand"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></div>
        <p>지원자의 실제 경험을 존중하는 AI 취업 코치<br /><small>정답을 강요하기보다, 불필요한 감점 요소를 줄입니다.</small></p>
        <Link href="/guide">이용방법 · 자주 묻는 질문</Link>
        <a href="mailto:support@mooaresume.com">제휴·협업 문의: support@mooaresume.com</a>
        <span>© 2026 MOOA Resume</span>
      </footer>
    </main>
  );
}
