"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Ticket } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { rewardCreditProductSchema, type RewardCreditProduct } from "@/domain/reward-credit";
import styles from "./credit-wallet.module.css";

const PRODUCTS = rewardCreditProductSchema.options;

/**
 * What this account is holding, by product.
 *
 * A credit was only ever visible at the moment it was spent: the checkout
 * screen looks one up for the product being bought and says nothing otherwise.
 * So someone who was told "지급되었습니다" had nowhere to see it, and no way to
 * know a QUICK credit does not pay for a PRO run.
 *
 * Counted per product for exactly that reason. A single "이용권 2장" would be
 * worse than no number, because the two are not interchangeable.
 */
export function CreditWallet() {
  const [counts, setCounts] = useState<Record<RewardCreditProduct, number> | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const { data: auth } = await supabase.auth.getUser();
        if (cancelled || !auth.user) return;
        // RLS limits this to the signed-in account's own rows.
        const { data, error } = await supabase.from("reward_credits").select("product").eq("status", "AVAILABLE");
        if (cancelled) return;
        // 못 물어본 것과 없는 것을 구분합니다.
        //
        // Returning quietly made a wallet we could not read look exactly like a
        // wallet with nothing in it. That is how a day passed with every one of
        // these calls failing and nobody noticing.
        if (error) { console.error("reward_credits", error); setFailed([error.code, error.message].filter(Boolean).join(" · ")); return; }
        if (!data) return;
        const tally = { QUICK: 0, PRO: 0, FINAL: 0 } as Record<RewardCreditProduct, number>;
        for (const row of data) {
          const product = row.product as RewardCreditProduct;
          if (product in tally) tally[product] += 1;
        }
        setCounts(tally);
      } catch (error) {
        console.error("reward_credits", error);
        if (!cancelled) setFailed(error instanceof Error ? error.message : "알 수 없는 오류");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (failed) return <section className={styles.wallet}>
    <p className={styles.failed}><b>무료 이용권을 확인하지 못했습니다.</b> 이용권이 없는 것이 아니라 조회에 실패한 것입니다. 새로고침해 보시고, 계속 안 되면 알려 주세요. <em>{failed}</em></p>
  </section>;
  if (!counts) return null;
  const total = PRODUCTS.reduce((sum, product) => sum + counts[product], 0);

  return (
    <section className={styles.wallet}>
      <div className={styles.head}>
        <Ticket/>
        <div>
          <h3>내 무료 이용권</h3>
          <p>{total > 0 ? "결제 화면까지 가시면 자동으로 적용됩니다. 쿠폰번호를 입력하실 필요는 없습니다." : "아직 보유한 이용권이 없습니다."}</p>
        </div>
      </div>

      <div className={styles.counts}>
        {PRODUCTS.map((product) => (
          <article key={product} data-has={counts[product] > 0}>
            <b>{product}</b>
            <strong>{counts[product]}</strong>
            <span>장</span>
          </article>
        ))}
      </div>

      {total > 0 ? (
        <>
          {/* The one thing people get wrong: a QUICK credit does not pay for a
              PRO run. Said here rather than discovered at checkout. */}
          <p className={styles.how}>
            <b>쓰는 법.</b> 자소서를 넣고 결제 화면까지 가시면, <b>그 상품의 이용권이 있을 때</b> 결제 대신 <b>무료 이용권으로 분석 시작</b> 버튼이 나옵니다.
            이용권은 <b>상품별로 따로</b>입니다 — QUICK 이용권으로 PRO 분석을 시작할 수는 없습니다.
          </p>
          <Link href="/analyze" className={styles.cta}>이용권 쓰러 가기 <ArrowRight size={16}/></Link>
        </>
      ) : (
        <p className={styles.how}>친구가 회원님의 추천코드를 넣고 결제하면, <b>친구가 결제한 것과 같은 상품</b>의 이용권이 여기에 들어옵니다.</p>
      )}
    </section>
  );
}
