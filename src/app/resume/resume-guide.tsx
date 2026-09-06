import Link from "next/link";
import { ArrowRight, Download, ImagePlus, PenLine, Sparkles } from "lucide-react";
import styles from "./intro.module.css";

/**
 * 이력서 도구 아래에 붙는 소개.
 *
 * 한때 이것을 `/resume`에, 도구를 `/resume/write`에 두어 주소를 나눴습니다.
 * 되돌린 이유는 두 가지입니다. ① 이 주소로 오는 사람 대부분은 이미 이력서를
 * 쓰러 온 것이고, 소개를 먼저 만나면 한 번 더 눌러야 합니다. ② 그렇다고
 * 소개를 없애면 검색에 걸릴 글이 사라집니다 — 도구 화면은 브라우저에서만
 * 그려서(`ssr: false`) 크롤러가 받는 HTML이 비어 있습니다.
 *
 * 그래서 한 주소에 둘 다 둡니다. 도구가 먼저 나오고, 그 아래에 이 글이
 * 서버에서 그려져 HTML에 실립니다. 도구 상단바의 "소개" 단추가 여기로
 * 내려옵니다.
 */
export function ResumeGuide() {
  return <div className={styles.guide} id="resume-guide">
    <section className={styles.section}>
      <span className={styles.kicker}>FREE RESUME BUILDER</span>
      <h2 className={styles.sectionHead}>회원가입도, 요금도, 워터마크도 없습니다</h2>
      <div className={styles.cards}>
        <article className={styles.card}>
          <PenLine />
          <b>적는 대로 종이에 그려집니다</b>
          <p>왼쪽에 채우면 오른쪽 A4 종이가 곧바로 바뀝니다. 비워 둔 칸은 종이에 나오지 않아서, 쓸 것이 적어도 빈 줄이 남지 않습니다.</p>
        </article>
        <article className={styles.card}>
          <Download />
          <b>인쇄하거나 PDF로 저장</b>
          <p>인쇄 단추를 누르고 &quot;PDF로 저장&quot;을 고르면 끝입니다. 화면의 편집 도구는 인쇄물에 따라오지 않고 종이만 나옵니다.</p>
        </article>
        <article className={styles.card}>
          <ImagePlus />
          <b>증명사진은 켜고 끕니다</b>
          <p>붙이는 곳이 여전히 많지만 블라인드 채용은 받지 않습니다. 끄면 자리까지 사라지고, 다시 켜면 넣어 둔 사진이 돌아옵니다.</p>
        </article>
        <article className={styles.card}>
          <Sparkles />
          <b>자기소개서까지 이어집니다</b>
          <p>다 적은 이력서를 자소서 첨삭에 그대로 넘길 수 있습니다. 첨삭은 이력서와 자소서가 어긋나는 곳을 짚어 줍니다 — 면접관이 가장 먼저 묻는 자리입니다.</p>
        </article>
      </div>
    </section>

    <section className={styles.section}>
      <h2 className={styles.sectionHead}>자주 묻는 것</h2>
      <div className={styles.faq}>
        <div className={styles.faqItem}><b>회원가입을 해야 하나요?</b><p>아니요. 로그인 없이 바로 쓸 수 있고 요금도 없습니다.</p></div>
        <div className={styles.faqItem}><b>적은 내용은 어디에 저장되나요?</b><p>쓰고 있는 브라우저에만 저장됩니다. 서버로 보내지 않습니다. 같은 브라우저로 다시 들어오면 이어서 쓸 수 있고, 다른 기기에서는 보이지 않습니다.</p></div>
        <div className={styles.faqItem}><b>PDF로 저장할 수 있나요?</b><p>인쇄 단추를 누르고 인쇄 대상에서 &quot;PDF로 저장&quot;을 고르면 됩니다. 브라우저에 이미 있는 기능이라 따로 설치할 것이 없습니다.</p></div>
        <div className={styles.faqItem}><b>증명사진은 꼭 넣어야 하나요?</b><p>켜고 끌 수 있습니다. 블라인드 채용에 내는 이력서라면 꺼 두세요. 사진도 이 브라우저에만 저장됩니다.</p></div>
      </div>
    </section>

    <section className={styles.closing}>
      <b>이력서를 다 썼다면, 다음은 자기소개서입니다</b>
      <p>같은 내용을 다시 올릴 필요가 없습니다. 위에서 만든 이력서를 그대로 넘겨 첨삭을 받으면, 이력서와 자소서가 서로 맞는지까지 함께 봅니다.</p>
      <Link href="/analyze">자기소개서 첨삭 보기 <ArrowRight /></Link>
    </section>

    <section className={styles.seoLead}>
      <p><b>이력서 양식을 찾는 이유는 대개 하나입니다.</b> 무엇을 어느 칸에 적어야 하는지 모르겠어서입니다. 빈 한글 파일을 열어 두고 이름과 생년월일까지 쓰고 나면, 경력을 어디까지 적어야 하는지, 아르바이트도 경력인지, 자격증은 어느 줄에 넣는지에서 멈춥니다. 그래서 이 도구는 칸을 미리 나눠 두고 각 칸에 무엇을 적는지 옆에 적어 두었습니다.</p>
      <p>이력서 서식, 이력서 폼, 입사지원서 양식, 경력 이력서 양식이라는 이름으로 찾아오셨다면 대체로 같은 것을 찾고 계신 것입니다. 한글이나 워드 파일을 내려받아 채우는 방식과 달리, 여기서는 <b>적는 즉시 완성된 모습을 보면서</b> 고칠 수 있고 다 되면 그대로 인쇄하거나 PDF로 저장합니다.</p>
      <p>다만 이력서는 <b>사실을 적는 서류</b>입니다. 문장을 꾸며 주는 도구가 아니고, 없는 경력을 채워 주지도 않습니다. 대신 적어 둔 사실이 자기소개서와 어긋나지 않는지는 <Link href="/analyze">자기소개서 첨삭</Link>에서 함께 확인할 수 있습니다. 면접에서 가장 먼저 걸리는 곳이 그 어긋남입니다.</p>
    </section>
  </div>;
}
