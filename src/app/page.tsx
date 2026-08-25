import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, Check, FileSearch, ListChecks, MousePointerClick, ScanSearch, ShieldCheck, Sparkles, Target, UploadCloud, UserRoundSearch, Users } from "lucide-react";
import { LandingEntry } from "@/components/landing-entry";
import { PricingComparison } from "@/components/pricing-comparison";
import landingStyles from "./landing-sections.module.css";
import outcomeStyles from "./outcome-learning.module.css";
import positioningStyles from "./landing-positioning.module.css";
import enterpriseStyles from "./enterprise-promo.module.css";
import oneClickStyles from "./one-click.module.css";
import fieldStyles from "./field-credibility.module.css";
import { getSiteUrl } from "@/lib/site-url";

const differences = [
  { icon: FileSearch, title: "지원서 전체를 한 번에", body: "문항별 완성도뿐 아니라 경험 중복과 공고 연결까지 함께 봅니다." },
  { icon: ShieldCheck, title: "없는 경험은 만들지 않게", body: "부족한 근거는 임의로 채우지 않고, 확인이 필요한 질문으로 돌려드립니다." },
  { icon: Sparkles, title: "고칠 순서가 분명하게", body: "점수보다 중요한 개선 3가지를 근거와 함께 먼저 보여드립니다." },
];

// The site's front door. This was /dev-home while the Coming Soon page held
// "/" — noindex and titled a preview, because it led into a checkout flow that
// was not open yet. Both of those reasons are gone now that it is the page
// visitors and search engines arrive at.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: "MOOA Resume", alternateName: "무아레쥬메", url: siteUrl, description: "채용공고와 지원자의 경험을 연결하는 AI 자소서 첨삭 서비스" },
      { "@type": "WebSite", "@id": `${siteUrl}/#website`, url: siteUrl, name: "MOOA Resume", alternateName: "무아레쥬메", inLanguage: "ko-KR", publisher: { "@id": `${siteUrl}/#organization` } },
      // Launched, and the markup has to say so. A Service node with no offers
      // reads to a crawler as "a thing this company does", not "a thing you can
      // buy right now" — and rich results for price and availability only
      // appear when both are stated. FINAL is deliberately absent: it has no
      // checkout yet, and listing a price for it would be an offer we cannot
      // honour.
      {
        "@type": "Service",
        "@id": `${siteUrl}/#service`,
        name: "MOOA Resume AI 자소서 첨삭",
        serviceType: "AI 자기소개서 첨삭 및 취업 지원서 분석",
        provider: { "@id": `${siteUrl}/#organization` },
        areaServed: "KR",
        availableLanguage: "ko",
        offers: [
          { "@type": "Offer", name: "QUICK", description: "이미 쓴 자기소개서를 문장·논리·구체성 기준으로 첨삭합니다.", price: "5900", priceCurrency: "KRW", availability: "https://schema.org/InStock", url: `${siteUrl}/quick` },
          { "@type": "Offer", name: "PRO", description: "채용공고와 이력서를 함께 읽어 무엇을 쓸지부터 최종검수까지 진행합니다.", price: "12900", priceCurrency: "KRW", availability: "https://schema.org/InStock", url: `${siteUrl}/pro/polish` },
        ],
      },
      // Answers the questions people actually type into search, in the markup
      // rather than only in prose. Every answer here is one the site already
      // gives on a page a visitor can read.
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: [
          { "@type": "Question", name: "AI 자소서 첨삭은 어떻게 진행되나요?", acceptedAnswer: { "@type": "Answer", text: "자기소개서를 문항별로 넣고 회사가 정한 글자 수를 적으면, 채용공고와 이력서를 함께 읽어 고칠 곳과 그 이유를 근거와 함께 알려드립니다. 결과에는 문항별 Before → After와 복사해서 제출할 최종 첨삭본이 포함됩니다." } },
          { "@type": "Question", name: "없는 경험을 지어내지는 않나요?", acceptedAnswer: { "@type": "Answer", text: "지어내지 않습니다. 근거가 모자라면 임의로 채우는 대신 확인이 필요한 질문으로 돌려드립니다. 직접 올리신 이력서에 적힌 사실은 지원자가 밝힌 내용이므로 문장에 쓰일 수 있습니다." } },
          { "@type": "Question", name: "결제 전에 AI가 실행되나요?", acceptedAnswer: { "@type": "Answer", text: "아닙니다. 결제가 끝난 뒤에 분석이 시작됩니다. 그 전 화면은 무엇을 몇 자 분석할지 정리해 보여드리는 단계입니다." } },
          { "@type": "Question", name: "합격 확률을 알려주나요?", acceptedAnswer: { "@type": "Answer", text: "알려주지 않습니다. 합격에는 스펙·경쟁률·채용 규모처럼 글과 무관한 요소가 섞여 있어 확률로 말할 수 없습니다. 대신 지금 지원서에서 먼저 고칠 곳을 근거와 함께 보여드립니다." } },
        ],
      },
    ],
  };
  return (
    <main className="home-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/>
      <header className="site-header">
        <Link href="/" className="brand" aria-label="MOOA Resume 홈"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></Link>
        <nav aria-label="주요 메뉴"><Link href="/guide">이용 방법</Link><Link href="#plans">요금</Link><Link href="/analyze" className="button button-small">무료로 진단하기</Link></nav>
      </header>

      <section className={"container " + oneClickStyles.banner}><div><span className={oneClickStyles.icon}><MousePointerClick/></span><span><small>ONE-CLICK START</small><b>한 방에 올리고, 원클릭으로 시작하세요.</b></span></div><p><strong>입력은 간단하게, 분석은 섬세하게.</strong><br/>공고부터 자소서와 지원자료까지 한곳에서 이어집니다.</p></section>

      <section className="hero container">
        {/* Three drifting blobs rather than one rotating fan. A conic gradient
            has hard sector edges, and sweeping them past the eye is exactly
            what made the first version read as a turning box. */}
        <div className="hero-aura" aria-hidden="true"><i/><i/><i/></div>
        <div className="eyebrow">AI 취업 지원서 코치</div>
        <h1>좋은 문장보다,<br/><em>합격을 위한 준비</em>를 봅니다.</h1>
        <p>채용공고와 내 경험, 지원서 전체를 연결해 지금 가장 먼저 고칠 부분을 근거와 함께 알려드려요.</p>
        <LandingEntry />
        <div className="trust-row"><span><Check/> 없는 경험은 지어내지 않아요</span><span><Check/> 내 말투 그대로 남겨요</span><span><Check/> 점수 대신 고칠 곳을 알려드려요</span></div>
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

      {/* Says who is behind the judgement, which is the one thing an AI editing
          tool cannot claim by default. Every sentence here is a statement about
          real people and has to stay literally true — see the change log entry
          for the wording that was deliberately not used. */}
      <section className={"container " + fieldStyles.section}>
        <div className={fieldStyles.head}>
          <span>FIELD-PROVEN CONSULTING</span>
          <h2>현장에서 검증된 컨설팅을, 기술로.</h2>
          <p className={fieldStyles.lead}>AI만으로 만든 첨삭이 아닙니다.</p>
          <p className={fieldStyles.body}>무아레쥬메는 <b>대학·취업전문기관·재단 등 실제 취업지원 현장</b>에서 쌓아온 상담 경험과 첨삭 기준, 직무 분석 방법을 그대로 서비스에 담았습니다. 한 사람의 감이 아니라 <b>여러 직군의 전문가가 각자의 자리에서 보는 것</b>을 모아 기준으로 만듭니다.</p>
          <div className={fieldStyles.network}>
            <span className={fieldStyles.networkLabel}>WHO SETS THE STANDARD</span>
            <div className={fieldStyles.chips}>
              <span>취업컨설턴트</span>
              <span>직업상담사</span>
              <span>첨삭 멘토</span>
              <span>인사담당자</span>
              <span>직무 전문가</span>
              <span>현직자·재직자</span>
            </div>
            {/* Says what each group contributes rather than only listing them —
                a list of job titles with nothing attached reads as decoration. */}
            <p className={fieldStyles.networkNote}>오랜 경력의 취업컨설턴트가 쌓은 첨삭 기술과 노하우, 인사담당자가 서류를 볼 때 쓰는 시선과 평가 기준, 현직자·재직자가 겪은 실제 업무와 사례. 이 셋이 각각 다른 것을 잡아냅니다.</p>
          </div>
        </div>
        <div className={fieldStyles.points}>
          <article><span><Users/></span><h3>상담 현장의 첨삭 기준</h3><p>수많은 구직자를 마주하며 정리된 기준으로 봅니다. 무엇을 남기고 무엇을 덜어낼지가 취향이 아니라 근거로 정해집니다.</p></article>
          <article><span><Briefcase/></span><h3>직무를 읽는 방법</h3><p>채용공고를 문장으로 읽지 않고 요구역량으로 분해합니다. 지원자의 경험 중 무엇이 그 자리에 닿는지부터 찾습니다.</p></article>
          <article><span><UserRoundSearch/></span><h3>인사담당자의 시선</h3><p>읽는 사람은 결국 사람입니다. 왜 이 지원자를 뽑아야 하는지가 전달되는지를 마지막에 확인합니다.</p></article>
        </div>
        <div className={fieldStyles.closing}>
          <p>단순히 문장을 예쁘게 바꾸는 것에 그치지 않습니다. 지원자의 경험을 이해하고, 채용공고와 직무를 분석하며, 인사담당자와 면접관의 시선에서 전달되도록 돕는 것. 그것이 무아레쥬메가 생각하는 자기소개서 첨삭입니다.</p>
          <strong>현장의 경험을 기술로.<br/>첨삭을 넘어, 실제 취업에 가까워지는 지원서로.</strong>
          <small>MOOA RESUME · 무아레쥬메</small>
        </div>
      </section>

      {/* Why the price can be higher than a plain AI editor: the tool is
          replaceable, the judgement is not. Every claim here is written in the
          tense it can actually be defended in — the case database is described
          as being built, not as already in use, because that claim needs
          consent and de-identification behind it first. */}
      <section className={"container " + fieldStyles.loop}>
        <div className={fieldStyles.loopHead}>
          <span>STANDARDS THAT KEEP LEARNING</span>
          <h2>같은 AI라도,<br/><em>판단 기준은 다릅니다.</em></h2>
          <p className={fieldStyles.loopLead}>같은 AI 컨설팅이더라도 담긴 경험이 다릅니다. 오랜 경력의 취업 전문가와 커리어팀, 컨설턴트들의 경험과 기술이 이 안에 들어 있습니다.</p>
          <p>무아레쥬메는 완성된 서비스가 아니라 <b>계속 경험을 쌓는 취업 컨설팅 시스템</b>을 지향합니다. 같은 AI를 쓰더라도 무엇을 문제로 볼지, 무엇을 남기고 무엇을 덜어낼지를 정하는 기준은 저희가 만듭니다. 그 기준은 지금도 쌓이고 있고, 앞으로 계속 정밀해집니다.</p>
        </div>

        <div className={fieldStyles.assets}>
          <article>
            <span>PEOPLE</span>
            <h3>전문가 네트워크</h3>
            <p>취업컨설턴트·직업상담사·인사담당자·직무 전문가·현직자가 각자의 자리에서 보는 것을 모읍니다.</p>
            <small>운영 중</small>
          </article>
          <article>
            <span>KNOW-HOW</span>
            <h3>컨설팅 지식베이스</h3>
            <p>상담과 첨삭에서 반복해 만난 문제와 그 판단 기준을 규칙으로 옮겨 쌓습니다. 서비스가 실제로 무엇을 지적할지가 여기서 정해집니다.</p>
            <small>계속 확장 중</small>
          </article>
          <article>
            <span>CASES</span>
            <h3>사례 데이터베이스</h3>
            <p>동의한 지원서와 서류전형 결과, 첨삭 전후의 변화를 개인정보를 지운 사본으로 모아 기준을 검증합니다.</p>
            <small>동의 기반 수집 중</small>
          </article>
        </div>

        <div className={fieldStyles.cycle}>
          <span>실제 경험</span><i>→</i>
          <span>기준화</span><i>→</i>
          <span>기술 적용</span><i>→</i>
          <span>실제 결과</span><i>→</i>
          <span>다시 개선</span>
        </div>

        <div className={fieldStyles.loopGrid}>
          <article><h3>상담에서 반복되는 문제를 기준으로</h3><p>경험은 좋은데 표현을 못 하는 경우, 본인 기여가 드러나지 않는 경우, 지원동기를 억지로 잇는 경우. 현장에서 반복해서 만나는 문제들을 판단 규칙으로 옮깁니다.</p></article>
          <article><h3>직무마다 다르게 봅니다</h3><p>생산·품질·안전·개발·마케팅은 중요하게 보는 지점이 각각 다릅니다. 하나의 좋은 자소서 형태를 모든 직무에 적용하지 않습니다.</p></article>
          <article><h3>&ldquo;잘 썼나&rdquo;가 아니라 &ldquo;걸릴 데가 있나&rdquo;</h3><p>채용 담당자가 의심할 것은 없는지, 굳이 떨어뜨릴 이유는 없는지, 면접에서 무엇을 확인할지를 함께 점검합니다.</p></article>
          <article><h3>합격 사례만 보지 않습니다</h3><p>합격에는 스펙·경쟁률·채용 규모처럼 글과 무관한 요소도 섞입니다. 합격한 글만 모으면 &ldquo;이렇게 쓰면 붙는다&rdquo;는 틀린 결론에 이릅니다.</p></article>
        </div>

        <div className={fieldStyles.loopNote}>
          <ShieldCheck/>
          <p><b>실제 지원 결과는 이용자가 동의한 경우에만, 개인정보를 지운 사본으로 반영합니다.</b> 동의는 결과 화면에서 언제든 켜고 끌 수 있고, 철회하시면 보관 중이던 사본까지 그 자리에서 지웁니다. 그리고 표본이 충분히 쌓이기 전까지 &ldquo;이 문장은 합격률을 몇 % 높입니다&rdquo; 같은 수치는 쓰지 않습니다. 저희가 말할 수 있는 것은 <b>반복해서 발견되는 패턴</b>까지입니다.</p>
        </div>

        <p className={fieldStyles.loopClose}>실제 경험이 기준이 되고,<br/><em>실제 결과가 다시 기준을 발전시킵니다.</em></p>
      </section>

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
      <footer className="container"><div className="brand"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></div><p>지원자의 실제 경험을 존중하는 AI 취업 코치<br/><small>정답을 강요하기보다, 불필요한 감점 요소를 줄입니다.</small></p><Link href="/guide">이용방법 · 자주 묻는 질문</Link><Link href="/refer">친구 추천</Link><a href="mailto:support@mooaresume.com">제휴·협업 문의: support@mooaresume.com</a><span>© 2026 MOOA Resume</span></footer>
    </main>
  );
}
