import type { Metadata } from "next";
import { CareerAiPreparation } from "@/components/career-ai-preparation";
export const metadata: Metadata={title:"AI 심층 커리어 해설 준비 | MOOA Resume",robots:{index:false,follow:false}};
type Scope="interest"|"work_style"|"work_values"|"combined";
export default async function CareerAiPage({searchParams}:{searchParams:Promise<{scope?:string}>}){const params=await searchParams;const scope:Scope=params.scope==="interest"||params.scope==="work_style"||params.scope==="work_values"||params.scope==="combined"?params.scope:"combined";return <CareerAiPreparation scope={scope}/>;}