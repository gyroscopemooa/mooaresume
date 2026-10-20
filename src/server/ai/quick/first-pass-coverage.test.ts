import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { createQuickAnalysisResult } from "./provider";
import type { QuickGatewayResult } from "./openai-responses-gateway";
describe("ambiguous first-pass length disclosure",()=>{
  it("keeps the uncertainty visible even when the model omits its note",()=>{
    const request: AnalysisRequest={requestId:"fixture",product:"PRO",writingMode:"CREATE",writingStyle:"BALANCED",targetLength:700,
      documents:[{kind:"cover_letter",text:"[지원 계기]\n음악\n[경험]\n주문 처리\n[목표]\n운영 지원"}],
      questions:[{id:"one",title:"자유 형식",prompt:"",targetLength:700,answer:"[지원 계기]\n음악\n[경험]\n주문 처리\n[목표]\n운영 지원"}]};
    const result:QuickGatewayResult={execution:{responseId:"test",model:"test",promptVersion:"test",schemaVersion:"1.0",rubricVersion:"test",inputTokens:0,outputTokens:0,totalTokens:0},
      output:{schemaVersion:"1.0",readiness:{score:60,label:"확인 필요",summary:"제공 자료 검토",reasons:["사실 확인"]},priorities:[],
        revision:{subheading:null,lengthNote:null,revisedAnswer:"음악과 운영에 관심이 있습니다. 주문 처리 경험을 살려 운영을 지원하겠습니다.",highlightedPhrases:[],originalAnnotations:[],reasons:[],verificationNote:""},
        verificationQuestions:[]}};
    const assembled=createQuickAnalysisResult(request,result);
    expect(assembled.questions[0].verificationNote).toContain("공식 전체 제한으로 확인되지");
    expect(assembled.questions[0].lengthNote).toContain("문항별 제한");
    expect(assembled.verificationQuestions[0]).toContain("문항별 제한");
  });
});
