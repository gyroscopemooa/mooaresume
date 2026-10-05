import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { buildQuickAnalysisInstructions } from "./prompt";
import { REVISION_REVIEW_INSTRUCTIONS } from "./revision-quality";
describe("role-specific coaching boundaries",()=>{
  for(const product of ["QUICK","PRO","FINAL"] as const) it(product+" shares role lenses without invented company research",()=>{
    const request:AnalysisRequest={requestId:"fixture",product,writingMode:"BUILD",writingStyle:"BALANCED",targetLength:700,documents:[{kind:"cover_letter",text:"지원 동기\n팀 프로젝트에서 맡은 작업을 기록했습니다."}]};
    const prompt=buildQuickAnalysisInstructions(request);
    expect(prompt).toContain("기술 선택 이유와 대안");
    expect(prompt).toContain("안전과 품질을 고려한 판단");
    expect(prompt).toContain("[일반 직무 관점]");
    expect(prompt).toContain("외부 검색 결과가 실제 입력으로 제공되지 않았다면");
    expect(prompt).toContain("사실 날조이므로 금지");
    expect(REVISION_REVIEW_INSTRUCTIONS).toContain("산업 관행은 모든 회사의 필수 요건이 아닙니다");
  });
});
