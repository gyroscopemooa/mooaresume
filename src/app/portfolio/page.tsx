import type { Metadata } from "next";
import { PortfolioBuildPanel } from "@/components/portfolio-build-panel";
import { PortfolioGuide } from "./portfolio-guide";

/**
 * 포트폴리오 화면. 도구가 먼저, 소개가 그 아래입니다 — 다른 제작 도구와 같습니다.
 */
export const metadata: Metadata = {
  title: "포트폴리오 설명글 만들기 — 프로젝트만 적으면 AI가 정리",
  description: "프로젝트를 적으면 소개·담당 역할·문제·실행·성과·사용 기술과 전체 목차를 만들어 드립니다. 서식이 아니라 글을 씁니다. 없는 성과는 지어내지 않습니다.",
  alternates: { canonical: "/portfolio" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "PPT 디자인도 만들어 주나요?", acceptedAnswer: { "@type": "Answer", text: "아니요. 여기서 만드는 것은 글입니다. 만들어 드린 설명글을 쓰시던 PPT·노션·PDF에 붙여 넣으시면 됩니다." } },
    { "@type": "Question", name: "개발·디자인 직군이 아니어도 쓸 수 있나요?", acceptedAnswer: { "@type": "Answer", text: "네. 기획·마케팅·상담·사무직도 프로젝트 단위로 정리하면 포트폴리오가 됩니다." } },
    { "@type": "Question", name: "프로젝트가 하나뿐이어도 되나요?", acceptedAnswer: { "@type": "Answer", text: "하나여도 됩니다. 값은 프로젝트 개수와 무관하게 1건 정액입니다." } },
    { "@type": "Question", name: "성과 수치를 모르면 어떻게 하나요?", acceptedAnswer: { "@type": "Answer", text: "비워 두고 무엇을 확인하면 좋을지 알려 드립니다. 모르는 수치를 채워 넣으면 면접에서 산출 근거를 물었을 때 무너집니다." } },
  ],
};

export default function PortfolioPage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <PortfolioBuildPanel />
    <PortfolioGuide />
  </>;
}
