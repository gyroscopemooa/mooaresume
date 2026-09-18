import { resultDocumentSchema } from '../../../src/domain/result-document';
import type { Locale } from './i18n';
export function sampleResult(locale: Locale) {
  const en = locale === 'en';
  const pick = (ko: string, english: string) => en ? english : ko;
  return resultDocumentSchema.parse({
    schemaVersion: '1.0', caseId: 'illustrative-sample', product: 'PRO', isSample: true,
    company: pick('예시 기업', 'Example company'), role: pick('서비스 기획', 'Product planning'), applicationLabel: pick('지원동기 · 화면 예시', 'Motivation · UI example'), analyzedAt: '2026-09-18T00:00:00Z',
    analysisRun: { provider: 'mock', responseId: null, model: 'illustrative-copy', promptVersion: 'sample-v1', rubricVersion: 'sample-v1', schemaVersion: '1.0', inputTokens: null, outputTokens: null, totalTokens: null },
    readiness: { score: 0, label: pick('경험의 맥락을 더 선명하게', 'Give your experience a clearer context'), summary: pick('고객 피드백을 정리했던 경험이 강점입니다. 맡았던 역할을 먼저 보여주면 지원 직무와의 연결이 더 잘 드러납니다.', 'Your experience organizing customer feedback is a useful starting point. Lead with your role to make its relevance clearer.'), reasons: [pick('원문에 고객 의견 정리와 팀 공유 경험이 있습니다.', 'The draft describes organizing customer feedback and sharing it with the team.')] },
    attachments: [], candidateProfile: { snapshotLabel: 'Example', items: [] },
    priorities: [
      { id: 'p1', title: pick('추상적인 포부보다 실제 행동부터', 'Lead with what you did'), description: pick('“기여하고 싶다” 앞에 고객 의견을 정리한 경험을 배치하세요.', 'Place the customer-feedback example before your motivation.'), category: 'clarity', severity: 'high' },
      { id: 'p2', title: pick('나의 역할을 구체적으로', 'Clarify your contribution'), description: pick('어떤 기준으로 의견을 정리했는지 직접 확인해 보완하세요.', 'Add the criteria you actually used to organize the feedback.'), category: 'evidence', severity: 'medium' },
      { id: 'p3', title: pick('성과 수치는 확인 후 추가', 'Verify outcomes before adding them'), description: pick('확인된 성과 수치가 없어 새로 만들지 않았습니다.', 'No verified numerical outcome was provided, so none was added.'), category: 'verification', severity: 'medium' },
    ],
    questions: [{ id: 'q1', order: 1, title: pick('지원동기', 'Motivation'), prompt: pick('지원한 이유를 알려주세요.', 'Why are you applying?'), targetLength: 700,
      originalAnswer: pick('저는 고객의 의견이 중요하다고 생각합니다. 프로젝트에서 고객 피드백을 정리해서 팀에 공유했습니다. 이 경험을 바탕으로 서비스 기획에 기여하고 싶습니다.', 'I believe customer feedback matters. During a project, I organized customer feedback and shared it with the team. I would like to contribute to product planning.'),
      revisedAnswer: pick('프로젝트에서 고객 피드백을 정리하고 팀에 공유한 경험이 있습니다. 고객의 의견을 팀이 함께 살펴볼 수 있도록 정리했던 경험을 바탕으로, 서비스 기획 업무에 기여하고 싶습니다.', 'During a project, I organized customer feedback and shared it with my team. I would like to bring that experience of making customer input accessible to a product planning role.'), highlightedPhrases: [], revisionReasons: [pick('실제 행동을 첫 문장에 배치했습니다.', 'The revision opens with a concrete action.'), pick('원문에 없는 성과나 책임을 추가하지 않았습니다.', 'It adds no new achievements or responsibilities.')], verificationNote: pick('피드백 정리 기준과 본인의 구체적인 역할을 확인하세요.', 'Verify the organization criteria and your specific role.') }],
    requirementMatches: [], verificationQuestions: [pick('피드백을 정리할 때 어떤 기준을 사용했나요?', 'What criteria did you use to organize the feedback?')],
    interviewQuestions: [{ id: 'i1', question: pick('고객 의견을 팀에 공유할 때 중요하게 생각한 점은 무엇인가요?', 'What mattered most when you shared feedback with the team?'), reason: pick('원문에 있는 실제 경험의 판단 기준을 확인하는 질문입니다.', 'This explores your decision process in the experience you described.'), answerGuide: [pick('실제로 했던 일을 순서대로 설명하세요.', 'Explain what you actually did, in order.'), pick('확인되지 않은 수치를 넣지 마세요.', 'Do not add unverified metrics.')] }],
  });
}
