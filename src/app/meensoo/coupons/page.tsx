import { listCampaigns, listCouponCodes } from "@/server/admin/admin-repository";
import styles from "../admin.module.css";
import { CampaignCreator } from "./campaign-creator";
import { CouponCreator } from "./coupon-creator";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const [campaigns, shared] = await Promise.all([listCampaigns(), listCouponCodes()]);
  const legacy = shared.filter((coupon) => !coupon.campaignId);
  return (
    <>
      <header className={styles.pageHead}>
        <h1>프로모션 · 이용권 캠페인</h1>
        <p>
          협업 기관에 넘길 고유 코드를 캠페인 단위로 만듭니다. 코드마다 한 사람이라 누가 어느 코드를 썼는지 남고,
          한 장이 새어 나가도 그 한 장만 막을 수 있습니다. 개별 지급(문의 응대·사과 보상)은 <b>무료 이용권</b> 화면에서 링크로 보내시는 편이 맞습니다.
        </p>
      </header>
      <CampaignCreator campaigns={campaigns}/>

      {legacy.length > 0 && (
        <details className={styles.pageHead}>
          <summary>공유 코드 (캠페인 이전 방식)</summary>
          <p>코드 하나를 여러 사람이 나눠 쓰는 방식입니다. 이미 배포한 코드가 있어 남겨 둡니다.</p>
          <CouponCreator existing={legacy}/>
        </details>
      )}
    </>
  );
}
