import type { ClaudeAnnotationType } from "@/domain/claude-annotation-mirror";

export type ClaudeSampleAnnotation = { id: string; phrase: string; type: ClaudeAnnotationType; comment: string; start: number; end: number };
export type ClaudeSampleQuestion = {
  id: string;
  order: number;
  title: string;
  prompt: string;
  originalAnswer: string;
  revisedAnswer: string;
  revisionReasons: string[];
  verificationNote?: string;
  annotations: ClaudeSampleAnnotation[];
};
export type ClaudeSampleDocument = { company: string; role: string; applicationLabel: string; questions: ClaudeSampleQuestion[] };

function annotate(source: string, id: string, phrase: string, type: ClaudeAnnotationType, comment: string): ClaudeSampleAnnotation {
  const start = source.indexOf(phrase);
  if (start === -1) throw new Error(`sample annotation phrase not found in source: ${phrase}`);
  return { id, phrase, type, comment, start, end: start + phrase.length };
}

const motivationOriginal = "생산 과정에서 발생한 문제를 해결한 경험을 바탕으로 현대모비스의 생산 경쟁력 향상에 기여하고 싶습니다. 현장에서 문제를 발견하고 팀원들과 해결해 나가겠습니다.";
const capabilityOriginal = "저는 문제 해결 능력과 소통 능력이 뛰어납니다. 실습 과정에서도 문제가 생겼을 때 팀장님께 공유하고 해결했습니다.";
const collaborationOriginal = "팀 프로젝트에서 의견이 맞지 않았지만 대화를 통해 원만하게 해결했습니다. 서로 배려한 결과 프로젝트를 잘 마칠 수 있었습니다.";

// Ported verbatim from the 2026-08-20 `feature/original-annotations` branch (commit 26bb5df) so the demo
// view matches what actually shipped before main diverged — see docs/agent-change-log.md.
export const claudeAnnotationSampleDocument: ClaudeSampleDocument = {
  company: "현대모비스",
  role: "생산관리",
  applicationLabel: "생산관리 신입 지원서 · 샘플",
  questions: [
    {
      id: "motivation",
      order: 1,
      title: "지원동기",
      prompt: "현대모비스에 지원한 이유와 입사 후 기여하고 싶은 내용을 작성해 주세요.",
      originalAnswer: motivationOriginal,
      revisedAnswer:
        "생산 현장에서 문제를 발견하고 기준과 데이터를 바탕으로 개선을 실행하는 생산관리자가 되고 싶어 현대모비스에 지원했습니다. 현장실습 당시 특정 조립 공정에서 같은 형태의 불량이 반복됐지만, 작업자는 설비 상태의 일시적인 문제로 판단하고 있었습니다. 저는 막연히 원인을 추측하기보다 검사 기준서와 실제 작업 순서를 단계별로 대조했습니다.",
      revisionReasons: ["막연한 기여 의지를 실제 행동으로 전환", "채용공고의 공정 데이터 기반 개선 요구와 연결", "지원 직무에서 실행할 행동을 구체화"],
      verificationNote: "점검 순서 변경 후 실제 불량 건수나 검사 시간의 변화가 확인된다면 추가할 수 있습니다.",
      annotations: [
        annotate(motivationOriginal, "motivation-annotation-1", "생산 과정에서 발생한 문제를 해결한 경험", "good", "구체적인 문제 해결 경험을 앞세운 좋은 시작입니다."),
        annotate(motivationOriginal, "motivation-annotation-2", "문제를 발견하고 팀원들과 해결해 나가겠습니다", "vague", "무엇을 어떻게 해결할지 구체적인 행동이 빠져 있어 다짐처럼 읽힙니다."),
      ],
    },
    {
      id: "capability",
      order: 2,
      title: "직무 역량",
      prompt: "지원 직무를 수행하기 위해 준비한 역량과 관련 경험을 작성해 주세요.",
      originalAnswer: capabilityOriginal,
      revisedAnswer:
        "저의 강점은 현장에서 관찰한 이상을 그대로 넘기지 않고 기준과 비교해 원인을 좁히는 실행력입니다. 현장실습 중 반복되는 조립 불량을 확인했을 때도 결과만 기록하는 데 그치지 않았습니다. 먼저 어느 작업 단계에서 이상이 발생하는지 확인하기 위해 검사 기준서의 항목을 작업 순서에 맞춰 다시 나눴습니다.",
      revisionReasons: ["추상적인 역량 표현 제거", "관찰·기록·공유·조정 행동을 순서대로 제시", "생산관리 직무에서 재사용 가능한 문제해결 방식 강조"],
      verificationNote: "본인이 직접 기록한 항목과 팀장에게 공유한 방식이 맞는지 확인해 주세요.",
      annotations: [
        annotate(capabilityOriginal, "capability-annotation-1", "문제 해결 능력과 소통 능력이 뛰어납니다", "vague", "역량을 나열만 해서 근거나 상황이 드러나지 않습니다."),
        annotate(capabilityOriginal, "capability-annotation-2", "팀장님께 공유하고 해결했습니다", "revise", "어떤 문제를 어떻게 해결했는지 구체적인 과정으로 다듬으면 좋습니다."),
      ],
    },
    {
      id: "collaboration",
      order: 3,
      title: "협업 경험",
      prompt: "협업 과정에서 발생한 문제를 해결한 경험을 작성해 주세요.",
      originalAnswer: collaborationOriginal,
      revisedAnswer:
        "팀 프로젝트 초기에 역할 범위를 정하는 과정에서 의견이 갈렸습니다. 일부 팀원은 익숙한 발표와 자료조사를 맡고 싶어 했고, 결과물 작성과 검증 업무는 담당자가 정해지지 않은 채 남아 있었습니다. 저는 단순히 업무를 같은 수로 나누면 마감 직전에 특정 인원에게 부담이 집중될 수 있다고 판단했습니다.",
      revisionReasons: ["갈등을 조정한 판단 기준 제시", "협업 행동과 진행 관리 방식을 구체화", "확인 가능한 결과로 문단 마무리"],
      annotations: [
        annotate(collaborationOriginal, "collaboration-annotation-1", "대화를 통해 원만하게 해결했습니다", "delete", "무엇을 어떻게 대화했는지 없이 결과만 있어 신뢰도가 낮습니다. 구체적인 조정 과정으로 대체하는 걸 추천합니다."),
        annotate(collaborationOriginal, "collaboration-annotation-2", "서로 배려한 결과", "good", "협업의 태도를 짧게라도 드러낸 표현입니다."),
      ],
    },
  ],
};
