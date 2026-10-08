import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, Check, FileCheck2, ListChecks, Mic, Repeat2, ShieldCheck, SquareCheckBig } from "lucide-react";
import { SiteNav } from "@/components/site-nav";
import { isFinalEnabled } from "@/domain/final-availability";

/**
 * FINAL 전용 소개 페이지.
 *
 * 홈의 가격표·정적 예시 카드는 FINAL을 한 줄로만 스쳐 지나간다. FINAL만 다루는
 * 자리가 따로 있어야 "PRO에 무엇이 더 붙는지"를 제대로 설명할 수 있어서 만들었다.
 * 신청 버튼은 `isFinalEnabled()`를 그대로 따른다(가격표·입력 화면과 같은 값).
 */
export const metadata: Metadata = {
  title: "FINAL — 지원서 완성부터 면접 답변까지",
  description: "FINAL은 PRO의 모든 첨삭에 서류 위험요소 점검, 제출 전 마무리, 면접 준비팩(자기소개·지원동기 답변과 키워드 암기), 인터랙티브 AI 모의면접까지 더합니다.",
  alternates: { canonical: "/final" },
};

const FEATURES: Array<{ icon: typeof Check; title: string; body: string }> = [
  { icon: ListChecks, title: "면접 답변 준비", body: "제출한 자료 그대로 30초·1분 자기소개, 지원동기, 입사 후 포부까지 만들고 키워드로 외우도록 정리합니다." },
  { icon: FileCheck2, title: "서류 위험요소 점검(FINAL 검증)", body: "이력서와 자기소개서를 나란히 놓고 어긋나는 곳, 근거 없는 주장, 면접관이 물을 만한 지점을 찾습니다." },
  { icon: SquareCheckBig, title: "제출 전 마무리", body: "찾아낸 것들을 새로 분석하지 않고, 지금 할 수 있는 일과 면접에서 준비할 일로 다시 정리합니다." },
  { icon: Mic, title: "인터랙티브 AI 모의면접", body: "예상 질문에 실제로 답하면 AI가 답변을 평가하고, 상황에 맞는 꼬리질문을 이어서 던집니다." },
  { icon: Repeat2, title: "취약 질문 재훈련", body: "답이 흔들린 질문만 따로 모아 다시 연습할 수 있습니다." },
  { icon: Award, title: "최종 면접 리포트", body: "모의면접이 끝나면 어디서 흔들렸고 무엇을 더 준비해야 하는지 한 번에 정리해 드립니다." },
];

export default function FinalLandingPage() {
  const enabled = isFinalEnabled();
  return (
    <main>
      <header className="site-header">
        <Link href="/" className="brand" data-brand aria-label="무아레쥬메 (MOOA Resume) 홈"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></Link>
        <SiteNav />
      </header>

      <section className="hero container">
        <div className="eyebrow">FINAL</div>
        <h1 style={{ fontSize: "clamp(34px,4.4vw,54px)", lineHeight: 1.2, letterSpacing: "-.045em", margin: "18px 0 20px" }}>
          지원서 완성부터<br/><em style={{ fontStyle: "normal", color: "var(--green)" }}>면접 답변</em>까지, 한 번에.
        </h1>
        <p className="hero-lead">PRO가 하는 모든 첨삭에, 서류를 다시 살피는 검증과 실제로 말해 볼 면접 준비까지 더했습니다.</p>
        <div className="hero-actions">
          {enabled
            ? <Link href="/onboarding" className="button">무료로 시작하기 <ArrowRight size={18}/></Link>
            : <button className="button" disabled>FINAL 준비 중</button>}
          <span>19,900원 · 지원 건 1개 기준</span>
        </div>
        <Link href="/result/sample" className="hero-sample">FINAL 결과 화면 예시 보기 <ArrowRight size={18}/></Link>
        <div className="trust-row"><span><Check/> PRO의 모든 첨삭 포함</span><span><Check/> 확인 안 된 내용은 지어내지 않아요</span><span><Check/> 서류마다 다르면 먼저 여쭤봐요</span></div>
      </section>

      <section className="section container" id="how">
        <div className="section-label">FINAL이 PRO에 더하는 것</div>
        <h2>서류를 냈다고 끝이 아니라,<br/>면접까지 준비해서 끝냅니다.</h2>
        <div className="feature-grid">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article key={title}><div className="icon-box"><Icon/></div><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>

      <section className="proof container" aria-label="면접 준비팩 예시">
        <div className="section-label">면접 준비팩 · 이렇게 만들어요</div>
        <h2 style={{ fontSize: 28, letterSpacing: "-.03em", margin: "10px 0 22px" }}>지어내지 않고, 확인한 것만 씁니다.</h2>
        <div className="result-preview">
          <div className="preview-head"><div><span className="status-dot"/>면접 준비팩</div><span>샘플모빌리티 · 품질관리</span></div>
          <div className="preview-grid">
            <div className="score-block">
              <small>30초 자기소개</small>
              <p style={{ fontSize: 14, color: "#3c463f", lineHeight: 1.75, margin: "10px 0 16px" }}>
                “검사 기록의 빈칸을 끝까지 확인하는 품질관리 지원자입니다. 샘플파트 품질팀에서 검사보조로 일하며 체크리스트 초안을 만들어 누락 기록을 8건에서 2건으로 줄이는 데 참여했습니다. 이 꼼꼼함으로 공정검사 기록 관리에 기여하겠습니다.”
              </p>
              <span className="tag">빈칸을 끝까지 확인</span>{" "}<span className="tag">검사보조</span>{" "}<span className="tag">8건에서 2건</span>
            </div>
            <div className="issues">
              <small>이렇게 만들어요</small>
              <ol>
                <li><b>적은 내용 그대로만 써요</b><span>이력서·자소서에 없는 성과나 직책은 새로 만들지 않아요.</span></li>
                <li><b>서류마다 다르면 먼저 확인해요</b><span>같은 경험이 다르게 적혀 있으면, 어느 쪽이 맞는지 확인해 주신 뒤에만 답변에 씁니다.</span></li>
                <li><b>어디서 가져온 문장인지 보여드려요</b><span>만든 답변 옆에 어느 자료, 몇 번째 문단에서 가져왔는지 표시돼요.</span></li>
              </ol>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <Link href="/result/sample" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--green)", fontWeight: 800, fontSize: 13.5, textDecoration: "underline", textUnderlineOffset: 4 }}>실제로 눌러 보는 FINAL 결과 화면 보기 <ArrowRight size={16}/></Link>
        </div>
      </section>

      <section className={"container"} style={{ padding: "20px 0 60px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, border: "1px solid #e7d8af", borderRadius: 12, padding: "20px 25px", background: "#fffdf5" }}>
          <ShieldCheck color="#a3761d" style={{ flex: "none", marginTop: 2 }}/>
          <p style={{ fontSize: 13, color: "#756c57", margin: 0, lineHeight: 1.7 }}>FINAL 검증·제출 전 마무리·모의면접·최종 면접 리포트는 붙거나 떨어질 확률을 점치지 않습니다. 서류에서 확인 가능한 위험요소와, 지금 할 수 있는 일을 알려드릴 뿐입니다.</p>
        </div>
      </section>

      <section className="cta-section"><div className="container"><div><span>지원서 하나로 끝까지</span><h2>서류부터 면접까지,<br/>FINAL로 한 번에 준비하세요.</h2></div><div className="cta-actions">
        {enabled
          ? <Link href="/onboarding" className="button button-light">무료로 시작하기 <ArrowRight size={18}/></Link>
          : <button className="button button-light" disabled>FINAL 준비 중</button>}
        <Link href="/result/sample" className="cta-secondary">FINAL 결과 화면 예시 보기 <ArrowRight size={16}/></Link>
      </div></div></section>
    </main>
  );
}
