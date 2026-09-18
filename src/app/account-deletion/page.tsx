import type { Metadata } from "next";
import Link from "next/link";
import styles from "../privacy/page.module.css";

export const metadata: Metadata = {
  title: "계정 및 데이터 삭제 요청",
  description: "무아레쥬메(MOOA Resume) 계정과 관련 데이터의 삭제를 요청하는 방법, 삭제되는 데이터와 보관되는 데이터를 안내합니다.",
  robots: { index: true, follow: true },
  alternates: { canonical: "/account-deletion" },
};

const DELETE_MAIL = `mailto:support@mooaresume.com?subject=${encodeURIComponent("[계정 삭제 요청] 무아레쥬메")}`;

export default function AccountDeletionPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.head}>
          <span className={styles.eyebrow}>MOOA RESUME</span>
          <h1>계정 및 데이터 삭제 요청</h1>
          <p>
            무아레쥬메(MOOA Resume) 계정과 그 계정에 쌓인 데이터를 지우고 싶으시면 아래 순서로 요청해 주세요.
            앱과 웹사이트 모두 같은 계정을 쓰기 때문에 한 번 요청하시면 됩니다.
          </p>
        </header>

        <section className={styles.section}>
          <h2>삭제 요청 방법</h2>
          <ul>
            <li>
              <b>1.</b> 무아레쥬메에 로그인할 때 쓰신 이메일 주소(Google 로그인이면 그 Google 계정의 이메일)로{" "}
              <a href={DELETE_MAIL}>support@mooaresume.com</a>에 메일을 보내 주세요. 제목은 <b>[계정 삭제 요청]</b>으로 적어 주세요.
            </li>
            <li>
              <b>2.</b> 본인 확인을 위해 <b>가입한 이메일 주소에서 보낸 메일</b>만 처리합니다. 다른 주소에서 보내시면 가입 이메일로 확인 메일을 드립니다.
            </li>
            <li>
              <b>3.</b> 요청을 받은 날부터 <b>10일 이내</b>에 삭제하고 결과를 메일로 알려 드립니다.
            </li>
            <li>계정 전체가 아니라 <b>올려 두신 지원 자료만</b> 지우고 싶으시면, 같은 주소로 그렇게 적어 주세요. 탈퇴 없이 개별 삭제해 드립니다.</li>
          </ul>
          <p className={styles.note}>
            <a href={DELETE_MAIL}>삭제 요청 메일 쓰기</a>를 누르면 제목이 채워진 메일 창이 열립니다.
          </p>
        </section>

        <section className={styles.section}>
          <h2>삭제되는 데이터</h2>
          <ul>
            <li>계정 정보(이메일 주소, 로그인 식별자)</li>
            <li>올려 주신 지원 자료(자기소개서, 채용공고, 이력서, 경력기술서, 포트폴리오와 그 밖의 첨부 문서에서 추출한 텍스트)</li>
            <li>분석 요청과 결과, 결과 화면에서 직접 고치신 내용</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>삭제되지 않고 보관되는 데이터</h2>
          <ul>
            <li>결제·환불 기록(주문 번호, 상품, 금액, 결제 상태)은 전자상거래 등에서의 소비자보호에 관한 법률에 따라 <b>5년</b>간 보관합니다.</li>
            <li>접속 기록은 통신비밀보호법에 따라 <b>3개월</b>간 보관한 뒤 지웁니다.</li>
          </ul>
          <p>
            Google Play 결제 내역은 Google이 별도로 보관하며 무아레쥬메가 지울 수 없습니다. 자세한 내용은 Google 계정 설정에서 확인하실 수 있습니다.
          </p>
        </section>

        <footer className={styles.foot}>
          <Link href="/privacy">개인정보처리방침</Link>
          <Link href="/">홈으로</Link>
        </footer>
      </div>
    </main>
  );
}
