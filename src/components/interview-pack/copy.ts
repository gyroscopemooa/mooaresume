import { READINESS_LABEL, type SlotReadiness } from "@/domain/interview-pack";

/**
 * 면접 준비팩 화면의 문구를 한곳에 모은다. 실제 구현된 기능만 설명하고, 과장하지 않는다.
 * (테스트가 이 폴더의 모든 문구에서 금지 표현을 검사한다.)
 */

export const PACK_COPY = {
  title: "면접 준비팩",
  lead: "제출한 자료를 바탕으로 자기소개와 면접 답변을 만들고, 키워드로 연습하세요.",
  openHint: "만들기를 눌러도 이 단계에서는 AI를 부르지 않습니다. 이 지원 건의 제출 자료를 불러와 확인만 합니다.",
  materialsTitle: "사용하는 자료",
  materialsNote: "이 지원 건에서 제출한 자료만 사용하고 다른 지원 건의 자료는 섞이지 않습니다. 원본 자료와 첨삭 결과는 바뀌지 않으며, 보완한 내용은 새 버전으로 따로 저장됩니다. 이전 첨삭문은 표현 참고용이고, 사실의 근거는 원본 자료와 직접 확인해 주신 내용입니다.",
  readinessTitle: "문항별 준비 상태",
  readinessNote: "점수나 확률 대신 문항마다 ‘만들 수 있는지’와 그 이유만 보여 드립니다. 자료가 모자란 문항은 빈칸으로 두고 질문으로 보완합니다.",
  checkExplain: "자료 점검은 만들기 횟수를 쓰지 않습니다. 문항마다 자료가 충분한지, 서류끼리 다른 내용은 없는지 살펴봅니다.",
  autoCheckNote: "자동 점검은 원문 인용 위치, 자료에 없는 숫자·역할 표현을 살피는 보조 기능이며 완전하지 않습니다. 사실과 맞는지는 지원자 본인이 최종 확인해 주세요.",
  followUpNote: "예상 질문은 서류 내용으로 만든 예시입니다. 실제 면접에서 그대로 나온다는 뜻이 아니며 출제 빈도와도 무관합니다.",
  timerNote: "연습 시간은 직접 시작·정지해 잰 값이며, 이 기기에만 저장됩니다. 발화 시간을 자동으로 분석하는 기능이 아닙니다.",
  lengthNote: "글자 수로 어림한 길이 안내이며 실제 말하는 시간은 사람마다 다릅니다.",
} as const;

export const READINESS_TONE: Record<SlotReadiness, "ok" | "material" | "confirm"> = {
  ready: "ok",
  needs_material: "material",
  needs_confirmation: "confirm",
};

export { READINESS_LABEL };

/** 사용자에게 보이는 문구에 나와서는 안 되는 표현. 실제로 구현되지 않았거나 과장이 되는 말이다. */
export const BANNED_PHRASES = [
  "ChatGPT",
  "합격률",
  "합격 보장",
  "합격을 보장",
  "정확히 30초",
  "정확히 1분",
  "사실 검증 100",
  "100% 검증",
  "검증 완료",
  "준비도",
  "면접 PRO",
  "적중",
] as const;
