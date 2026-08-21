// Verbatim copy of the sample fixture from the 2026-08-20 `feature/original-annotations`
// branch (commit 26bb5df), kept separate from the shared `@/fixtures/result-document` sample
// so the "Claude 복원판" mirror shows exactly what that branch demoed. See docs/agent-change-log.md.
import type { ResultDocument, ResultOriginalAnnotation } from "@/domain/result-document-claude-restored";

function annotate(source: string, id: string, phrase: string, type: ResultOriginalAnnotation["type"], comment: string): ResultOriginalAnnotation {
  const start = source.indexOf(phrase);
  if (start === -1) throw new Error(`fixture annotation phrase not found in source: ${phrase}`);
  return { id, phrase, type, comment, start, end: start + phrase.length };
}

const motivationOriginal = "생산 과정에서 발생한 문제를 해결한 경험을 바탕으로 현대모비스의 생산 경쟁력 향상에 기여하고 싶습니다. 현장에서 문제를 발견하고 팀원들과 해결해 나가겠습니다.";
const capabilityOriginal = "저는 문제 해결 능력과 소통 능력이 뛰어납니다. 실습 과정에서도 문제가 생겼을 때 팀장님께 공유하고 해결했습니다.";
const collaborationOriginal = "팀 프로젝트에서 의견이 맞지 않았지만 대화를 통해 원만하게 해결했습니다. 서로 배려한 결과 프로젝트를 잘 마칠 수 있었습니다.";

export const claudeRestoredSampleDocument: ResultDocument = {
  schemaVersion: "1.0",
  caseId: "sample-hyundai-mobis-production-claude-restored",
  product: "PRO",
  isSample: true,
  company: "현대모비스",
  role: "생산관리",
  applicationLabel: "생산관리 신입 지원서",
  analysisRun: {
    provider: "mock",
    responseId: null,
    model: "fixture",
    promptVersion: "sample-1.0",
    rubricVersion: "sample-rubric-1.0",
    schemaVersion: "1.0",
    inputTokens: null,
    outputTokens: null,
    totalTokens: null,
  },
  analyzedAt: "2026-08-16T00:00:00.000Z",
  readiness: {
    score: 82,
    label: "제출 전 보완 권장",
    summary: "문항 구조는 안정적이지만 기업 선택 이유와 확인 가능한 결과 근거를 보완하면 설득력이 높아집니다.",
    reasons: ["문항 요구에 맞는 기본 구조", "기업 선택 이유와 확인 가능한 결과 근거는 보완 필요"],
  },
  attachments: [
    {
      id: "attachment-1",
      filename: "현대모비스_자기소개서.hwp",
      extension: "HWP",
      sizeBytes: 188_416,
      parseStatus: "ready",
      parserLabel: "샘플 문서",
      sectionCount: 3,
    },
  ],
  candidateProfile: {
    snapshotLabel: "현대모비스 생산관리 지원 당시 정보",
    items: [
      { id: "profile-education", category: "education", label: "학력", value: "울산대학교 기계공학", detail: "학사", needsVerification: false },
      { id: "profile-grade", category: "grade", label: "학점", value: "3.72 / 4.5", needsVerification: false },
      { id: "profile-career", category: "career", label: "경력", value: "자동차 부품 품질 1년 8개월", needsVerification: false },
      { id: "profile-language", category: "language", label: "어학", value: "OPIc IH", needsVerification: false },
      { id: "profile-certification", category: "certification", label: "자격", value: "품질경영기사 외 1개", needsVerification: false },
      { id: "profile-project", category: "project", label: "주요 경험", value: "생산라인·품질 시험 외 2개", needsVerification: false },
      { id: "profile-award", category: "award", label: "수상", value: "공정개선 프로젝트 우수상", detail: "지원자료에서만 확인되어 사용자 확인 필요", needsVerification: true },
    ],
  },
  priorities: [
    {
      id: "priority-1",
      title: "기업 선택 이유가 약합니다.",
      description: "지원동기를 현대모비스 공고의 생산 데이터 기반 개선 요구와 직접 연결하세요.",
      category: "posting_fit",
      severity: "high",
    },
    {
      id: "priority-2",
      title: "결과를 판단할 근거가 부족합니다.",
      description: "수치를 만들지 말고 실제 확인 가능한 변화나 주변 피드백을 보완하세요.",
      category: "evidence",
      severity: "high",
    },
    {
      id: "priority-3",
      title: "문항 간 경험이 겹칩니다.",
      description: "각 문항에서 서로 다른 역할과 행동이 드러나도록 경험을 재배치하세요.",
      category: "duplication",
      severity: "medium",
    },
  ],
  questions: [
    {
      id: "motivation",
      order: 1,
      title: "지원동기",
      prompt: "현대모비스에 지원한 이유와 입사 후 기여하고 싶은 내용을 작성해 주세요.",
      targetLength: 500,
      originalAnswer: motivationOriginal,
      revisedAnswer: "생산 현장에서 문제를 발견하고 기준과 데이터를 바탕으로 개선을 실행하는 생산관리자가 되고 싶어 현대모비스에 지원했습니다. 현장실습 당시 특정 조립 공정에서 같은 형태의 불량이 반복됐지만, 작업자는 설비 상태의 일시적인 문제로 판단하고 있었습니다. 저는 막연히 원인을 추측하기보다 검사 기준서와 실제 작업 순서를 단계별로 대조했습니다. 그 과정에서 검사 전에 확인해야 할 부품 방향과 체결 순서가 작업자마다 다르다는 점을 발견했습니다. 확인한 내용을 작업자와 팀장에게 먼저 공유하고, 기존 작업을 방해하지 않는 범위에서 점검 순서를 통일해 시험했습니다. 이후에는 교대 시에도 같은 기준으로 확인할 수 있도록 핵심 점검 항목을 짧게 정리했습니다. 이 경험을 통해 생산 문제는 개인의 주의만 요구해서 해결되는 것이 아니라, 누구나 동일하게 실행할 수 있는 기준과 공유 방식이 함께 마련돼야 한다는 점을 배웠습니다. 입사 후에는 공정 데이터와 현장 의견을 함께 살피며 이상 징후를 빠르게 찾겠습니다. 또한 생산·품질·설비 부서가 같은 기준으로 문제를 이해할 수 있도록 근거를 정리하고, 실행 가능한 개선안을 끝까지 관리해 안정적인 생산성과 품질 확보에 기여하겠습니다.",
      highlightedPhrases: ["검사 기준과 실제 작업 순서를 대조했습니다", "공정 데이터를 근거로", "유관부서와 개선안을 실행하겠습니다"],
      originalAnnotations: [
        annotate(motivationOriginal, "motivation-annotation-1", "생산 과정에서 발생한 문제를 해결한 경험", "good", "구체적인 문제 해결 경험을 앞세운 좋은 시작입니다."),
        annotate(motivationOriginal, "motivation-annotation-2", "문제를 발견하고 팀원들과 해결해 나가겠습니다", "vague", "무엇을 어떻게 해결할지 구체적인 행동이 빠져 있어 다짐처럼 읽힙니다."),
      ],
      revisionReasons: ["막연한 기여 의지를 실제 행동으로 전환", "채용공고의 공정 데이터 기반 개선 요구와 연결", "지원 직무에서 실행할 행동을 구체화"],
      verificationNote: "점검 순서 변경 후 실제 불량 건수나 검사 시간의 변화가 확인된다면 추가할 수 있습니다.",
    },
    {
      id: "capability",
      order: 2,
      title: "직무 역량",
      prompt: "지원 직무를 수행하기 위해 준비한 역량과 관련 경험을 작성해 주세요.",
      targetLength: 500,
      originalAnswer: capabilityOriginal,
      revisedAnswer: "저의 강점은 현장에서 관찰한 이상을 그대로 넘기지 않고 기준과 비교해 원인을 좁히는 실행력입니다. 현장실습 중 반복되는 조립 불량을 확인했을 때도 결과만 기록하는 데 그치지 않았습니다. 먼저 어느 작업 단계에서 이상이 발생하는지 확인하기 위해 검사 기준서의 항목을 작업 순서에 맞춰 다시 나눴습니다. 이후 작업 시간대와 담당자가 달라질 때 어떤 차이가 생기는지 관찰하고, 부품 방향 확인과 체결 순서가 일정하지 않다는 사실을 기록했습니다. 이 내용을 팀장에게 전달할 때는 작업자의 실수라고 단정하지 않고 기준서와 실제 과정에서 달랐던 부분을 함께 제시했습니다. 덕분에 작업자와 점검 순서를 조정하고 동일한 기준으로 시험할 수 있었습니다. 저는 이 과정에서 생산관리자는 문제를 가장 먼저 지적하는 사람이 아니라, 여러 부서가 납득할 수 있는 근거를 만들고 실행을 연결하는 사람이어야 한다고 배웠습니다. 현대모비스에서도 생산 실적과 품질 데이터를 정기적으로 확인하고 현장의 작은 이상과 비교하겠습니다. 문제가 발생하면 영향 범위를 먼저 구분하고 생산·품질·설비 담당자와 사실을 공유한 뒤 개선 조치와 확인 결과까지 기록하겠습니다. 이러한 방식으로 반복 문제를 줄이고 공정의 안정성을 높이는 생산관리자가 되겠습니다.",
      highlightedPhrases: ["차이를 기록해 불량 발생 구간을 좁혔습니다", "관찰 내용을 먼저 공유", "기준과 현장 정보를 함께 확인"],
      originalAnnotations: [
        annotate(capabilityOriginal, "capability-annotation-1", "문제 해결 능력과 소통 능력이 뛰어납니다", "vague", "역량을 나열만 해서 근거나 상황이 드러나지 않습니다."),
        annotate(capabilityOriginal, "capability-annotation-2", "팀장님께 공유하고 해결했습니다", "revise", "어떤 문제를 어떻게 해결했는지 구체적인 과정으로 다듬으면 좋습니다."),
      ],
      revisionReasons: ["추상적인 역량 표현 제거", "관찰·기록·공유·조정 행동을 순서대로 제시", "생산관리 직무에서 재사용 가능한 문제해결 방식 강조"],
      verificationNote: "본인이 직접 기록한 항목과 팀장에게 공유한 방식이 맞는지 확인해 주세요.",
    },
    {
      id: "collaboration",
      order: 3,
      title: "협업 경험",
      prompt: "협업 과정에서 발생한 문제를 해결한 경험을 작성해 주세요.",
      targetLength: 600,
      originalAnswer: collaborationOriginal,
      revisedAnswer: "팀 프로젝트 초기에 역할 범위를 정하는 과정에서 의견이 갈렸습니다. 일부 팀원은 익숙한 발표와 자료조사를 맡고 싶어 했고, 결과물 작성과 검증 업무는 담당자가 정해지지 않은 채 남아 있었습니다. 저는 단순히 업무를 같은 수로 나누면 마감 직전에 특정 인원에게 부담이 집중될 수 있다고 판단했습니다. 먼저 팀원별로 맡고 싶은 업무, 가능한 시간, 경험이 있는 작업을 표로 정리했습니다. 이어서 각 업무의 선행 관계와 마감 일정에 미치는 영향을 표시해 결과물 작성과 검증 담당자를 먼저 확정하자고 제안했습니다. 원하는 역할을 맡지 못한 팀원에게는 결정 이유를 설명하고, 발표 준비처럼 강점을 살릴 수 있는 업무를 함께 배치했습니다. 업무를 나눈 뒤에는 주 2회 진행 상황을 공유하고 완료 여부보다 막힌 부분을 먼저 이야기하도록 했습니다. 자료 정리가 늦어진 팀원이 생겼을 때도 책임을 묻기보다 다른 팀원이 확보한 자료를 공동 문서에 모으고 작성 범위를 다시 나눴습니다. 그 결과 특정 인원에게 일이 몰리지 않았고 정해진 일정 안에 결과물을 제출할 수 있었습니다. 이 경험을 통해 협업에서는 모두의 의견을 무조건 따르는 것보다 일정과 목표를 기준으로 역할을 투명하게 조정하는 것이 중요하다는 점을 배웠습니다. 입사 후에도 부서별 상황을 먼저 확인하고 공통 기준을 만들어 생산 일정과 개선 과제를 조율하겠습니다.",
      highlightedPhrases: ["가능한 시간을 표로 정리", "마감 일정에 영향을 주는 작업부터", "주 2회 진행 상황을 공유"],
      originalAnnotations: [
        annotate(collaborationOriginal, "collaboration-annotation-1", "대화를 통해 원만하게 해결했습니다", "delete", "무엇을 어떻게 대화했는지 없이 결과만 있어 신뢰도가 낮습니다. 구체적인 조정 과정으로 대체하는 걸 추천합니다."),
        annotate(collaborationOriginal, "collaboration-annotation-2", "서로 배려한 결과", "good", "협업의 태도를 짧게라도 드러낸 표현입니다."),
      ],
      revisionReasons: ["갈등을 조정한 판단 기준 제시", "협업 행동과 진행 관리 방식을 구체화", "확인 가능한 결과로 문단 마무리"],
    },
  ],
  requirementMatches: [
    {
      id: "requirement-1",
      requirement: "데이터 기반 공정 개선",
      status: "matched",
      evidence: "검사 기준과 실제 작업 순서를 대조하고 차이를 기록한 경험",
      recommendation: "현재 근거를 지원동기와 직무역량 문항에서 일관되게 유지하세요.",
    },
    {
      id: "requirement-2",
      requirement: "유관부서 및 현장 협업",
      status: "partial",
      evidence: "팀장과 작업자에게 관찰 내용을 공유한 경험",
      recommendation: "상대의 의견을 어떻게 반영했는지 한 문장 보완하면 좋습니다.",
    },
    {
      id: "requirement-3",
      requirement: "개선 결과 관리",
      status: "missing",
      evidence: "개선 이후 결과를 판단할 수 있는 확인 자료가 없음",
      recommendation: "수치를 추정하지 말고 기록, 피드백 또는 작업 방식의 실제 변화를 확인하세요.",
    },
  ],
  verificationQuestions: [
    "점검 순서를 변경한 뒤 불량 건수 또는 검사 시간이 실제로 달라졌나요?",
    "팀장이나 작업자가 변경된 방식에 대해 남긴 피드백이 있나요?",
  ],
  consultingAdvice: [],
  interviewQuestions: [
    {
      id: "interview-1",
      question: "검사 기준과 실제 작업 순서의 차이를 어떻게 발견했나요?",
      reason: "지원서에서 강조한 문제 발견 과정이 본인의 실제 행동인지 확인하기 위한 질문입니다.",
      answerGuide: ["처음 발견한 이상 징후", "확인한 자료와 관찰 과정", "본인이 직접 판단한 부분"],
      relatedQuestionId: "motivation",
    },
    {
      id: "interview-2",
      question: "작업자가 기존 방식 변경에 동의하지 않았다면 어떻게 설득했을까요?",
      reason: "현장 협업과 이해관계 조정 역량을 구체적으로 확인할 수 있습니다.",
      answerGuide: ["상대가 우려할 지점", "공유할 근거", "작게 시험할 수 있는 방법"],
      relatedQuestionId: "capability",
    },
    {
      id: "interview-3",
      question: "개선 효과를 수치로 확인하지 못한 이유와 다시 한다면 보완할 점은 무엇인가요?",
      reason: "확인되지 않은 성과를 과장하지 않으면서 학습 내용을 설명할 수 있는 질문입니다.",
      answerGuide: ["당시 측정하지 못한 이유", "대신 확인한 변화", "다음에는 기록할 지표"],
    },
  ],
};
