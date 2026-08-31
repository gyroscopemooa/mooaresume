import type { Metadata } from "next";
import Link from "next/link";
import { REDACTION_LIMITS } from "@/domain/deidentify";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "무아레쥬메가 수집하는 개인정보의 항목과 목적, 보관 기간, 처리를 맡기는 회사, 이용자가 행사할 수 있는 권리를 정리했습니다.",
  robots: { index: true, follow: true },
};

const EFFECTIVE_DATE = "2026년 8월 31일";

/**
 * 국내 서비스는 개인정보처리방침 게시가 의무입니다.
 *
 * 자기소개서와 이력서는 이 서비스가 다루는 자료 중 가장 민감한 축에 속하고,
 * 결제와 로그인까지 있는 상태에서 이 문서가 없다는 것은 법적 문제이기 이전에
 * 이용자가 무엇을 맡기는지 알 방법이 없다는 뜻입니다.
 *
 * 여기 적힌 것은 전부 코드에서 확인한 내용입니다. 쓰지 않는 항목을 적어 두면
 * 방침이 실제보다 넓어지고, 쓰는 것을 빠뜨리면 근거 없이 처리하는 셈이 됩니다.
 */
export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.head}>
          <span className={styles.eyebrow}>MOOA RESUME</span>
          <h1>개인정보처리방침</h1>
          <p>
            무아레쥬메는 자기소개서와 이력서를 다룹니다. 어디에 쓰이고 어디에 저장되며 언제 지워지는지를
            읽고 확인하실 수 있도록 정리했습니다.
          </p>
          <small>시행일 {EFFECTIVE_DATE}</small>
        </header>

        <section className={styles.section}>
          <h2>1. 수집하는 항목</h2>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>계정</th>
                <td>이메일 주소. Google 계정으로 로그인하시면 Google이 제공하는 이메일 주소와 계정 식별자를 받습니다. <b>비밀번호는 저장하지 않습니다</b> — 이메일 링크 또는 Google 로그인만 사용합니다.</td>
              </tr>
              <tr>
                <th>지원 자료</th>
                <td>회원님이 직접 넣으신 자기소개서, 채용공고, 이력서, 경력기술서, 포트폴리오와 그 밖의 첨부 문서. 파일에서 추출한 텍스트를 저장합니다.</td>
              </tr>
              <tr>
                <th>분석 기록</th>
                <td>분석 요청과 결과, 회원님이 결과 화면에서 직접 고친 내용, 지원 결과(합격·불합격) 보고.</td>
              </tr>
              <tr>
                <th>결제</th>
                <td>주문 번호, 상품, 금액, 결제 상태. <b>카드번호와 계좌번호는 저희 서버를 지나가지 않습니다</b> — 결제는 Polar에서 이루어지고 저희는 그 결과만 받습니다.</td>
              </tr>
              <tr>
                <th>추천·이용권</th>
                <td>추천 코드, 추천 성사 기록, 보유 중인 무료 이용권.</td>
              </tr>
              <tr>
                <th>자동 수집</th>
                <td>접속 기록, 브라우저 종류, 대략적인 지역, 화면에서의 이동 경로. 쿠키와 유사 기술로 수집됩니다.</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2>2. 이용 목적</h2>
          <ul>
            <li>자기소개서 첨삭과 분석 결과 제공, 결과 화면과 이메일 전달</li>
            <li>로그인, 이용권·결제·환불 처리, 추천 보상 지급</li>
            <li>오류 확인과 서비스 개선, 부정 이용 방지</li>
            <li>회원님이 <b>별도로 동의하신 경우에 한해</b>, 개인정보를 지운 사본을 분석 품질 개선에 활용 (아래 6번)</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>3. 보관 기간</h2>
          <ul>
            <li>계정과 지원 자료, 분석 기록은 <b>회원 탈퇴 시 지체 없이 파기</b>합니다.</li>
            <li>지원 자료는 <a href="mailto:support@mooaresume.com">support@mooaresume.com</a>으로 요청하시면 탈퇴 없이 개별 삭제해 드립니다.</li>
            <li>결제·환불 기록은 전자상거래 등에서의 소비자보호에 관한 법률에 따라 <b>5년</b>간 보관합니다. 이 기간에는 삭제 요청이 있어도 법령상 보관해야 합니다.</li>
            <li>접속 기록은 통신비밀보호법에 따라 <b>3개월</b>간 보관합니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>4. 처리를 맡기는 회사</h2>
          <p className={styles.lead}>
            서비스를 운영하려면 아래 회사들의 설비를 씁니다. 각 회사는 아래 목적 밖으로 정보를 쓸 수 없습니다.
          </p>
          <table className={styles.table}>
            <tbody>
              <tr><th>Supabase</th><td>계정·지원 자료·분석 기록 저장, 로그인 처리</td></tr>
              <tr><th>OpenAI</th><td>자기소개서 첨삭 분석. 전달한 내용은 <b>OpenAI의 모델 학습에 사용되지 않습니다.</b></td></tr>
              <tr><th>Polar</th><td>결제와 환불 처리</td></tr>
              <tr><th>Cloudflare</th><td>웹사이트 제공과 트래픽 처리</td></tr>
              <tr><th>Resend</th><td>분석 완료 안내 등 이메일 발송</td></tr>
              <tr><th>Google</th><td>Google 로그인, 광고 성과 측정</td></tr>
              <tr><th>Microsoft</th><td>Clarity — 화면 이용 흐름 분석</td></tr>
            </tbody>
          </table>
          <p className={styles.note}>
            <b>국외 이전 안내.</b> 위 회사들의 서버는 대한민국 밖(주로 미국)에 있습니다. 이전되는 항목과 목적은 위 표와 같고,
            보관 기간은 3번과 같습니다. 이전을 원하지 않으시면 서비스 이용이 어렵습니다 — 저장과 분석 자체가 이 설비 위에서 이루어지기 때문입니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. 제3자 제공</h2>
          <p>회원님의 개인정보를 다른 곳에 팔거나 넘기지 않습니다. 법령에 따른 요구가 있는 경우에만, 그 범위에서 제공합니다.</p>
        </section>

        <section className={styles.section} id="research">
          <h2>6. 서비스 개선을 위한 데이터 활용 (선택)</h2>
          <p className={styles.lead}>
            <b>선택 항목입니다. 동의하지 않으셔도 결과와 기능은 완전히 같습니다.</b> 동의하시면 지원서와 첨삭 전후의 변화를
            개인정보를 지운 사본으로 보관하고, 어떤 표현이 강점이 되고 어떤 요소가 감점 위험이 되는지 판단 기준을 다듬는 데 씁니다.
          </p>
          <ul>
            <li>보관 전에 <b>이름·연락처·이메일·주민등록번호·주소</b>를 지웁니다.</li>
            <li>회사명·기간·직무·성과 수치는 남깁니다. 이것까지 지우면 분석할 자료가 남지 않습니다.</li>
            <li><b>철회하시면 이미 보관 중인 사본도 그 자리에서 지우고</b>, 이후 수집도 중단합니다. 결과 화면 아래쪽 체크 항목에서 언제든 바꾸실 수 있습니다.</li>
            <li>동의는 문구별로 관리됩니다. 안내 문구가 바뀌면 이전 동의는 이어지지 않고 다시 여쭙습니다.</li>
          </ul>
          <h3>지워지지 않는 것도 있습니다</h3>
          <ul className={styles.limits}>
            {REDACTION_LIMITS.map((limit) => <li key={limit}>{limit}</li>)}
          </ul>
        </section>

        <section className={styles.section}>
          <h2>7. 쿠키</h2>
          <p>
            로그인 상태를 유지하는 데 쿠키를 씁니다. 이 쿠키를 막으면 로그인이 되지 않습니다.
            그 밖에 광고 성과 측정과 이용 흐름 분석에도 쿠키가 쓰이며, 이쪽은 브라우저 설정에서 거부하셔도 서비스 이용에 지장이 없습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>8. 회원님의 권리</h2>
          <ul>
            <li>본인 정보의 열람·정정·삭제·처리정지를 요구하실 수 있습니다.</li>
            <li>선택 동의(6번)는 언제든 철회하실 수 있고, 철회가 동의만큼 쉽도록 결과 화면의 같은 자리에 두었습니다.</li>
            <li>요청은 <a href="mailto:support@mooaresume.com">support@mooaresume.com</a>으로 보내 주시면 <b>10일 이내</b>에 처리하고 결과를 알려 드립니다.</li>
            <li>만 14세 미만 아동의 개인정보는 수집하지 않습니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>9. 안전성 확보 조치</h2>
          <ul>
            <li>전송 구간은 모두 HTTPS로 암호화합니다.</li>
            <li>지원 자료는 본인 계정으로만 열람할 수 있도록 데이터베이스 차원에서 접근을 제한합니다.</li>
            <li>결제 수단 정보는 애초에 저희가 받지 않습니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>10. 개인정보 보호책임자</h2>
          <p>
            개인정보와 관련한 문의, 불만, 피해 구제는 아래로 연락 주시면 됩니다.<br/>
            <b>연락처</b> <a href="mailto:support@mooaresume.com">support@mooaresume.com</a>
          </p>
          <p className={styles.note}>
            그 밖에 개인정보 침해에 대한 신고나 상담이 필요하시면 개인정보침해신고센터(privacy.kisa.or.kr, 국번 없이 118),
            개인정보 분쟁조정위원회(kopico.go.kr, 1833-6972)에 문의하실 수 있습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>11. 방침 변경</h2>
          <p>
            내용이 바뀌면 시행일과 함께 이 화면에 올립니다. 회원님께 불리하게 바뀌는 경우에는 시행 7일 전부터 알려 드립니다.
          </p>
        </section>

        <footer className={styles.foot}>
          <Link href="/">홈으로</Link>
          <Link href="/guide">이용방법 · 자주 묻는 질문</Link>
        </footer>
      </div>
    </main>
  );
}
