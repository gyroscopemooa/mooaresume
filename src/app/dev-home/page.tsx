import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, FileSearch, ListChecks, MousePointerClick, ScanSearch, ShieldCheck, Sparkles, Target, UploadCloud } from "lucide-react";
import { LandingEntry } from "@/components/landing-entry";
import { PricingComparison } from "@/components/pricing-comparison";
import landingStyles from "./landing-sections.module.css";
import outcomeStyles from "./outcome-learning.module.css";
import positioningStyles from "./landing-positioning.module.css";
import enterpriseStyles from "./enterprise-promo.module.css";
import oneClickStyles from "./one-click.module.css";
import { getSiteUrl } from "@/lib/site-url";

const differences = [
  { icon: FileSearch, title: "지원서 전체를 한 번에", body: "문항별 완성도뿐 아니라 경험 중복과 공고 연결까지 함께 봅니다." },
  { icon: ShieldCheck, title: "없는 경험은 만들지 않게", body: "부족한 근거는 임의로 채우지 않고, 확인이 필요한 질문으로 돌려드립니다." },
  { icon: Sparkles, title: "고칠 순서가 분명하게", body: "점수보다 중요한 개선 3가지를 근거와 함께 먼저 보여드립니다." },
];

// Dev-only preview of the full product homepage. Not linked from the public
// Coming Soon landing at "/" — reachable at the dev subdomain root via the
// host-based rewrite in middleware.ts, and directly at /dev-home for local
// testing. Kept noindex (next.config.ts privatePaths) since it points into
// the live onboarding/checkout flow before official launch.
export const metadata: Metadata = {
  title: "개발 홈 미리보기 (비공개)",
  robots: { index: false, follow: false },
};

export default function DevHome() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "MOOA Resume", alternateName: "무아레쥬메", url: siteUrl, description: "채용공고와 지원자의 경험을 연결하는 AI 자소서 첨삭 서비스" },
      { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: "MOOA Resume", alternateName: "무아레쥬메", inLanguage: "ko-KR", publisher: { "@id": `${siteUrl}/#organization` } },
      { "@type": "Service", "@id": `${siteUrl}/#service`, name: "MOOA Resume AI 자소서 첨삭", serviceType: "AI 자기소개서 첨삭 및 취업 지원서 분석", provider: { "@id": `${siteUrl}/#organization` }, areaServed: "KR", availableLanguage: "ko" },
    ],
  };
  return (
    <main className="home-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="MOOA Resume 홈"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></Link>
        <nav aria-label="주요 메뉴"><Link href="#how">이용 방법</Link><Link href="#plans">요금</Link><Link href="/analyze" className="button button-small">무료로 진단하기</Link></nav>
      </header>

      <section className={"container " + oneClickStyles.banner}><div><span className={oneClickStyles.icon}><MousePointerClick/></span><span><small>ONE-CLICK START</small><b>한 방에 올리고, 원클릭으로 시작하세요.</b></span></div><p><strong>입력은 간단하게, 분석은 섬세하게.</strong><br/>공고부터 자소서와 지원자료까지 한곳에서 이어집니다.</p></section>

      <section className="hero container">
        <div className="eyebrow">AI 취업 지원서 코치</div>
        <h1>좋은 문장보다,<br/><em>합격을 위한 준비</em>를 봅니다.</h1>
        <p>채용공고와 내 경험, 지원서 전체를 연결해 지금 가장 먼저 고칠 부분을 근거와 함께 알려드려요.</p>
        <LandingEntry />
        <div className="trust-row"><span><Check/> 없는 경험 생성 금지</span><span><Check/> 내 말투와 사실 보존</span><span><Check/> 합격 확률 표시 없음</span></div>
      </section>

      <section className="proof container" aria-label="분석 결과 예시">
        <div className="result-preview">
          <div className="preview-head"><div><span className="status-dot"/>분석 완료</div><span>현대모비스 · 생산관리</span></div>
          <div className="preview-grid">
            <div className="score-block"><small>지원서 준비도</small><strong>82</strong><span>/ 100</span><div className="score-bar"><i/></div><p>기본 구성은 탄탄해요. 이제 공고와의 연결을 더 선명하게 만들 차례예요.</p></div>
            <div className="issues"><small>가장 먼저 고칠 3가지</small><ol><li><b>지원동기의 기업 연결이 약해요</b><span>공고의 ‘공정 개선’ 요구와 경험을 연결해 보세요.</span></li><li><b>성과의 근거가 부족해요</b><span>결과를 확인할 수 있는 기준이나 변화를 추가하세요.</span></li><li><b>2·3번 문항의 경험이 겹쳐요</b><span>3번에는 협업 경험을 배치하는 편이 좋아요.</span></li></ol></div>
          </div>
        </div>
      </section>

      <PricingComparison />

      <section className={"section container " + landingStyles.states}>
        <div className="section-label">어디까지 작성했든</div>
        <h2>지금 상태에 맞는 방식으로<br/>바로 시작할 수 있어요.</h2>
        <div className="feature-grid">
          <article><span className={landingStyles.number}>01 · CREATE</span><h3>아직 아무것도 못 썼어요</h3><p>경험과 소재를 찾고 개요부터 함께 만들어요.</p></article>
          <article><span className={landingStyles.number}>02 · BUILD</span><h3>써봤지만 내용이 부족해요</h3><p>부족한 행동과 결과를 확인해 현재 초안을 강화해요.</p></article>
          <article><span className={landingStyles.number}>03 · POLISH</span><h3>거의 완성했어요</h3><p>말투와 사실을 보존하면서 제출 전 오류를 확인해요.</p></article>
        </div>
      </section>

      <section className="section container" id="how"><div className="section-label">왜 MOOA인가요?</div><h2>AI 답변이 아니라<br/>지원 과정 전체를 정리해요.</h2><div className="feature-grid">{differences.map(({icon: Icon,title,body})=><article key={title}><div className="icon-box"><Icon/></div><h3>{title}</h3><p>{body}</p></article>)}</div></section>

      <section className={"container " + landingStyles.narrative}>
        <div className={landingStyles.narrativeIntro}>
          <span>FACT TO VALUE</span>
          <h2>과장하지 않고,<br/>경험의 가치를 놓치지 않게.</h2>
          <p>없는 성과를 꾸며내지도, 입력한 문장만 기계적으로 고치지도 않아요. 실제 경험 안에서 의미를 찾고 지원 직무가 이해할 수 있는 언어로 정리합니다.</p>
        </div>
        <div className={landingStyles.narrativeSteps}>
          <article><span>01</span><div><b>사실은 지킵니다</b><p>제공한 경험과 수치, 역할의 경계를 바꾸지 않아요.</p></div></article>
          <article><span>02</span><div><b>의미는 적극적으로 찾습니다</b><p>평범해 보이는 경험에서도 행동, 배운 점과 이전 가능한 강점을 찾아요.</p></div></article>
          <article><span>03</span><div><b>직무 언어로 연결합니다</b><p>확인이 필요한 해석은 먼저 물어보고, 사실이 된 내용만 설득력 있게 작성해요.</p></div></article>
        </div>
      </section>

      <section className={"container " + outcomeStyles.section}>
        <div>
          <span>LEARNING LOOP</span>
          <h2>감이 아니라,<br/>실제 지원 결과에서 배우는 서비스를 만듭니다.</h2>
        </div>
        <div className={outcomeStyles.body}>
          <p>동의한 지원 사례의 결과가 축적될수록 경험 선택, 직무 연결과 지원서 검토 기준을 더 현실적으로 개선합니다.</p>
          <strong>다른 사람의 자기소개서를 따라 쓰는 것이 아니라, 결과에서 나타나는 패턴을 분석 기준 개선에 활용합니다.</strong>
          <small><ShieldCheck /> 개인정보와 원본 자료는 서비스 제공 및 동의한 개선 목적에 맞게 분리해 관리하도록 설계하고 있습니다.</small>
        </div>
      </section>

      <section className="section container process"><div><div className="section-label">3단계로 간단하게</div><h2>자료를 넣으면,<br/>고칠 순서가 보여요.</h2></div><ol><li><span>01</span><div><b>채용공고와 지원서 입력</b><p>텍스트로 붙여넣거나 파일을 올리세요.</p></div></li><li><span>02</span><div><b>공고·경험·문항 교차 분석</b><p>요구역량과 실제 근거를 함께 확인해요.</p></div></li><li><span>03</span><div><b>우선순위대로 개선</b><p>이유가 분명한 제안부터 반영하세요.</p></div></li></ol></section>

      <section className={"container " + positioningStyles.simple}>
        <div className={positioningStyles.simpleHead}><div><span>ONE PLACE, FULL REVIEW</span><h2>입력은 간단하게.<br/>분석은 섬세하게.</h2></div><p><b>자소서, 한 번에 올리세요.</b><br/>채용공고와 자기소개서, 이력서와 경력기술서를 한곳에 넣으면 MOOA가 문항과 경험을 정리하고 고칠 이유까지 체계적으로 보여드립니다.</p></div>
        <div className={positioningStyles.simpleGrid}><article><span><UploadCloud/></span><b>자료는 한 번에</b><p>전체 복붙이나 파일 업로드로 간편하게 시작해요.</p></article><article><span><ListChecks/></span><b>문항은 자동 정리</b><p>한 번에 넣은 지원서를 내부에서는 문항별로 나눠요.</p></article><article><span><ScanSearch/></span><b>공고와 경험은 함께</b><p>문장만 보지 않고 요구역량과 실제 근거를 연결해요.</p></article><article><span><ShieldCheck/></span><b>사실은 정확하게</b><p>없는 성과는 만들지 않고 확인된 내용으로 완성해요.</p></article></div>
      </section>

      <section className={"container " + positioningStyles.ambition}>
        <div className={positioningStyles.ambitionIntro}><span>BEYOND THE DOCUMENT</span><h2>우리의 준비는<br/>서류 합격에서 끝나지 않습니다.</h2><p>경쟁이 높은 채용일수록 잘 다듬은 한 문장보다 지원서 전체에서 무엇을 어떻게 보여주는지가 중요합니다. 서류에서 설득한 경험이 면접에서도 흔들리지 않도록 최종 합격까지 이어지는 준비를 설계합니다.</p><div className={positioningStyles.tags}><span>대기업 공채</span><span>생산직</span><span>반도체·자동차·에너지</span><span>경력직</span><span>공기업</span><span>중견기업</span></div></div>
        <div className={positioningStyles.ambitionBody}><span>THE GOAL IS THE FINAL</span><h3>이번 지원을 꼭 잡고 싶다면,<br/>첨삭 이후까지 준비하세요.</h3><p>공고에 맞는 경험을 고르고, 문항별 근거를 보완하고, 제출 전 충돌을 점검한 뒤 실제 지원자료에서 이어질 면접 질문까지 준비합니다.</p><ol><li><span>01</span>공고 요구와 경험 근거 연결</li><li><span>02</span>문항별 소재 배치와 최종 첨삭</li><li><span>03</span>제출 전 검수와 면접 리스크 확인</li></ol><Link href="/onboarding">PRO로 제대로 준비하기 <ArrowRight/></Link></div>
      </section>

      <section className={"container " + enterpriseStyles.section}>
        <div className={enterpriseStyles.copy}><span>HIGH-COMPETITION APPLICATION</span><h2>경쟁 높은 대기업 지원,<br/>더 꼼꼼하게.</h2><p><b>현대자동차 생산직, 기아, SK하이닉스, S-OIL처럼 꼭 잡고 싶은 채용</b>이 있다면 단순 문장 첨삭을 넘어 공고와 경험 전체를 함께 분석하세요.</p><div className={enterpriseStyles.companies}><span>현대자동차 생산직</span><span>기아</span><span>SK하이닉스</span><span>S-OIL</span></div><small>표시된 기업은 지원 대상의 예시이며, MOOA Resume와 공식 제휴·후원·인증 관계를 의미하지 않습니다.</small></div>
        <div className={enterpriseStyles.scope}><span>한곳에서 이어지는 준비</span><h3>입력은 한 번에,<br/>지원 준비는 빠짐없이.</h3><ol><li>채용공고 핵심 요구 분석</li><li>지원 직무에 맞는 경험 선택</li><li>문항별 첨삭과 근거 보완</li><li>제출 전 오류·면접 리스크 점검</li></ol><Link href="/onboarding">대기업 지원 PRO로 준비하기 <ArrowRight/></Link></div>
      </section>

      <section className={"container " + positioningStyles.manifesto}>
        <div className={positioningStyles.manifestoIcon}><Target/></div>
        <div className={positioningStyles.manifestoCopy}><span>MOOA RESUME · OUR GOAL</span><h2>무아레쥬메의 자소서 첨삭은<br/>1차 서류 합격이 목표가 아닙니다.</h2><strong>최종 합격 후 입사가 목표입니다.</strong><p>단순히 1차 합격을 위해 첨삭하시나요? 저희는 서류 합격, 면접 합격, 입사를 목표로 첨삭을 진행합니다.</p></div>
        <div className={positioningStyles.manifestoGoal}><small>OUR FINAL GOAL</small><b>우리의 목표는<br/>최종 합격입니다.</b><Link href="/onboarding">지원 준비 시작하기 <ArrowRight/></Link></div>
      </section>
      <section className="cta-section"><div className="container"><div><span>첫 분석은 가볍게 시작하세요</span><h2>내 지원서에서 놓친 근거를<br/>지금 확인해 보세요.</h2></div><Link href="/analyze" className="button button-light">무료 진단 시작 <ArrowRight size={18}/></Link></div></section>
      <footer className="container"><div className="brand"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></div><p>지원자의 실제 경험을 존중하는 AI 취업 코치<br/><small>정답을 강요하기보다, 불필요한 감점 요소를 줄입니다.</small></p><Link href="/guide">이용방법 · 자주 묻는 질문</Link><a href="mailto:support@mooaresume.com">제휴·협업 문의: support@mooaresume.com</a><span>© 2026 MOOA Resume</span></footer>
    </main>
  );
}
