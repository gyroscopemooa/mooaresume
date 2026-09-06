import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LegalCaseStarter } from "@/components/legal-case-starter";
import { DocumentToolHeader } from "@/components/document-tool-header";
import { previewRobots } from "@/domain/application-document";
import { listLegalCases } from "@/server/legal/legal-case-repository";
import { LegalGuide } from "./legal-guide";

/**
 * 법률 첫 화면 — 사건 목록과 새 사건 만들기.
 *
 * 로그인하지 않아도 화면은 열립니다. 무엇을 하는 서비스인지 보지도 못한 채
 * 로그인 벽을 만나면 대부분 돌아갑니다. 목록 자리는 비워 두고, 사건을 실제로
 * 만들 때 로그인을 받습니다.
 */
export const metadata: Metadata = {
  title: "나홀로 소송 어시스턴트 — 사건 하나로 이어서 쓰는 법률 서면",
  description: "계약서·문자·녹취록·판결문을 한 번 넣으면 주요쟁점 정리부터 내용증명·소장·답변서·준비서면·항소이유서까지 같은 자료로 만듭니다. 나홀로소송·법률행정 도우미. 법률 자문이 아닌 제출용 초안이며 승소를 장담하지 않습니다.",
  keywords: ["나홀로 소송", "나홀로소송 도우미", "법률행정도우미", "소송 어시스턴트", "셀프소송", "소장 작성", "답변서 작성", "준비서면", "내용증명", "항소이유서"],
  alternates: { canonical: "/legal" },
  robots: previewRobots("legal-case"),
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "변호사 대신 쓸 수 있나요?", acceptedAnswer: { "@type": "Answer", text: "아니요. 이 서비스가 만드는 것은 제출용 초안이며 법률 자문이 아닙니다. AI는 승소를 장담하지 않고, 제출 여부와 그 결과에 대한 책임은 전적으로 이용자 본인에게 있습니다. 제출 전에 전문가의 검토를 받으시길 권합니다." } },
    { "@type": "Question", name: "소송장이 맞나요, 소장이 맞나요?", acceptedAnswer: { "@type": "Answer", text: "소장이 맞습니다. 민사소송은 원고가 법원에 소장을 제출하면서 시작됩니다." } },
    { "@type": "Question", name: "소장을 받았는데 무엇을 써야 하나요?", acceptedAnswer: { "@type": "Answer", text: "답변서입니다. 청구를 다투려면 정해진 기간 안에 답변서를 내고 청구원인의 각 사실에 대해 인정·부인을 밝혀야 합니다. 기한은 직접 확인해 주세요." } },
    { "@type": "Question", name: "올린 자료는 저장되나요?", acceptedAnswer: { "@type": "Answer", text: "네. 사건에 저장됩니다. 같은 자료로 다음 문서를 만들기 위해서입니다. 본인만 볼 수 있고 사건을 지우면 자료도 함께 지워집니다." } },
  ],
};

/**
 * 로그인 확인이 실패해도 화면은 나와야 합니다.
 *
 * 이 주소의 아래 절반은 검색으로 들어온 사람과 크롤러가 읽는 소개 글입니다.
 * 로그인 조회 한 번이 실패했다고 그 글까지 500으로 사라지면, 정작 이 화면을
 * 만든 이유가 없어집니다. 실패는 "로그인 안 됨"으로 취급하고 목록 자리만
 * 비웁니다 — 사건을 만들 때 다시 로그인을 받습니다.
 */
async function loadViewer() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { signedIn: false, cases: [] };
    return { signedIn: true, cases: await listLegalCases(data.user.id).catch(() => []) };
  } catch {
    return { signedIn: false, cases: [] };
  }
}

export default async function LegalHomePage() {
  const viewer = await loadViewer();

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <DocumentToolHeader />
    <LegalCaseStarter initialCases={viewer.cases} signedIn={viewer.signedIn} />
    <LegalGuide />
  </>;
}
