import type { CareerDescriptionBuildOutput } from "@/domain/career-description-build";

/**
 * 도구 오른쪽 칸에 미리 보여 줄 완성본 예시.
 *
 * 실제 결과가 아니라 "이렇게 나옵니다"를 보여 주는 견본입니다. 자료를 하나도
 * 올리지 않은 방문자도 이 칸을 보고 무엇을 사는지 알아야, 빈 입력 칸만 보고
 * 돌아가지 않습니다. 생성되는 순간 실제 결과로 바뀝니다.
 */
export const careerDescriptionSampleOutput: CareerDescriptionBuildOutput = {
  headline: "품질관리 3년 · 자동차 부품 공정 경험",
  entries: [
    {
      company: "OO자동차부품",
      department: "품질관리팀",
      roleTitle: "사원",
      period: "2022.03 ~ 재직중",
      duties: [
        "사출 공정 전수검사 및 SPC 관리",
        "불량 유형 분류 및 주간 품질 보고서 작성",
        "협력사 입고 검사 기준 개정 참여",
      ],
      achievement: "불량률 관리 지표를 분기 평균 0.8%대로 유지",
      evidence: "경력증명서.pdf, 본인이 적은 설명",
    },
    {
      company: "OO산업",
      department: "생산관리팀",
      roleTitle: "인턴",
      period: "2021.06 ~ 2021.12 · 7개월",
      duties: ["생산 일정 관리 보조", "라인 가동률 데이터 취합"],
      achievement: "",
      evidence: "재직증명서.pdf",
    },
  ],
  supportingFacts: [
    { title: "품질경영기사", period: "2021.11", detail: "국가기술자격 취득", evidence: "자격증.pdf" },
    { title: "OO대학교 기계공학과", period: "2017.03 ~ 2021.02", detail: "졸업", evidence: "졸업증명서.pdf" },
  ],
  notes: ["OO산업 재직 당시 정확한 직급을 자료에서 찾지 못해 비워 두었습니다."],
};
