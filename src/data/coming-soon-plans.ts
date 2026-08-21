export type ComingSoonPlan = {
  id: "QUICK" | "PRO" | "FINAL";
  price: string;
  title: string;
  description: string;
};

// Prices mirror the live PricingComparison plans (src/components/pricing-comparison.tsx).
// Edit here to update the Coming Soon pricing preview independently before launch.
export const comingSoonPlans: ComingSoonPlan[] = [
  {
    id: "QUICK",
    price: "5,900원",
    title: "빠르게 점검하고 싶다면",
    description: "이미 작성한 자소서의 문장·논리·구체성을 빠르게 점검합니다.",
  },
  {
    id: "PRO",
    price: "12,900원",
    title: "공고 기준으로 완성하고 싶다면",
    description: "채용공고 분석, 직무 적합도, 부족한 내용 보완까지 함께 진행합니다.",
  },
  {
    id: "FINAL",
    price: "19,900원",
    title: "면접까지 준비하고 싶다면",
    description: "PRO의 모든 기능에 제출 전 최종검수와 면접 예상질문·모의면접을 더합니다.",
  },
];
