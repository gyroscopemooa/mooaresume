import type { AnalysisRequest } from "@/application/analysis-contract";
import { getAnalysisQuestions, SUPPORTING_KINDS } from "./questions";
import type { QuickAnalysisOutput } from "./schema";

// Complete sentences let us stop at the requested limit without breaking a sentence.
const sentences = [
  "업무를 맡을 때 제가 중요하게 생각하는 것은 함께 일하는 사람이 같은 기준으로 상황을 이해할 수 있게 하는 일입니다.",
  "여러 사람이 나누어 처리하는 일에서는 각자 맡은 부분을 마쳤더라도 다음 사람이 무엇을 이어서 해야 하는지 알기 어려울 수 있습니다.",
  "예를 들어 요청 사항이 서로 다른 곳에 기록되어 있다면 먼저 원래 요청을 다시 읽고 반드시 지켜야 할 조건과 조정할 수 있는 조건을 구분하겠습니다.",
  "이어서 처리 순서를 정한 이유를 짧게 적어 두고 제 판단만으로 결정하기 어려운 사항은 담당자에게 확인하겠습니다.",
  "같은 표현을 다르게 이해하는 동료가 있다면 제가 파악한 내용을 구체적인 상황에 대입해 설명하고 상대방이 기대하는 결과와 일치하는지 묻겠습니다.",
  "진행 중에 조건이 바뀌면 처음 정한 일정만 고수하기보다 변경으로 영향을 받는 사람과 먼저 상의해 남은 일을 다시 나누겠습니다.",
  "다음 담당자에게 넘길 때에는 끝낸 작업과 아직 결정되지 않은 사항을 구분해 누구에게 무엇을 확인하면 되는지 함께 전달하겠습니다.",
  "마무리 단계에서는 요청을 처음 접한 사람의 입장에서 결과를 다시 살펴보고 설명 없이 이해하기 어려운 부분이 있는지 확인하겠습니다.",
  "특히 반복해서 질문이 나오는 지점은 개인의 실수로만 여기지 않고 안내 문장이나 업무 순서를 바꾸면 해결할 수 있는지 검토하겠습니다.",
  "이 과정을 통해 얻고 싶은 변화는 기록 자체가 늘어나는 것이 아니라 필요한 사람이 필요한 시점에 정확한 정보를 찾을 수 있게 되는 것입니다.",
  "입사 후에는 먼저 현장에서 사용하는 용어와 협업 방식을 익히고 작은 업무에서부터 동료의 피드백을 받아 제 일하는 방식을 조정하겠습니다.",
  "주어진 역할을 충실히 수행하면서도 고객이나 동료가 다음 단계에서 겪을 어려움을 미리 생각하는 구성원으로 성장하겠습니다.",
];

const size = (text: string) => text.replace(/\s/g, "").length;

function extendExample(answer: string, target: number, offset: number) {
  let addition = "";
  const separator = answer ? "\n\n" : "";
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[(i + offset) % sentences.length];
    if (answer.includes(sentence)) continue;
    const proposed = (addition + " " + sentence).trim();
    if (size(answer + "[임의 예시·교체 필요: " + proposed + "]") <= target) addition = proposed;
  }
  return addition ? answer + separator + "[임의 예시·교체 필요: " + addition + "]" : answer;
}

const note = "비교할 경험 자료가 부족해 표시된 부분은 임의로 작성했습니다. 제출 전 본인의 역할과 행동으로 교체해 주세요.";

export function numericBuildExample(request: AnalysisRequest): QuickAnalysisOutput | null {
  if (request.product !== "PRO" || request.writingMode !== "BUILD" || request.documents.some(doc => SUPPORTING_KINDS.some(kind => kind === doc.kind) && /\p{L}/u.test(doc.text))) return null;
  const questions = getAnalysisQuestions(request);
  if (!questions.length || questions.some(q => /[\p{L}]/u.test(q.answer))) return null;
  const revisions = questions.map((q, i) => ({ questionOrder: q.order, subheading: null, revisedAnswer: extendExample("", q.targetLength, i * 3), originalAnnotations: [], highlightedPhrases: [], lengthNote: null, verificationNote: note, reasons: [] }));
  if (revisions.some((r,i) => size(r.revisedAnswer) < Math.ceil(questions[i].targetLength * 0.7))) return null;
  return { schemaVersion: "1.0", priorities: [], readiness: { score: 0, label: "자료 확인 필요", summary: note, reasons: ["입력 자료에서 경험을 확인할 수 없습니다."] },
    revisions, revision: revisions[0], verificationQuestions: ["어떤 일을 맡았고, 직접 선택한 행동과 그 결과는 무엇인가요?"] };
}

export function fitBuildRevisions(request: AnalysisRequest, output: QuickAnalysisOutput): QuickAnalysisOutput {
  if (request.product !== "PRO" || request.writingMode !== "BUILD") return output;
  const questions = getAnalysisQuestions(request);
  const original = output.revisions ?? (output.revision ? [{ ...output.revision, questionOrder: 1 }] : []);
  if (!original.length) return output;
  const revisions = original.map(rev => {
    const question = questions.find(q => q.order === rev.questionOrder);
    if (!question || !rev.revisedAnswer) return rev;
    const target = question.targetLength;
    let answer = rev.revisedAnswer;
    if (size(answer) > target) {
      // Remove illustrative material first. Keep complete original sentences.
      const plain = answer.replace(/\[임의 예시·교체 필요:[^\]]+\]/g, "").trim();
      if (size(plain) <= target) answer = plain;
      else {
        const parts = plain.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) ?? [];
        let prefix = "";
        for (const part of parts) {
          if (size(prefix + part) > target) break;
          prefix += part;
        }
        if (size(prefix) >= Math.ceil(target * 0.7)) answer = prefix.trim();
      }
    }
    if (size(answer) < Math.ceil(target * 0.7)) answer = extendExample(answer, target, rev.questionOrder * 3);
    if (answer === rev.revisedAnswer) return rev;
    return { ...rev, revisedAnswer: answer, verificationNote: answer.includes("[임의 예시·교체 필요:") ? note : rev.verificationNote, highlightedPhrases: rev.highlightedPhrases.filter(p => answer.includes(p)) };
  });
  return { ...output, revisions, revision: revisions[0] };
}
