import type { Metadata } from "next";
import Link from "next/link";
import { HeaderAccount } from "@/components/header-account";
import { AlertTriangle, ArrowRight, CheckCircle2, Lightbulb } from "lucide-react";
import { editingStanceConfig } from "@/domain/editing-stance";
import styles from "./guide.module.css";

/**
 * The how-to-use page.
 *
 * Kept out of search on purpose: it is a working document shared by link while
 * the wording is still being settled, and a half-finished guide ranking above
 * the product page would answer questions with copy nobody signed off on.
 */
export const metadata: Metadata = {
  title: "사용 방법",
  description: "무아레쥬메로 자기소개서를 첨삭받는 순서와, 결과가 가장 좋게 나오는 입력 방법입니다.",
  robots: { index: false, follow: false },
};

const sections = [
  ["order", "진행 순서"],
  ["input", "자소서 넣는 법"],
  ["length", "글자 수"],
  ["materials", "공고와 이력서"],
  ["plans", "어떤 걸 고를까"],
  ["stance", "첨삭 방향"],
  ["tips", "현장에서 하는 조언"],
  ["result", "결과 읽는 법"],
  ["faq", "자주 막히는 것"],
] as const;

export default function GuidePage() {
  return (
    <main className="home-page">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="MOOA Resume 홈"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></Link>
        <nav aria-label="주요 메뉴"><Link href="/#plans">요금</Link><HeaderAccount /><Link href="/analyze" className="button button-small">시작하기</Link></nav>
      </header>

      <div className={"container " + styles.page}>
        <div className={styles.head}>
          <span>HOW TO USE</span>
          <h1>이렇게 넣으면<br/>결과가 가장 좋습니다.</h1>
          <p>같은 자기소개서라도 어떻게 넣느냐에 따라 결과가 꽤 달라집니다. 순서대로 한 번만 읽어 보시면 됩니다.</p>
        </div>

        <nav className={styles.toc} aria-label="목차">
          {sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>

        <section id="order" className={styles.block}>
          <span>STEP</span>
          <h2>전체 순서는 네 단계입니다</h2>
          <ol className={styles.steps}>
            <li><div><b>자기소개서를 넣습니다</b><p>붙여넣거나 파일을 올립니다. <b>문항이 여러 개면 문항별로 나눠 넣는 쪽이 훨씬 좋습니다.</b></p></div></li>
            <li><div><b>문항마다 글자 수 제한을 적습니다</b><p>회사가 정한 제한을 그대로 적으시면 됩니다. 이 숫자에 맞춰 첨삭본이 만들어집니다.</p></div></li>
            <li><div><b>채용공고와 이력서를 올립니다 <em>PRO부터</em></b><p>이 두 가지가 있어야 <b>공고 ↔ 경험 매칭</b>과 <b>자료 간 교차검증</b>이 실제로 동작합니다.</p></div></li>
            <li><div><b>범위를 확인하고 결제합니다</b><p>결제 전에 몇 자를 분석하는지, 얼마인지 화면에서 먼저 보여드립니다. <b>결제 전에는 AI를 호출하지 않습니다.</b></p></div></li>
          </ol>
        </section>

        <section id="input" className={styles.block}>
          <span>INPUT</span>
          <h2>자소서는 문항별로 나눠 넣어 주세요</h2>
          <p>전체를 한 번에 붙여넣어도 됩니다. 다만 <b>문항별로 나눠 넣는 쪽을 권합니다.</b> 이유는 단순합니다 — 문항마다 회사가 정한 글자 수가 다르고, 첨삭도 <b>문항별 피드백</b>과 <b>문항별 Before → After</b>로 나옵니다. 한 칸에 다 들어가면 그 구분이 사라집니다.</p>
          <div className={styles.pairs}>
            <div><h4>붙여넣기</h4><p>문항 번호를 줄 맨 앞에 두고 <code>1.</code> <code>2.</code> <code>3.</code> 형식으로 쓰시면 자동으로 나뉩니다. 나뉜 결과는 화면에서 확인하고 고칠 수 있습니다.</p></div>
            <div><h4>파일 올리기</h4><p>PDF · DOCX · TXT · MD를 읽습니다. 여러 개면 ZIP으로 올려도 됩니다. 올린 뒤 <b>문항이 몇 개로 나뉘었는지</b> 꼭 확인해 주세요.</p></div>
          </div>
          <div className={styles.note}>
            <AlertTriangle/>
            <div>
              <b>파일이 이상하게 읽혔다면</b>
              <p>PDF는 문서마다 내부 구조가 달라서, 표로 짜여 있거나 이미지로 저장된 파일은 글자가 붙거나 줄이 엉킬 수 있습니다. 화면에 나온 글이 원본과 다르면 <b>그 상태로 진행하지 마세요.</b></p>
              <p>가장 확실한 방법은 <b>문항별로 직접 복사해 붙여넣는 것</b>입니다. 3분이면 되고, 결과 품질 차이가 가장 큰 구간입니다. <b>[빠진 문항 추가]</b>로 칸을 늘려가며 넣으시면 됩니다.</p>
            </div>
          </div>
        </section>

        <section id="length" className={styles.block}>
          <span>LENGTH</span>
          <h2>글자 수 제한을 꼭 적어 주세요</h2>
          <p>첨삭본은 이 숫자에 맞춰 만들어집니다. 회사가 <b>공백 제외 700자</b>라고 했으면 700을 적으시면 됩니다. 적지 않으면 기본값이 쓰이는데, 실제 요구와 다르면 엉뚱한 분량으로 나옵니다.</p>
          <div className={styles.note}>
            <AlertTriangle/>
            <div>
              <b>넣은 글이 제한보다 훨씬 길면</b>
              <p>예를 들어 한 칸에 8,000자가 들어 있는데 제한이 700자면, 첨삭본은 <b>대부분을 덜어낸 요약</b>이 됩니다. 그렇게 되기 전에 화면에서 먼저 알려드리지만, 대개는 <b>여러 문항이 한 칸에 들어가 있는 경우</b>입니다. 문항을 나누시면 해결됩니다.</p>
            </div>
          </div>
        </section>

        <section id="materials" className={styles.block}>
          <span>MATERIALS</span>
          <h2>공고와 이력서(입사지원서)를 같이 올리면 결과가 달라집니다</h2>
          <p>이 두 가지는 <b>있으면 좋은 것</b>이 아니라 <b>기능을 켜는 것</b>입니다. 없으면 그 항목들은 빈칸으로 나옵니다.</p>
          <div className={styles.pairs}>
            <div><h4>채용공고</h4><p><b>공고 분석</b>, <b>공고 ↔ 경험 매칭</b>, <b>공고 ↔ 지원서 적합도</b>, <b>누락 역량 탐지</b>가 여기에 달려 있습니다. 없으면 &ldquo;공고 내용이 충분하지 않아 대조하지 못했습니다&rdquo;로 남습니다.</p></div>
            <div><h4>이력서(입사지원서)</h4><p><b>이력서 사실로 빈 내용 채우기</b>, <b>자료 간 충돌 검사</b>, <b>기간·수치 확인 필요 탐지</b>가 여기에 달려 있습니다. 별도 이력서가 없으면 <b>기업 입사지원서나 경력기술서</b>도 괜찮습니다.</p></div>
          </div>
          <div className={`${styles.note} ${styles.good}`}>
            <CheckCircle2/>
            <div>
              <b>왜 이력서가 그렇게 중요한가요</b>
              <p>자기소개서만 보면 멀쩡한 문장도, 이력서와 나란히 놓으면 어긋나는 곳이 보입니다. 근무 기간이 5개월인데 오래 주도한 것처럼 읽히거나, 졸업 시점과 입사 시점의 앞뒤가 맞지 않는 식입니다. <b>면접에서 가장 먼저 질문이 들어오는 지점</b>이고, 이력서가 없으면 저희도 그걸 볼 방법이 없습니다.</p>
            </div>
          </div>
        </section>

        <section id="plans" className={styles.block}>
          <span>PLAN</span>
          <h2>어떤 걸 고르면 되나요</h2>
          <div className={styles.cards}>
            <article>
              <h3>QUICK</h3><span className={styles.price}>이미 쓴 것을 고칩니다</span>
              <p>자기소개서를 다 써 두었고, 문장·논리·구체성을 점검해 최종본을 받고 싶은 경우.</p>
              <ul><li>문장별 피드백과 수정 이유</li><li>Before → After 비교</li><li>최종 수정본</li><li>공고·이력서 분석은 없습니다</li></ul>
            </article>
            <article>
              <h3>PRO</h3><span className={styles.price}>쓸 것부터 찾아 완성합니다</span>
              <p>아직 안 썼거나, 썼는데 내용이 부족한 경우. 공고와 이력서를 함께 읽어 <b>무엇을 쓸지</b>부터 정합니다.</p>
              <ul><li>QUICK의 모든 것</li><li>아무것도 없는 상태부터 작성</li><li>공고 ↔ 경험 매칭, 누락 역량 탐지</li><li>면접 예상질문과 리스크 분석</li><li><b>첨삭 방향 선택</b></li></ul>
            </article>
            <article>
              <h3>FINAL</h3><span className={styles.price}>준비 중</span>
              <p>제출 직전에 서류 전체를 검증하고 면접까지 이어가는 단계입니다.</p>
              <ul><li>PRO의 모든 것</li><li>이력서 × 자소서 교차검증</li><li>커리어 타임라인</li><li>면접관 관점의 확인 지점</li></ul>
            </article>
          </div>
          <p style={{ marginTop: 20 }}>어느 것을 고르든 <b>작성 단계</b>를 함께 고르게 됩니다. <b>처음부터 작성</b>은 아무것도 안 쓴 상태, <b>내용 보완</b>은 썼는데 짧거나 빈 문항이 있는 상태, <b>최종 첨삭</b>은 거의 다 쓴 상태입니다. 모르시겠으면 화면이 지금 상태에 맞는 것을 먼저 보여드립니다.</p>
        </section>

        <section id="stance" className={styles.block}>
          <span>DIRECTION</span>
          <h2>정답을 맞히는 대신, 방향을 고르시면 됩니다</h2>
          <p>자기소개서에는 정답이 없습니다. <b>평가하는 것은 결국 사람</b>이라, 같은 문장을 어떤 담당자는 좋아하고 어떤 담당자는 걸고 넘어집니다. 그래서 무아레쥬메는 하나의 정답을 강요하지 않고, <b>어느 쪽으로 갈지를 먼저 여쭤봅니다.</b> PRO부터 고를 수 있습니다.</p>
          <div className={styles.stanceRow}>
            {(["SAFE", "BALANCED", "CONVICTION"] as const).map((stance) => {
              const option = editingStanceConfig[stance];
              return (
                <article key={stance}>
                  <b>{option.icon} {option.label}{stance === "BALANCED" && " · 기본값"}</b>
                  <p>{option.description}</p>
                  <ul>{option.points.map((point) => <li key={point}>{point}</li>)}</ul>
                </article>
              );
            })}
          </div>
          <div className={`${styles.note} ${styles.good}`}>
            <Lightbulb/>
            <div>
              <b>어떤 방향을 골라도 바뀌지 않는 것</b>
              <p>없는 경험·역할·기간·자격·수치는 만들지 않습니다. 다듬는 것은 <b>표현</b>이고, 실제로 하신 일은 그대로 둡니다. 방향은 위험을 얼마나 감수할지에 대한 선택이지, 사실을 바꾸는 스위치가 아닙니다.</p>
            </div>
          </div>
        </section>

        <section id="tips" className={styles.block}>
          <span>FIELD NOTES</span>
          <h2>상담하면서 가장 많이 하는 말</h2>
          <p>도구 사용법이 아니라, <b>수많은 자기소개서를 마주하며 반복해서 하게 된 이야기</b>입니다. 이것만 지켜도 첨삭이 훨씬 수월해집니다.</p>
          <div className={styles.tips}>
            <article>
              <div className={styles.tipHead}><span>01</span><h3>회사가 안 물어본 것부터 쓰지 마세요</h3></div>
              <p>많은 분이 어릴 적 이야기나 성격 소개로 시작합니다. 읽는 사람이 알고 싶은 것은 <b>이 사람이 이 자리에서 무엇을 할 수 있는가</b> 하나입니다. 문항이 묻는 것에 <b>첫 문장부터</b> 답하세요.</p>
              <em>&ldquo;저는 어릴 때부터…&rdquo; 대신 &ldquo;○○ 공정에서 불량을 줄인 경험이 있습니다.&rdquo;</em>
            </article>
            <article>
              <div className={styles.tipHead}><span>02</span><h3>&lsquo;우리&rsquo;가 아니라 &lsquo;제가&rsquo;</h3></div>
              <p>팀 성과를 쓰다 보면 문장이 전부 &lsquo;우리 팀은&rsquo;으로 끝납니다. 면접에서 가장 먼저 들어오는 질문이 <b>&ldquo;그중 본인은 무엇을 하셨나요&rdquo;</b>입니다.</p>
              <p>팀 성과는 그대로 두되, <b>내가 판단하고 내가 움직인 문장</b>을 한 줄이라도 넣어 두세요.</p>
            </article>
            <article>
              <div className={styles.tipHead}><span>03</span><h3>지원동기에 회사 이름이 없다면</h3></div>
              <p>회사 이름만 바꿔서 다른 회사에 그대로 낼 수 있는 지원동기는, 읽는 사람도 그렇게 읽습니다. <b>공고에 적힌 표현</b>이나 그 회사가 실제로 하는 일 하나를 근거로 잡으세요.</p>
              <em>성장·비전·열정만으로 채운 문단은 어느 회사에나 맞고, 그래서 어디에도 안 맞습니다.</em>
            </article>
            <article>
              <div className={styles.tipHead}><span>04</span><h3>수치가 없어도 괜찮습니다</h3></div>
              <p>숫자를 만들어 넣는 것이 가장 위험합니다. 면접에서 한 번만 물어보면 드러나고, 그때는 문장 하나가 아니라 <b>사람이 의심받습니다.</b></p>
              <p>수치가 없으면 <b>무엇이 어떻게 달라졌는지</b>를 쓰세요. &ldquo;재작업 요청이 눈에 띄게 줄었습니다&rdquo;도 충분한 근거입니다.</p>
            </article>
            <article>
              <div className={styles.tipHead}><span>05</span><h3>짧은 재직기간은 숨기지 말고 설명하세요</h3></div>
              <p>이력서에 있는 것을 자기소개서에서 빼면 <b>더 눈에 띕니다.</b> 면접관은 두 서류를 나란히 놓고 봅니다.</p>
              <p>기간이 짧았다면 그 안에서 <b>무엇을 맡았고 무엇을 배웠는지</b>를 한 줄로 정리해 두세요. 먼저 말하는 쪽이 언제나 유리합니다.</p>
            </article>
            <article>
              <div className={styles.tipHead}><span>06</span><h3>제출 전에 소리 내어 한 번 읽어 보세요</h3></div>
              <p>눈으로 읽으면 넘어가는 문장이 입으로 읽으면 걸립니다. <b>숨이 차는 문장은 너무 길고</b>, 읽다가 무슨 말인지 모르겠는 문장은 읽는 사람도 모릅니다.</p>
              <p>가장 빠르고 확실한 마지막 점검입니다.</p>
            </article>
          </div>
        </section>

        <section id="result" className={styles.block}>
          <span>RESULT</span>
          <h2>결과 화면은 이렇게 보시면 됩니다</h2>
          <ol className={styles.steps}>
            <li><div><b>한눈에 보기</b><p>지원서 준비도와 <b>가장 먼저 고칠 3가지</b>가 나옵니다. 여기부터 보시면 됩니다. 점수는 합격 확률이 아니라 준비 상태입니다.</p></div></li>
            <li><div><b>제출본</b><p>원래 쓰신 글에 표시가 붙습니다. 좋은 표현, 덜어낼 부분, 확인이 필요한 부분이 각각 다른 색으로 나옵니다.</p></div></li>
            <li><div><b>문항별 첨삭</b><p>문항마다 Before → After와 고친 이유가 나옵니다. <b>여기서 직접 고칠 수 있고</b>, 고친 내용은 최종 첨삭본에 자동으로 반영됩니다.</p></div></li>
            <li><div><b>최종 첨삭본</b><p>복사해서 그대로 제출할 문장만 모은 화면입니다. 전체 복사, 문항별 복사, DOCX·TXT 저장이 됩니다. DOCX는 한글(HWP)에서도 열립니다.</p></div></li>
          </ol>
        </section>

        <section id="faq" className={styles.block}>
          <span>FAQ</span>
          <h2>자주 막히는 것</h2>
          <div className={styles.faq}>
            <details>
              <summary>문항이 1개로만 나뉘었어요</summary>
              <p>파일에서 문항 번호를 찾지 못한 경우입니다. 자동 구분은 <b>줄 맨 앞의 번호</b>를 기준으로 하는데, 표로 짜인 문서나 이미지로 저장된 PDF는 그 구조가 남아 있지 않습니다.</p>
              <p>이때는 <b>문항별로 직접 붙여넣어 주세요.</b> 자동 구분이 맞더라도 화면에서 한 번 확인하시는 편이 안전합니다.</p>
            </details>
            <details>
              <summary>한글 파일(HWP)은 못 올리나요</summary>
              <p>지금은 PDF · DOCX · TXT · MD만 읽습니다. 한글에서 <b>다른 이름으로 저장 → PDF</b> 또는 <b>DOCX</b>로 바꿔 올리시거나, 내용을 복사해 붙여넣어 주세요.</p>
            </details>
            <details>
              <summary>파일은 몇 개까지, 어떤 형식으로 올릴 수 있나요</summary>
              <p><b>PDF · DOCX · TXT · MD</b>를 읽습니다. <b>ZIP</b>으로 묶어 올리시면 안의 문서를 하나씩 풀어 읽고, 같은 파일이 두 번 들어가면 한 번만 셉니다.</p>
              <p>한 번에 <b>최대 20개, 총 50MB</b>까지입니다. 파일 하나는 <b>10MB</b>를 넘지 않아야 읽을 수 있습니다. 형식이 안 맞거나 너무 큰 파일은 그것만 빼고 나머지는 그대로 진행합니다 — 어떤 파일이 왜 빠졌는지 화면에 이름이 나옵니다.</p>
              <p>QUICK은 자기소개서 한 편을 보는 상품이라 <b>파일 하나</b>면 충분합니다. 이력서와 자소서가 하나의 입사지원서로 합쳐져 있어도 괜찮습니다.</p>
            </details>
            <details>
              <summary>글자 수 제한은 어떻게 되나요</summary>
              <p>세 군데에 각각 다른 한도가 있습니다. 헷갈리기 쉬운데, 서로 다른 것을 봅니다.</p>
              <p><b>1. 자기소개서 분량</b> — QUICK 8,000자, PRO·FINAL 30,000자입니다. 공백을 뺀 글자 수이고, 이것이 결제하신 이용권이 보장하는 분량입니다.</p>
              <p><b>2. 문항별 목표 글자 수</b> — 첨삭 결과를 몇 자로 쓸지 정하는 값입니다. 기본 700자이고, 공고에 <b>(500자)</b>처럼 적혀 있으면 그 값을 씁니다. 분량과는 별개입니다.</p>
              <p><b>3. 함께 올린 자료</b> — 채용공고·이력서·경력기술서·포트폴리오는 <b>문서 하나당 20,000자</b>, 전부 합쳐 <b>PRO·FINAL 60,000자 / QUICK 20,000자</b>까지 분석에 씁니다. 넘는 분량은 <b>덜 중요한 자료부터</b> 빠집니다 — 공고와 이력서가 먼저 들어가고, 자격증·수료증 같은 증빙이 마지막입니다.</p>
              <p><b>자기소개서는 어떤 경우에도 잘리지 않습니다.</b> 위 3번은 자소서 옆에 딸려 오는 자료에만 적용됩니다.</p>
            </details>
            <details>
              <summary>무료 이용권도 똑같이 되나요</summary>
              <p><b>자기소개서 첨삭은 완전히 같습니다.</b> 문항별 첨삭, 최종 첨삭본, 결과 화면 모두 결제하신 분과 동일합니다.</p>
              <p>다만 함께 올린 <b>참고자료를 읽는 분량은 절반</b>입니다. 공고 한 편과 이력서 정도는 넉넉히 들어가고, 증빙이 아주 많을 때만 뒷부분이 빠집니다.</p>
            </details>
            <details>
              <summary>결제 전에 AI가 도는 건가요</summary>
              <p>아닙니다. <b>결제가 끝난 뒤에</b> 분석이 시작됩니다. 그 전 화면들은 무엇을 몇 자 분석할지 정리해서 보여드리는 단계입니다.</p>
            </details>
            <details>
              <summary>없는 경험을 지어내지는 않나요</summary>
              <p>지어내지 않습니다. 근거가 모자라면 임의로 채우는 대신 <b>확인이 필요한 질문</b>으로 돌려드립니다. 올리신 이력서에 적혀 있는 사실은 지원자가 직접 밝힌 것이므로 문장에 쓰일 수 있습니다.</p>
            </details>
            <details>
              <summary>결과가 마음에 안 들면요</summary>
              <p>먼저 <b>문항별 첨삭</b> 화면에서 직접 고쳐 보세요. 고친 내용은 최종 첨삭본에 바로 반영되고, <b>추가 비용이 없습니다.</b> 문장 몇 개를 바꾸실 거라면 이 편이 훨씬 빠릅니다.</p>
              <p>방향 자체를 바꾸고 싶으시면 결과 화면 아래 <b>추가 요청</b>에서 &ldquo;○○ 경력은 빼고 관련 직무로만 구성해 주세요&rdquo;처럼 적어 다시 받으실 수 있습니다. 다만 이건 <b>새 분석이라 PRO 1회 결제가 필요합니다.</b> 지금 결과는 그대로 남습니다.</p>
            </details>
          </div>
        </section>

        <div className={styles.footCta}>
          <div><b>읽으셨으면 이제 넣어 보세요.</b><span>문항별로 나눠 넣고, 글자 수를 적고, 공고와 이력서를 같이 올리는 것. 이 셋이면 충분합니다.</span></div>
          <Link href="/analyze" className="button button-light">시작하기 <ArrowRight size={18}/></Link>
        </div>
      </div>
    </main>
  );
}
