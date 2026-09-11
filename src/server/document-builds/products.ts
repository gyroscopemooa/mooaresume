import "server-only";

import type { DocumentBuildProduct } from "@/server/billing/document-build-checkout";
import type { BuildTable } from "./build-lifecycle";

/**
 * "1건 사서 1건 만든다" 상품 목록.
 *
 * 표 이름과 Polar 상품 환경변수를 한 곳에 적어 둡니다. 이 값들이 라우트마다
 * 흩어져 있으면, 상품을 하나 더 만들 때 어디를 고쳐야 하는지 세어 봐야 합니다.
 *
 * 이력서 제작은 여기 없습니다 — 이미 팔고 있는 경로라 그대로 둡니다
 * (`server/resume/resume-build-repository.ts`).
 */

export type DocumentBuildDefinition = { table: BuildTable; product: DocumentBuildProduct };

export const careerDescriptionBuild: DocumentBuildDefinition = {
  table: { table: "career_description_builds", label: "경력기술서 제작" },
  product: {
    productIdEnv: "POLAR_CAREER_DESCRIPTION_PRODUCT_ID",
    kind: "CAREER_DESCRIPTION_BUILD",
    buildIdKey: "careerDescriptionBuildId",
    label: "경력기술서 제작",
  },
};

export const portfolioBuild: DocumentBuildDefinition = {
  table: { table: "portfolio_builds", label: "포트폴리오 설명글 제작" },
  product: {
    productIdEnv: "POLAR_PORTFOLIO_PRODUCT_ID",
    kind: "PORTFOLIO_BUILD",
    buildIdKey: "portfolioBuildId",
    label: "포트폴리오 설명글 제작",
  },
};

export const legalDocumentBuild: DocumentBuildDefinition = {
  table: { table: "legal_document_builds", label: "법률 문서 작성" },
  product: {
    productIdEnv: "POLAR_LEGAL_PRODUCT_ID",
    kind: "LEGAL_DOCUMENT_BUILD",
    buildIdKey: "legalDocumentBuildId",
    label: "법률 문서 작성",
  },
};

/**
 * AI 심층해설(커리어 검사) — 범위별로 상품이 갈립니다. 종합(3종)이 개별보다
 * 비싸므로 표 하나에 상품 둘을 묶지 않고 정의를 둘로 나눕니다. env 이름은
 * 사용자가 Polar 대시보드에 이미 만들어 둔 그대로입니다(대문자 관례와 다르지만
 * 대시보드 상품을 다시 만들게 하지 않기 위해 그대로 씀).
 */
/** 둘 다 같은 표를 씁니다 — 상품(가격)만 범위에 따라 갈립니다. */
export const careerAiBuildTable: BuildTable = { table: "career_ai_builds", label: "AI 심층해설" };

export const careerAiSingleBuild: DocumentBuildDefinition = {
  table: careerAiBuildTable,
  product: {
    productIdEnv: "polar_c_test",
    kind: "CAREER_AI_BUILD_SINGLE",
    buildIdKey: "careerAiBuildId",
    label: "AI 심층해설",
  },
};

export const careerAiCombinedBuild: DocumentBuildDefinition = {
  table: careerAiBuildTable,
  product: {
    productIdEnv: "polar_3_all_test",
    kind: "CAREER_AI_BUILD_COMBINED",
    buildIdKey: "careerAiBuildId",
    label: "AI 심층해설(종합)",
  },
};

export function getCareerAiBuildDefinition(scope: "interest" | "work_style" | "work_values" | "combined"): DocumentBuildDefinition {
  return scope === "combined" ? careerAiCombinedBuild : careerAiSingleBuild;
}
