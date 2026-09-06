import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LegalCaseStarter } from "@/components/legal-case-starter";
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
  title: "법률 서면 만들기 — 사건 하나로 이어서",
  description: "계약서·문자·녹취록·판결문을 한 번 넣으면 주요쟁점 정리부터 내용증명·소장·답변서·준비서면·항소이유서까지 같은 자료로 만듭니다. 법률 자문이 아닌 제출용 초안입니다.",
  alternates: { canonical: "/legal" },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "변호사 대신 쓸 수 있나요?", acceptedAnswer: { "@type": "Answer", text: "아니요. 이 서비스가 만드는 것은 제출용 초안이며 법률 자문이 아닙니다. 제출 전에 전문가의 검토를 받으시길 권합니다." } },
    { "@type": "Question", name: "소송장이 맞나요, 소장이 맞나요?", acceptedAnswer: { "@type": "Answer", text: "소장이 맞습니다. 민사소송은 원고가 법원에 소장을 제출하면서 시작됩니다." } },
    { "@type": "Question", name: "소장을 받았는데 무엇을 써야 하나요?", acceptedAnswer: { "@type": "Answer", text: "답변서입니다. 청구를 다투려면 정해진 기간 안에 답변서를 내고 청구원인의 각 사실에 대해 인정·부인을 밝혀야 합니다. 기한은 직접 확인해 주세요." } },
    { "@type": "Question", name: "올린 자료는 저장되나요?", acceptedAnswer: { "@type": "Answer", text: "네. 사건에 저장됩니다. 같은 자료로 다음 문서를 만들기 위해서입니다. 본인만 볼 수 있고 사건을 지우면 자료도 함께 지워집니다." } },
  ],
};

export default async function LegalHomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const cases = data.user ? await listLegalCases(data.user.id).catch(() => []) : [];

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
    <LegalCaseStarter initialCases={cases} signedIn={Boolean(data.user)} />
    <LegalGuide />
  </>;
}
