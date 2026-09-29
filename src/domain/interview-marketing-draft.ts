/** Public-facing copy only. No evaluator instructions, thresholds or weights. */
export const INTERVIEW_MARKETING_DRAFT = {
  headline: "답변만 준비하지 마세요. 면접 전체를 준비하세요.",
  description: "첫인사부터 마지막 질문까지. 서로 다른 관점으로 내 답변의 강점과 놓친 부분을 살펴보는 면접 PRO를 만들고 있습니다.",
  perspectives: ["직무 이해", "실무 수행", "경험의 근거", "문제 해결", "의사소통", "경청과 협업", "지원 동기", "성찰과 성장", "지원자 질문", "전체 면접 수행"],
  sections: [
    { id: "whole", title: "면접은 첫 질문 전에 시작됩니다.", body: "입장과 착석, 질문을 듣는 순간, 답변과 마무리까지. 면접의 전체 흐름을 연습하는 경험을 준비합니다.", status: "개발 예정 · 입퇴장 리허설" },
    { id: "panel", title: "같은 답변도, 면접관마다 다르게 들립니다.", body: "10가지 관점의 AI 면접관을 목표로 설계합니다. 공통 강점뿐 아니라 평가가 갈린 이유까지 비교할 수 있도록 준비합니다. 실제 사람 10명의 심사를 뜻하지 않습니다.", status: "설계 중 · 다중 관점 평가" },
    { id: "evidence", title: "점수 하나로 당신을 설명하지 않습니다.", body: "무엇이 좋았는지, 어디에서 의견이 갈렸는지, 다음에는 어떻게 답할지. 답변 속 근거와 함께 설명하는 리포트를 준비합니다.", status: "개발 예정 · 근거형 리포트" },
    { id: "question", title: "당신도 질문할 수 있습니다.", body: "면접은 답만 하는 자리가 아닙니다. 역할과 협업 방식을 확인하는 질문도 면접의 일부로 다룹니다.", status: "개발 예정 · 지원자 역질문" },
  ],
} as const;
