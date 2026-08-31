import { listCouponCodes } from "@/server/admin/admin-repository";
import styles from "../admin.module.css";
import { CouponCreator } from "./coupon-creator";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await listCouponCodes();
  return (
    <>
      <header className={styles.pageHead}>
        <h1>협업 쿠폰</h1>
        <p>
          협업 기관에 배포할 코드 하나를 만듭니다. 받는 사람을 미리 몰라도 되고, 정해진 수량만큼만 등록됩니다.
          개별 지급(문의 응대·사과 보상)은 <b>무료 이용권</b> 화면에서 링크로 보내시는 편이 맞습니다.
        </p>
      </header>
      <CouponCreator existing={coupons}/>
    </>
  );
}
