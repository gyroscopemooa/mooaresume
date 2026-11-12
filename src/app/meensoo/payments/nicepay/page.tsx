import { isAdmin } from "@/server/admin/admin-session";
import { nicepayReviewConfigured } from "@/server/billing/nicepay-review";
import { createCheckoutQuote } from "@/domain/usage-entitlement";

export default async function NicepayReviewPage() {
  if (!(await isAdmin())) return null;
  const ready = nicepayReviewConfigured();
  return <section style={{maxWidth:680,padding:24,lineHeight:1.8}}>
    <h1>NICE 결제창 연결 검수</h1>
    <p>무아레쥬메 전용 가맹점의 카드·카카오페이 창을 확인합니다. 실제 결제 승인과 이용권 지급은 차단돼 있습니다.</p>
    <p>{ready ? "전용 서버 설정 준비됨" : "전용 서버 설정 대기"} · 토스페이 활성화 미확인</p>
    {(["QUICK", "PRO", "FINAL"] as const).map(product => <article key={product} style={{border:"1px solid #dce5df",borderRadius:10,padding:16,marginTop:16}}>
      <h2>{product} · {createCheckoutQuote(product,1).totalPriceKrw.toLocaleString("ko-KR")}원</h2>
      <p>현재 상품 기본가 표시용입니다. 고객 주문을 생성하지 않습니다.</p>
      <form action="/api/meensoo/nicepay-review/window" method="post" style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        <input type="hidden" name="product" value={product}/>
        <button type="submit" name="method" value="CARD" disabled={!ready}>카드 선택창 확인</button>
        <button type="submit" name="method" value="KAKAO" disabled={!ready}>카카오페이 창 확인</button>
      </form>
    </article>)}
    <p>실제 구매 활성화 전 주문·금액·계정 바인딩, 승인 검증, 중복 방지, 분석 권한 지급, 복구와 환불 연동 검증이 필요합니다. 기존 웹 결제는 Polar로 운영됩니다.</p>
  </section>;
}
