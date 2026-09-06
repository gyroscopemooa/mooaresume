import type { Metadata } from "next";
import Link from "next/link";
import { REDACTION_LIMITS } from "@/domain/deidentify";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "무아레쥬메가 수집하는 개인정보의 항목과 목적, 보관 기간, 처리를 맡기는 회사, 이용자가 행사할 수 있는 권리를 정리했습니다.",
  robots: { index: true, follow: true },
  // 사이트맵에 실려 있는 주소 중 대표 URL이 비어 있던 유일한 곳입니다.
  // 개인정보처리방침은 여기저기서 링크되는 페이지라 추적 파라미터가 붙기
  // 쉽고, 그때마다 크롤러가 다른 문서로 셀 수 있습니다.
  alternates: { canonical: "/privacy" },
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
 *
 * 한때 이 문서에는 "처리를 맡기는 회사" 표 하나에 일곱 회사가 몰려 있었습니다.
 * 줄 세워 놓으니 개인정보 고지가 아니라 **기술 스택 목록**으로 읽혔습니다 —
 * 어떤 저장소에 무엇이 들어가고, 인증을 무엇으로 하고, 메일을 무엇으로 보내는지가
 * 한눈에 그려졌습니다.
 *
 * 그래서 **숨기는 대신 법이 나눠 둔 대로 나눴습니다.**
 *
 *   4. 처리업무의 위탁      — 맡긴 *업무*만. 회사 이름은 여기 없습니다.
 *   5. 국외 이전            — 수탁자가 전부 국외라, 법정 기재사항과 함께 여기에.
 *   8. 자동 수집·행태정보   — Google 광고 측정, Microsoft Clarity.
 *
 * 공개량은 오히려 늘었습니다(국외 이전은 항목·목적·보유기간까지 요구합니다).
 * 대신 한 표에 몰려 있지 않아 설계도로 읽히지 않습니다.
 *
 * **작게 만들거나 아래로 내리지는 않습니다.** 법은 이 내용을 "정보주체가 언제든지
 * 쉽게 확인할 수 있도록" 공개하라고 합니다. 읽기 어렵게 만드는 것은 공개하지 않은
 * 것에 가깝고, 그건 항목별로 나누는 것과 다른 이야기입니다.
 *
 * 광고 측정과 화면 흐름 분석을 위탁에서 뺀 것은 숨기려는 것이 아니라 분류를 고친
 * 것입니다. 그건 우리가 맡긴 처리업무가 아니라 자동 수집 장치입니다.
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
            <li>회원님이 <b>별도로 동의하신 경우에 한해</b>, 개인정보를 지운 사본을 분석 품질 개선에 활용 (아래 7번)</li>
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
          <h2>4. 개인정보 처리업무의 위탁</h2>
          <p className={styles.lead}>
            원활한 서비스 제공을 위해 아래 업무를 외부 전문업체에 위탁하고 있습니다. 위탁 계약을 통해 개인정보의
            기술적·관리적 보호조치, 재위탁 제한, 위탁업무 목적 외 처리 금지 등을 정하고 관리·감독합니다.
          </p>
          <ul>
            <li>서비스 운영을 위한 데이터 보관</li>
            <li>AI 기반 콘텐츠 분석</li>
            <li>결제 및 환불 처리</li>
            <li>서비스 관련 이메일 발송</li>
            <li>서비스 제공 및 보안</li>
          </ul>
          <p className={styles.note}>
            수탁자가 모두 국외 사업자이므로, 수탁자의 명칭을 포함한 구체적인 사항은 아래 <b>5. 개인정보의 국외 이전</b>에
            법정 기재사항과 함께 적었습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>5. 개인정보의 국외 이전</h2>
          <p className={styles.lead}>
            계약의 이행과 이용자 편의 증진을 위해 아래와 같이 개인정보의 처리위탁·보관을 국외에서 수행하고 있습니다.
          </p>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>Supabase</th>
                <td>
                  <b>국가</b> 미국<br/>
                  <b>이전 항목</b> 계정 식별정보, 이용자가 입력한 문서, 이용 기록<br/>
                  <b>이용 목적</b> 서비스 운영을 위한 데이터 보관<br/>
                  <b>보유·이용 기간</b> 회원 탈퇴 시까지(3번의 법령상 보관 항목 제외)
                </td>
              </tr>
              <tr>
                <th>OpenAI</th>
                <td>
                  <b>국가</b> 미국<br/>
                  <b>이전 항목</b> 이용자가 입력한 문서<br/>
                  <b>이용 목적</b> AI 기반 콘텐츠 분석<br/>
                  <b>보유·이용 기간</b> 요청 처리 후 삭제(공급자 정책에 따라 최대 30일)
                </td>
              </tr>
              <tr>
                <th>Polar</th>
                <td>
                  <b>국가</b> 미국<br/>
                  <b>이전 항목</b> 주문 번호, 상품, 금액, 결제 상태<br/>
                  <b>이용 목적</b> 결제 및 환불 처리<br/>
                  <b>보유·이용 기간</b> 관계 법령에 따른 보관 기간(3번 참조)
                </td>
              </tr>
              <tr>
                <th>Resend</th>
                <td>
                  <b>국가</b> 미국<br/>
                  <b>이전 항목</b> 이메일 주소<br/>
                  <b>이용 목적</b> 서비스 관련 이메일 발송<br/>
                  <b>보유·이용 기간</b> 발송 목적 달성 시까지
                </td>
              </tr>
              <tr>
                <th>Cloudflare</th>
                <td>
                  <b>국가</b> 미국<br/>
                  <b>이전 항목</b> 접속 기록(IP 주소 등)<br/>
                  <b>이용 목적</b> 서비스 제공 및 보안<br/>
                  <b>보유·이용 기간</b> 3개월
                </td>
              </tr>
            </tbody>
          </table>
          <p className={styles.note}>
            <b>이전 시기 및 방법.</b> 서비스 이용 과정에서 정보통신망을 통해 수시로 전송합니다.
          </p>
          <p className={styles.note}>
            <b>거부 방법 및 효과.</b> 국외 이전을 거부하실 수 있습니다. 다만 자료의 저장과 분석 자체가 위 설비 위에서
            이루어지므로, 거부하시면 서비스 이용이 제한됩니다. 각 이전받는 자의 연락처는 11번의 개인정보 보호책임자에게
            문의하시면 안내해 드립니다.
          </p>
          <p className={styles.note}>
            <b>AI 분석 안내.</b> 분석을 위해 전달된 내용은 AI 공급자의 모델 학습에 사용되지 않습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>6. 제3자 제공</h2>
          <p>회원님의 개인정보를 다른 곳에 팔거나 넘기지 않습니다. 법령에 따른 요구가 있는 경우에만, 그 범위에서 제공합니다.</p>
        </section>

        <section className={styles.section} id="research">
          <h2>7. 서비스 개선을 위한 데이터 활용 (선택)</h2>
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
          <h2>8. 자동 수집 장치 및 행태정보</h2>
          <p>
            로그인 상태를 유지하는 데 쿠키를 씁니다. 이 쿠키를 막으면 로그인이 되지 않습니다.
          </p>
          <p>
            그 밖에 아래와 같이 쿠키·유사 기술로 행태정보를 수집합니다. 이쪽은 거부하셔도 서비스 이용에 지장이 없습니다.
          </p>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>Google</th>
                <td>
                  <b>수집 항목</b> 광고 식별자, 방문·전환 기록<br/>
                  <b>목적</b> 광고 성과 측정<br/>
                  <b>거부 방법</b> 브라우저 쿠키 설정, 또는 Google 광고 설정에서 맞춤 광고 해제
                </td>
              </tr>
              <tr>
                <th>Microsoft Clarity</th>
                <td>
                  <b>수집 항목</b> 화면에서의 이동 경로, 클릭·스크롤 기록, 브라우저 종류<br/>
                  <b>목적</b> 이용 흐름 분석과 오류 확인<br/>
                  <b>거부 방법</b> 브라우저 쿠키 설정
                </td>
              </tr>
            </tbody>
          </table>
          <p className={styles.note}>
            행태정보는 광고와 분석 목적으로만 쓰며, 회원님이 입력하신 자기소개서·이력서 등 지원 자료는
            이 도구들에 전달되지 않습니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>9. 회원님의 권리</h2>
          <ul>
            <li>본인 정보의 열람·정정·삭제·처리정지를 요구하실 수 있습니다.</li>
            <li>선택 동의(7번)는 언제든 철회하실 수 있고, 철회가 동의만큼 쉽도록 결과 화면의 같은 자리에 두었습니다.</li>
            <li>요청은 <a href="mailto:support@mooaresume.com">support@mooaresume.com</a>으로 보내 주시면 <b>10일 이내</b>에 처리하고 결과를 알려 드립니다.</li>
            <li>만 14세 미만 아동의 개인정보는 수집하지 않습니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>10. 안전성 확보 조치</h2>
          <ul>
            <li>전송 구간은 모두 HTTPS로 암호화합니다.</li>
            <li>지원 자료는 본인 계정으로만 열람할 수 있도록 데이터베이스 차원에서 접근을 제한합니다.</li>
            <li>결제 수단 정보는 애초에 저희가 받지 않습니다.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>11. 개인정보 보호책임자</h2>
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
          <h2>12. 방침 변경</h2>
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
