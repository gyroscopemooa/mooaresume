import { listCampaigns, listCouponCodes } from "@/server/admin/admin-repository";
import styles from "../admin.module.css";
import { CampaignCreator } from "./campaign-creator";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const [campaigns, shared] = await Promise.all([listCampaigns(), listCouponCodes()]);
  // 캠페인이 생기기 전에 만든 코드들. 만드는 화면은 하나로 합쳤지만, 이미 배포한
  // 코드는 현황을 볼 수 있어야 하므로 목록만 남깁니다.
  const legacy = shared.filter((coupon) => !coupon.campaignId);
  return (
    <>
      <header className={styles.pageHead}>
        <h1>프로모션 · 이용권 캠페인</h1>
        <p>
          협업 기관명만 넣으면 나머지는 채워집니다. <b>고유 코드</b>는 기관에 목록을 넘기고 누가 썼는지 보는 방식이고,
          <b>공유 코드</b>는 팜플렛에 한 장을 찍어 배포하는 방식입니다. 개별 지급(문의 응대·사과 보상)은 <b>무료 이용권</b> 화면에서 링크로 보내시면 됩니다.
        </p>
      </header>
      <CampaignCreator campaigns={campaigns}/>

      {legacy.length > 0 && (
        <details className={styles.pageHead}>
          <summary>캠페인 이전에 만든 공유 코드 {legacy.length}개</summary>
          <ul>
            {legacy.map((coupon) => (
              <li key={coupon.id}>
                <b>{coupon.code}</b> — {coupon.partnerName} · {coupon.label} · {coupon.product} · {coupon.claimedCount}/{coupon.totalCount}장
                {coupon.expiresAt ? ` · ${coupon.expiresAt.slice(0, 10)}까지` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
