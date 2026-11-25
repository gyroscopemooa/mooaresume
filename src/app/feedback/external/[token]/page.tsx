import {notFound} from "next/navigation";
import {readExternalResult} from "@/server/external-orders/service";
import {hasFeedback} from "@/server/feedback/feedback-repository";
import {FeedbackForm} from "../../[analysisRunId]/feedback-form";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const metadata={title:"분석 후기 | 무아레쥬메",robots:{index:false,follow:false,nocache:true},referrer:"no-referrer" as const};
export default async function ExternalFeedbackPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const delivery=await readExternalResult(token).catch(()=>null);
  if(!delivery) notFound();
  return <FeedbackForm analysisRunId={delivery.analysisRunId} alreadyAnswered={await hasFeedback(delivery.analysisRunId)} externalToken={token}/>;
}
