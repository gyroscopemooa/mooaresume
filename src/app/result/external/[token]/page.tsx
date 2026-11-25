import { notFound } from "next/navigation";
import { ResultWorkspaceComplete } from "@/components/result-workspace-complete";
import { readExternalResult } from "@/server/external-orders/service";
export const dynamic="force-dynamic";
export const runtime="nodejs";
export const metadata={title:"자기소개서 분석 결과 | 무아레쥬메",robots:{index:false,follow:false,nocache:true},referrer:"no-referrer" as const};
export default async function ExternalResultPage({params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const delivery=await readExternalResult(token).catch(()=>null);
  if(!delivery) notFound();
  return <ResultWorkspaceComplete result={delivery.result} adminPreview initialView="overview" editionBadge="고객 전용 분석 결과"/>;
}
