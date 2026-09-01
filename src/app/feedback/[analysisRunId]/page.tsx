import type { Metadata } from "next";
import { hasFeedback } from "@/server/feedback/feedback-repository";
import { FeedbackForm } from "./feedback-form";

/**
 * 완료 메일에서 들어오는 후기 화면.
 *
 * 주소에 들어 있는 것은 분석 실행 id 하나뿐이고, 이 화면은 그 분석에 대해
 * **아무것도 보여 주지 않습니다** — 이름도, 회사도, 내용도. 링크가 어딘가로
 * 새더라도 새는 것이 없어야 하기 때문입니다. 로그인을 요구하지 않는 것도
 * 같은 이유의 뒷면입니다: 보여 줄 것이 없으니 막을 것도 없고, 로그인을
 * 시키면 후기는 거의 오지 않습니다.
 */
export const metadata: Metadata = {
  title: "분석 후기 남기기 | 무아레쥬메",
  // 개인의 분석에 붙은 주소입니다. 검색에 뜰 이유가 없습니다.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function FeedbackPage({ params }: { params: Promise<{ analysisRunId: string }> }) {
  const { analysisRunId } = await params;
  // 이미 남긴 사람에게 빈 폼을 다시 내밀면, 썼던 것을 또 쓰다가 마지막에
  // 거절당합니다. 열자마자 말해 줍니다.
  const answered = await hasFeedback(analysisRunId);
  return <FeedbackForm analysisRunId={analysisRunId} alreadyAnswered={answered} />;
}
