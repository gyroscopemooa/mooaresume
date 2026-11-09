import Link from "next/link";

const descriptions = {
  analysis: "QUICK·PRO·FINAL은 지원 건별 결제입니다. 결제 확인 후 분석을 시작할 수 있으며, 완료 시 구매한 상품 범위의 분석·첨삭 결과를 제공합니다.",
  document: "문서 제작은 선택한 문서 1건에 대한 건별 결제입니다. 결제 확인 후 작성을 시작할 수 있으며, 완료 시 해당 제작 결과를 제공합니다.",
  interview: "추가 구매는 모의면접 재시도 1회에 대한 건별 결제입니다. 결제 확인 후 해당 면접을 진행할 수 있으며, 답변과 면접 진행을 마치면 평가·리포트를 제공합니다.",
  career: "AI 심층해설은 선택한 개별 또는 종합 검사 범위의 해설 1건에 대한 건별 결제입니다. 결제 확인 후 생성을 시작하고, 완료 시 해설 결과를 제공합니다.",
};

export function ServiceDeliveryNotice({ kind }: { kind: keyof typeof descriptions }) {
  return <aside aria-label="서비스 제공 안내" style={{ fontSize: "0.875rem", lineHeight: 1.7, marginBlock: "1rem", overflowWrap: "anywhere" }}>
    <p>{descriptions[kind]} 자동 갱신되는 정기결제가 아닙니다.</p>
    <p>처리 시간은 입력 분량과 시스템 상황에 따라 달라질 수 있습니다. 결과의 보관·열람 기간은 서비스 제공기간과 구분됩니다. <Link href="/policy#service-delivery">서비스 제공·이용범위 안내</Link></p>
  </aside>;
}
