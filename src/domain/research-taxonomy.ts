import type { ResultDocument } from "./result-document";

export const RESEARCH_TAXONOMY_VERSION = "1.0";

const INDUSTRIES = [
  ["제조·생산", /생산|제조|공정|품질|설비|자동차|반도체|조선|화학|에너지/],
  ["IT·소프트웨어", /개발|소프트웨어|데이터|인공지능|AI|클라우드|보안|프론트엔드|백엔드/],
  ["금융·보험", /은행|금융|보험|증권|자산|여신|핀테크/],
  ["유통·서비스", /유통|매장|고객|서비스|영업|판매|CS|호텔|관광/],
  ["공공·교육", /공공|공기업|행정|재단|교육|학교|대학|상담|복지/],
  ["건설·안전", /건설|토목|건축|안전|환경|현장관리/],
  ["바이오·의료", /바이오|제약|의료|병원|간호|임상/],
  ["미디어·콘텐츠", /콘텐츠|디자인|마케팅|광고|미디어|브랜드/],
] as const;

const ROLE_GROUPS = [
  ["생산·품질·안전", /생산|품질|공정|설비|안전|환경|현장/],
  ["개발·데이터·IT", /개발|엔지니어|데이터|IT|소프트웨어|보안|클라우드/],
  ["기획·전략·재무", /기획|전략|재무|회계|경영|사업개발/],
  ["영업·마케팅·고객", /영업|마케팅|브랜드|고객|CS|판매|MD/],
  ["인사·교육·상담", /인사|HR|교육|상담|채용|노무/],
  ["연구·전문직", /연구|R&D|법무|의료|약사|간호|컨설턴트/],
  ["행정·사무·공공", /행정|사무|공공|공기업|지원|총무/],
  ["디자인·콘텐츠", /디자인|콘텐츠|영상|UX|UI|에디터/],
] as const;

const EXPERIENCE_TOPICS = [
  ["문제해결", /문제|원인|해결|개선|대응/],
  ["협업·조율", /협업|조율|소통|공유|팀|부서/],
  ["성과·수치", /성과|달성|향상|감소|증가|절감|효율|%|건|명/],
  ["고객·사용자", /고객|사용자|민원|상담|서비스/],
  ["리더십·주도성", /리더|주도|제안|기획|책임|이끌/],
  ["직무 전문성", /분석|기술|설계|운영|관리|검증|연구/],
  ["학습·성장", /학습|배움|성장|교육|자격|훈련/],
  ["도전·적응", /도전|적응|변화|새로운|실패|극복/],
] as const;

const IMPROVEMENT_BY_CATEGORY: Record<string, string> = {
  posting_fit: "공고·직무 연결",
  evidence: "근거·성과 보강",
  duplication: "경험 중복 해소",
  clarity: "명확성·구체성",
  length: "분량·구조 조정",
  verification: "사실 확인",
  add: "내용 보강",
  remove: "불필요 내용 제거",
  strengthen: "설득력 강화",
  structure: "구조 개선",
  clarify: "명확성·구체성",
  reframe: "관점 재구성",
};

export type ResearchTaxonomy = {
  taxonomyVersion: typeof RESEARCH_TAXONOMY_VERSION;
  industryTags: string[];
  roleGroup: string;
  careerStage: "신입" | "경력" | "미분류";
  experienceTopics: string[];
  improvementTypes: string[];
};

function matchingLabels(text: string, rules: ReadonlyArray<readonly [string, RegExp]>, limit: number) {
  return rules.filter(([, pattern]) => pattern.test(text)).map(([label]) => label).slice(0, limit);
}

function careerStage(result: ResultDocument): ResearchTaxonomy["careerStage"] {
  const profile = result.candidateProfile.items.map((item) => `${item.label} ${item.value} ${item.detail ?? ""}`).join(" ");
  if (/신입|졸업예정|인턴|취업준비/.test(profile)) return "신입";
  if (/경력|재직|퇴직|년차|개월/.test(profile) || result.careerTimeline.some((item) => item.category === "career")) return "경력";
  return "미분류";
}

export function buildResearchTaxonomy(result: ResultDocument): ResearchTaxonomy {
  const context = [
    result.company,
    result.role,
    ...result.requirementMatches.flatMap((item) => [item.requirement, item.postingQuote ?? ""]),
  ].join(" ");
  const prose = result.questions.map((item) => `${item.originalAnswer} ${item.revisedAnswer}`).join(" ");
  const improvementTypes = [...new Set([
    ...result.priorities.map((item) => IMPROVEMENT_BY_CATEGORY[item.category]),
    ...result.consultingAdvice.map((item) => IMPROVEMENT_BY_CATEGORY[item.kind]),
    ...result.documentConflicts.map(() => "자료 간 충돌 해결"),
    ...result.rejectionRisks.map(() => "탈락 위험 완화"),
    ...result.claimEvidence.filter((item) => item.verdict !== "supported").map(() => "주장 근거 확인"),
  ].filter(Boolean))];

  return {
    taxonomyVersion: RESEARCH_TAXONOMY_VERSION,
    industryTags: matchingLabels(context, INDUSTRIES, 3),
    roleGroup: matchingLabels(result.role, ROLE_GROUPS, 1)[0] ?? "기타·미분류",
    careerStage: careerStage(result),
    experienceTopics: matchingLabels(prose, EXPERIENCE_TOPICS, 6),
    improvementTypes,
  };
}

