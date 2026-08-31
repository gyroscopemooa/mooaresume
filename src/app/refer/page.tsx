import type { Metadata } from "next";
import Link from "next/link";
import { HeaderAccount } from "@/components/header-account";
import { ReferralPanel } from "@/components/referral-panel";
import { ReferralCodeEntry } from "@/components/referral-code-entry";
import { CouponCodeEntry } from "@/components/coupon-code-entry";
import { CreditWallet } from "@/components/credit-wallet";
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
  description: "친구가 무아레쥬메로 결제를 마치면 같은 상품의 무료 이용권을 받습니다.",
};

export default function ReferPage() {
  return (
    <main className="home-page">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="MOOA Resume 홈"><span className="brand-mark">M</span><span>MOOA <b>Resume</b></span></Link>
        <nav aria-label="주요 메뉴"><Link href="/guide">이용 방법</Link><HeaderAccount /><Link href="/analyze" className="button button-small">시작하기</Link></nav>
      </header>

      <div className={"container " + styles.page}>
        <div className={styles.head}>
          <span>REFER A FRIEND</span>
          <h1>친구에게 추천하고,<br/>무료 이용권을 받아보세요.</h1>
          <p>친구가 회원님의 코드를 넣고 결제를 마치면, <b>친구가 결제한 것과 같은 상품의 무료 이용권 1장</b>이 계정에 바로 들어옵니다. 쿠폰번호를 주고받을 필요 없이 코드 하나면 됩니다.</p>
        </div>

        <ReferralPanel standalone />

        {/* Where a granted credit becomes visible. Until now it appeared only
            at the moment it was spent. */}
        <CreditWallet />
        {/* 이용권을 보는 자리 바로 아래. 코드를 받은 사람이 "어디에 넣지"를
            찾아 헤매지 않도록, 결과가 보이는 곳과 넣는 곳을 붙여 둡니다.
            추천코드 칸은 이 화면 아래쪽에 따로 있습니다 — 둘은 반대로
            동작하므로 합치지 않습니다. */}
        <CouponCodeEntry />

        {/* The other direction. Someone who was handed a code will come here
            looking for where to put it, and the only field for it used to be
            buried in the checkout flow. Asking them to sign in first is also
            the answer to "whose account does this apply to". */}
        <div className={styles.entry}>
          <ReferralCodeEntry requireSignIn returnTo="/refer" />
        </div>

        <div className={styles.how}>
          <h2>어떻게 진행되나요</h2>
          {/* The text is wrapped in its own element on purpose: the row is a
              two-column grid, and leaving <b> and <span> as separate children
              made three grid items — the second line dropped into the narrow
              number column and folded one character per line. */}
          <ol>
            <li><div><b>코드를 공유합니다.</b><span>위 코드를 복사해 친구에게 보내세요.</span></div></li>
            <li><div><b>친구가 결제 화면에서 코드를 넣습니다.</b><span>자소서를 넣고 결제로 넘어가는 화면에 추천코드 칸이 있습니다.</span></div></li>
            <li><div><b>친구가 결제를 마칩니다.</b><span>여기까지 와야 지급됩니다. 코드 입력만으로는 지급되지 않습니다.</span></div></li>
            <li><div><b>이용권이 들어옵니다.</b><span>다음 분석에서 결제 없이 바로 시작하실 수 있습니다.</span></div></li>
          </ol>
        </div>
      </div>
    </main>
  );
}
