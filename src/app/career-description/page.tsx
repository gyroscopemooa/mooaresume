import type { Metadata } from "next";
import { CareerDescriptionBuildPanel } from "@/components/career-description-build-panel";
import { CareerDescriptionGuide } from "./career-description-guide";

/**
 * 경력기술서 화면.
 *
 * 이력서 화면(`resume/page.tsx`)과 같은 이유로 도구를 먼저, 소개를 그 아래에
 * 둡니다. 다만 이력서와 달리 무료 도구가 없습니다 — 이 서류는 자료를 종합해
 * 새 문서를 짜는 일 자체가 유료 상품이라, 도구 화면이 곧 입력+결제 화면입니다.
 */
export const metadata: Metadata = {
  title: "경력기술서 만들기 — 자료를 모으면 AI가 정리",
  description: "이력서·자기소개서·자격증·경력증명서를 올리면 회사별 소속·직무·기간·담당업무를 정리한 경력기술서로 만들어 드립니다. 없는 경력은 지어내지 않습니다.",
  alternates: { canonical: "/career-description" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "경력기술서와 직무기술서는 같은 건가요?", acceptedAnswer: { "@type": "Answer", text: "다른 문서입니다. 경력기술서는 지원자가 자신이 한 일과 성과를 정리해 제출하는 문서이고, 직무기술서(JD)는 회사가 그 자리의 업무와 필요 역량을 정의해 공고에 붙이는 문서입니다. 이 도구는 앞의 것을 만듭니다. 회사가 낸 직무기술서를 분석해 내 경험과 맞춰 보려면 자기소개서 첨삭의 채용공고 분석을 쓰세요." } },
    { "@type": "Question", name: "자료가 하나도 없어도 쓸 수 있나요?", acceptedAnswer: { "@type": "Answer", text: "네. 파일이 없어도 기억나는 대로 적는 줄글만으로 시작할 수 있습니다." } },
    { "@type": "Question", name: "없는 경력을 부풀려 써 주나요?", acceptedAnswer: { "@type": "Answer", text: "아니요. 자료에 없는 회사·기간·성과·자격은 만들지 않고, 확인되지 않는 부분은 비워 두고 알려 드립니다." } },
    { "@type": "Question", name: "결제 전에 자료가 서버에 저장되나요?", acceptedAnswer: { "@type": "Answer", text: "아니요. 결제가 확인된 뒤 만드는 요청에만 자료가 실리고, 결과를 돌려준 뒤에는 저장하지 않습니다." } },
  ],
};

export default function CareerDescriptionPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <CareerDescriptionBuildPanel />
    <CareerDescriptionGuide />
  </>;
}
