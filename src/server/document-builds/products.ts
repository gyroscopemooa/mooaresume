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
