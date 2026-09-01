import type { ResultDocument, ResultQuestion } from "./result-document";
import type { FinalWrapUp, WrapUpItem } from "./final-wrap-up";

/**
 * 제출 전 보완.
 *
 * `제출 전 마무리`가 "확인이 필요합니다"로 남겨 둔 것들은 전부 **손님만 답을
 * 아는 사실**입니다. 이력서와 자소서 중 어느 수치가 맞는지, 그 서비스가 실제로
 * 돌아가는지 — AI가 채우면 그건 첨삭이 아니라 지어내기입니다.
 *
 * 그래서 두세 가지만 묻고, 받은 사실로 **그 문장만** 다시 씁니다.
 *
 * 전체를 다시 첨삭하지 않는 이유가 셋입니다. 이미 다듬어 놓은 문장이 다시
 * 흔들리고, 값이 한 번 더 들고, 무엇보다 손님이 "고칠수록 나빠졌다"고 느낄 수
 * 있습니다. 여기서 건드리는 것은 문제로 지목된 문장 하나뿐이고, 나머지는 읽지도
 * 않습니다.
 */

export type PatchQuestion = {
  itemId: string;
  headline: string;
  /** 지원서에서 뽑은 문제 문장. 없으면 물어볼 자리도 없습니다. */
  quote: string;
  todo: string;
  /** 두 문서가 다르게 적은 경우 그 둘. 비어 있으면 직접 적어야 합니다. */
  choices: string[];
  /** 첨삭본의 어느 문항에 있는지. 못 찾으면 null이고, 그때는 고칠 수 없습니다. */
  questionId: string | null;
};

export type PatchAnswer = { itemId: string; answer: string };

export type SentencePatch = {
  itemId: string;
  questionId: string;
  before: string;
  after: string;
};

/** 문장 끝으로 자릅니다. 마침표가 없는 줄도 있어 줄바꿈도 경계로 봅니다. */
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?。])\s+|\n+/).filter((piece) => piece.trim().length > 0);
}

function compact(value: string): string {
  return value.replace(/[\s"'`“”‘’.,!?·…]/g, "");
}

/**
 * 인용문이 첨삭본의 어느 문장인지 찾습니다.
 *
 * 인용은 원문에서 뽑은 것이라 첨삭본과 글자가 조금 다를 수 있습니다. 공백과
 * 문장부호를 걷어내고 비교하고, 그래도 못 찾으면 **못 찾았다고 답합니다** —
 * 비슷해 보이는 문장을 골라 고치면 엉뚱한 자리를 고치게 됩니다.
 */
export function locateQuote(
  questions: readonly ResultQuestion[],
  quote: string,
): { questionId: string; sentence: string } | null {
  const needle = compact(quote);
  if (needle.length < 8) return null;

  for (const question of questions) {
    for (const sentence of splitSentences(question.revisedAnswer)) {
      const hay = compact(sentence);
      if (hay.includes(needle) || (needle.length >= 20 && needle.includes(hay) && hay.length >= 12)) {
        return { questionId: question.id, sentence: sentence.trim() };
      }
    }
  }
  return null;
}

export function buildPatchQuestions(result: ResultDocument, wrapUp: FinalWrapUp): PatchQuestion[] {
  const needsAnswer = (item: WrapUpItem) => item.action === "NEEDS_APPLICANT" && item.quote;
  return wrapUp.items.filter(needsAnswer).map((item) => ({
    itemId: item.id,
    headline: item.headline,
    quote: item.quote as string,
    todo: item.todo,
    choices: item.choices,
    questionId: locateQuote(result.questions, item.quote as string)?.questionId ?? null,
  }));
}

/**
 * 고친 문장을 첨삭본에 끼워 넣습니다.
 *
 * 문자열 치환 하나입니다. 모델이 돌려준 문장을 통째로 믿고 문서를 다시 조립하는
 * 대신, **바꾸기로 한 그 문장이 실제로 거기 있는지 확인한 뒤**에만 바꿉니다.
 * 없으면 그 문항은 손대지 않습니다 — 첨삭본이 조용히 달라지는 것보다 하나
 * 못 고치는 편이 낫습니다.
 */
export function applyPatches(
  questions: readonly ResultQuestion[],
  patches: readonly SentencePatch[],
): ResultQuestion[] {
  return questions.map((question) => {
    const mine = patches.filter((patch) => patch.questionId === question.id);
    if (mine.length === 0) return question;

    let revised = question.revisedAnswer;
    for (const patch of mine) {
      if (!revised.includes(patch.before)) continue;
      revised = revised.replace(patch.before, patch.after);
    }
    return revised === question.revisedAnswer ? question : { ...question, revisedAnswer: revised };
  });
}

/** 실제로 문서가 달라진 것만 셉니다. 못 찾아 넘어간 것을 성과로 세지 않습니다. */
export function countAppliedPatches(
  questions: readonly ResultQuestion[],
  patches: readonly SentencePatch[],
): number {
  return patches.filter((patch) => {
    const question = questions.find((item) => item.id === patch.questionId);
    return Boolean(question && question.revisedAnswer.includes(patch.before));
  }).length;
}
