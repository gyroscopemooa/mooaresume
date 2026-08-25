import type { Metadata } from "next";
import Link from "next/link";
import { ReferralPanel } from "@/components/referral-panel";
import styles from "./refer.module.css";

/**
 * A page for the referral code, because the result screen is not a place you
 * can go back to.
 *
 * The panel first appeared only at the bottom of a finished analysis, which is
 * the right moment to see it and the wrong place to find it again — there is
 * no "my account" anywhere in this product yet. A plain address someone can
 * type, bookmark, or be sent solves both.
 */
export const metadata: Metadata = {
  title: "친구 추천",
  description: "친구가 무아레쥬메로 첫 결제를 마치면 무료 이용권을 받습니다.",
};

export default function ReferPage() {
  return (
    <main className="home-page">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="MOOA Resume 홈"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></Link>
        <nav aria-label="주요 메뉴"><Link href="/guide">이용 방법</Link><Link href="/analyze" className="button button-small">시작하기</Link></nav>
      </header>

      <div className={"container " + styles.page}>
        <div className={styles.head}>
          <span>REFER A FRIEND</span>
          <h1>먼저 써 본 사람의 말이<br/>가장 잘 전해집니다.</h1>
          <p>친구가 회원님의 코드를 넣고 첫 결제를 마치면, <b>QUICK 무료 이용권 1장</b>이 계정에 바로 들어옵니다. 쿠폰번호를 주고받을 필요 없이 코드 하나면 됩니다.</p>
        </div>

        <ReferralPanel standalone />

        <div className={styles.how}>
          <h2>어떻게 진행되나요</h2>
          {/* The text is wrapped in its own element on purpose: the row is a
              two-column grid, and leaving <b> and <span> as separate children
              made three grid items — the second line dropped into the narrow
              number column and folded one character per line. */}
          <ol>
            <li><div><b>코드를 공유합니다.</b><span>위 코드를 복사해 친구에게 보내세요.</span></div></li>
            <li><div><b>친구가 결제 화면에서 코드를 넣습니다.</b><span>자소서를 넣고 결제로 넘어가는 화면에 추천코드 칸이 있습니다.</span></div></li>
            <li><div><b>친구가 첫 결제를 마칩니다.</b><span>여기까지 와야 지급됩니다. 코드 입력만으로는 지급되지 않습니다.</span></div></li>
            <li><div><b>이용권이 들어옵니다.</b><span>다음 분석에서 결제 없이 바로 시작하실 수 있습니다.</span></div></li>
          </ol>
        </div>
      </div>
    </main>
  );
}
