import type { Metadata } from "next";
import Link from "next/link";
import { ServiceDeliveryNotice } from "@/components/service-delivery-notice";

export const metadata: Metadata = {
  title: "운영정책",
  description: "상품별 결제 방식, 서비스 제공 시점과 이용범위, 결과 보관의 구분을 안내합니다.",
};

export default function OperatingPolicyPage() {
  return <main style={{ maxWidth: "48rem", margin: "0 auto", padding: "2rem 1rem", lineHeight: 1.8 }}>
    <Link href="/">무아레쥬메 홈</Link>
    <h1>운영정책</h1>
    <h2 id="service-delivery">서비스 제공·이용범위·결제 방식</h2>
    <p>구매 화면에서 선택한 상품·분량·횟수를 기준으로 서비스를 제공합니다. 상품별 가격과 구매 가능 여부는 해당 구매 화면에서 확인할 수 있습니다.</p>
    <h2>AI 자기소개서 분석·첨삭</h2>
    <ServiceDeliveryNotice kind="analysis" />
    <p>상품에 포함된 면접 기능은 해당 상품의 제공 범위를 따릅니다. 면접은 사용자가 답변을 제출하며 진행하는 서비스입니다.</p>
    <h2>모의면접 추가 재시도</h2>
    <ServiceDeliveryNotice kind="interview" />
    <h2>문서 제작</h2>
    <p>이력서, 경력기술서, 포트폴리오 설명글 및 법률 문서 작성은 각각 선택한 제작 건을 기준으로 합니다.</p>
    <ServiceDeliveryNotice kind="document" />
    <h2>커리어 검사 AI 심층해설</h2>
    <ServiceDeliveryNotice kind="career" />
    <h2>이용기간과 결과 보관</h2>
    <p>이 안내는 현재 서비스 제공 방식을 설명하며, 구매한 이용권에 새로운 만료일을 설정하거나 기존 이용범위를 축소하지 않습니다. 별도 이용기간이 안내된 쿠폰·이벤트 이용권은 해당 발급 조건을 확인해 주세요.</p>
    <p>분석·제작·면접 결과를 제공하는 시점과 결과 데이터를 보관·열람하는 기간은 서로 다릅니다. 결과의 영구 보관을 약속하는 안내가 아니며, 개인정보의 보관 및 삭제 기준은 <Link href="/privacy">개인정보처리방침</Link>에서 확인할 수 있습니다.</p>
  </main>;
}
