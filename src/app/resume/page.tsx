import type { Metadata } from "next";
import { ResumeMakerFrame } from "@/components/resume-maker-frame";
import { ResumeBuildPanel } from "@/components/resume-build-panel";
import { ResumeGuide } from "./resume-guide";

/**
 * 이력서 화면.
 *
 * 도구가 먼저 나오고 소개가 그 아래에 붙습니다. 이 주소로 오는 사람 대부분은
 * 이력서를 쓰러 온 것이라, 소개를 먼저 만나면 한 번 더 눌러야 합니다.
 * 그렇다고 소개를 다른 주소로 빼면 검색에 걸릴 글이 사라집니다 — 도구는
 * 브라우저에서만 그리므로(`ssr: false`) 크롤러가 받는 HTML이 비어 있고,
 * 아래의 소개만이 이 주소에 실리는 유일한 글입니다.
 */
export const metadata: Metadata = {
  title: "무료 이력서 양식 · 이력서 만들기",
  description: "회원가입 없이 칸을 채우면 제출용 이력서 한 장이 완성됩니다. 경력·학력·자격을 적고 바로 인쇄하거나 PDF로 저장하세요. 작성한 내용은 서버로 보내지 않습니다.",
  alternates: { canonical: "/resume" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "회원가입을 해야 하나요?", acceptedAnswer: { "@type": "Answer", text: "아니요. 로그인 없이 바로 쓸 수 있고 요금도 없습니다." } },
    { "@type": "Question", name: "적은 내용은 어디에 저장되나요?", acceptedAnswer: { "@type": "Answer", text: "쓰고 있는 브라우저에만 저장됩니다. 서버로 보내지 않습니다. 같은 브라우저로 다시 들어오면 이어서 쓸 수 있습니다." } },
    { "@type": "Question", name: "PDF로 저장할 수 있나요?", acceptedAnswer: { "@type": "Answer", text: "인쇄 단추를 누르고 인쇄 대상에서 'PDF로 저장'을 고르면 됩니다. A4 한 장 규격으로 나옵니다." } },
    { "@type": "Question", name: "증명사진은 꼭 넣어야 하나요?", acceptedAnswer: { "@type": "Answer", text: "켜고 끌 수 있습니다. 블라인드 채용에 내는 이력서라면 꺼 두세요." } },
  ],
};

export default function ResumePage() {
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <ResumeMakerFrame />
    {/* 무료 도구 바로 아래에 유료 칸을 둡니다. 다 적고 지친 자리가 아니라,
        빈 칸을 마주한 직후가 "자료 던지면 채워 준다"는 말이 가장 크게 들리는
        자리입니다. 상단바의 "AI로 제작"이 여기로 내려옵니다. */}
    <ResumeBuildPanel />
    <ResumeGuide />
  </>;
}
