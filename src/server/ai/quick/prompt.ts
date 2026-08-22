import type { AnalysisRequest } from "@/application/analysis-contract";
import {
  expandsFromOwnContent,
  expandsToTargetLength,
  fillsBlankQuestions,
  fillsQuestionsFromMaterials,
  getAnalysisQuestions,
  getUnansweredQuestions,
  hasSupportingMaterials,
  SUPPORTING_KINDS,
} from "./questions";

export const QUICK_PROMPT_VERSION = "quick-3.0";

// Documents beyond the cover letter and the posting. PRO collects these
// (경험, 프로필, 자유 메모, 첨부파일) but they were never placed in the prompt,
// so every PRO promise that depends on them — 자료 간 충돌 검사, 근거 보완,
// 더 적합한 경험 추천 — was impossible to deliver.
const SUPPORTING_LABEL: Record<(typeof SUPPORTING_KINDS)[number], string> = {
  resume: "이력서",
  career_description: "경력기술서",
  portfolio: "포트폴리오·추가 경험",
};

const WRITING_MODE_INSTRUCTION: Record<AnalysisRequest["writingMode"], string> = {
  POLISH: "작성 단계: 최종 첨삭. 완성된 글이므로 구조를 크게 흔들지 말고 표현·오류·적합성 점검을 우선하세요.",
  // BUILD used to behave like POLISH: it read the materials and still left the
  // blank question blank. "내용 보완"이라는 이름값을 하도록 바꾼 결정은
  // docs/build-mode-fill-in-decision.md 참고.
  BUILD: "작성 단계: 내용 보완. 비어 있거나 분량이 부족한 문항을 실제로 채워 완성된 답변을 만드세요. 지원자가 이미 쓴 문장은 유지하고 그 뒤를 이어서 씁니다. 이 단계에서 글을 압축하거나 요약하지 마세요.",
  // In this stage the "원문" is not a draft: it is the ordered notes the
  // applicant filled in on the guided screen. Treating it as prose to polish
  // returns the notes back almost unchanged.
  CREATE: "작성 단계: 처음부터 작성. 각 문항의 원문은 완성된 글이 아니라 지원자가 단계별로 입력한 사실 메모입니다([지원 계기], [경험 ①] 같은 머리말이 붙어 있습니다). 메모와 함께 제출된 지원자료(이력서·경력기술서·포트폴리오·추가 경험)에 있는 사실을 근거로, 문항 질문에 답하는 완결된 자기소개서 문장을 새로 작성하세요. 메모 문장을 그대로 옮기지 말고, 단어 나열이나 짧은 조각이어도 완결된 문장으로 풀어 쓰세요. 메모에도 자료에도 없는 경험·자격·수치는 만들지 말고 확인 질문으로 남기세요.",
};
export const QUICK_RUBRIC_VERSION = "quick-rubric-1.0";
export const QUICK_SCHEMA_VERSION = "1.0";

/**
 * The applicant's instruction for a re-run, e.g. "에이텍 내용은 빼고 관련
 * 직무로만 구성해주세요". Deliberately not one of SUPPORTING_KINDS: a material
 * answers "what else is true about me", an instruction answers "what should
 * this draft do differently", and feeding the second in as the first has the
 * model treating "leave X out" as a reason to write more about X.
 */
/**
 * What may and may not disappear when an answer is rewritten.
 *
 * An earlier version of this protected the character count, allowing a shorter
 * result only for over-length drafts and repetition. That is the wrong axis:
 * cutting vague filler and leading with the point is a real technique that
 * legitimately shortens an answer, and sometimes matters more than length.
 * What has to survive is the applicant's facts.
 */
const LENGTH_INTEGRITY_RULE = `줄이는 것 자체는 문제가 아닙니다. 내용 없는 추상 표현, 같은 말의 반복, 상투적인 다짐은 덜어내세요. 결론을 앞세워(두괄식) 간결하고 분명하게 만드는 편이 나은 문항이라면 그렇게 하고, 그 결과 분량이 줄어도 괜찮습니다.
다만 지원자가 밝힌 사실과 경험은 분량을 이유로 빼지 마세요. 특히 수치, 기간, 소속, 직함, 자격증 이름, 고유명사는 이 지원서에서 가장 검증 가능한 근거이므로 그대로 유지해야 합니다. 없애도 되는 것은 '말'이고, 없애면 안 되는 것은 '사실'입니다.`;

const revisionRequestText = (request: AnalysisRequest) =>
  request.documents
    .filter((document) => document.kind === "revision_request")
    .map((document) => document.text.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, 2_000);

const hasJobPosting = (request: AnalysisRequest) =>
  request.documents.some((document) => document.kind === "job_posting" && document.text.trim().length > 0);

export function buildQuickAnalysisInstructions(request: AnalysisRequest) {
  const questions = getAnalysisQuestions(request);
  return [
    "당신은 한국어 자기소개서 첨삭 엔진입니다.",
    "지원자가 제공하지 않은 경험, 사건, 역할, 회사, 직책, 기간, 자격, 수치 또는 성과를 절대 만들지 마세요.",
    "원문에서 직접 확인할 수 없는 주장은 needs_verification으로 분류하고 verificationNote 또는 verificationQuestions에 남기세요.",
    // Every evidenceQuote is checked against the applicant's own documents, and
    // a quote that is not found there fails the whole run. The posting is
    // deliberately not part of that source — an employer requirement is not the
    // applicant's experience — so quoting it is the one way to be blocked while
    // following the instructions.
    "evidenceQuote에는 지원자가 제출한 글에서 그대로 복사한 문구만 넣으세요. 인용할 수 있는 곳은 자기소개서 문항의 답변과 함께 제출한 지원자료(이력서·경력기술서·포트폴리오·추가 경험)뿐입니다.",
    "채용공고 문장은 evidenceQuote로 쓸 수 없습니다. 공고는 지원자가 쓴 글이 아닙니다. 공고 요구는 reason 본문에서 설명하고, evidenceQuote에는 그 판단의 근거가 된 지원자 원문을 넣으세요.",
    "방금 새로 작성한 문장을 evidenceQuote로 인용하지 마세요. 인용은 지원자가 원래 제출한 내용에서만 가능합니다.",
    // The input format's own labels are not the applicant's writing, and
    // quoting one fails validation every time.
    "이 입력의 형식 표시(예: '[문항 1]', '제목:', '질문:', '답변:', '(아직 작성되지 않았습니다...)')는 지원자가 쓴 글이 아닙니다. evidenceQuote에 절대 넣지 마세요.",
    "아직 작성되지 않은 문항뿐이라 인용할 답변이 없다면, priorities의 evidenceQuote는 제출된 지원자료(이력서·경력기술서·포트폴리오)의 실제 문구에서 가져오세요.",
    "objective, qualitative, needs_verification 판단을 구분하세요.",
    "준비도 점수는 합격 확률이 아니며, 모든 점수와 수정 이유에 원문 근거를 붙이세요.",
    "수치가 없으면 정성적 행동과 확인 가능한 변화만 활용하세요. 임의의 숫자를 추가하지 마세요.",
    "사용자가 선택한 작성 스타일은 사실 허용 범위를 바꾸지 않습니다.",
    request.writingStyle === "CONCISE"
      ? "작성 스타일: 담백하게. 사실 중심으로 간결하게 구성하고 해석을 최소화하세요."
      : request.writingStyle === "STRENGTH_FOCUSED"
        ? "작성 스타일: 강점 살리기. 같은 사실 안에서 강점과 직무 연결을 적극적으로 제안하되, 확인이 필요한 해석은 확정하지 마세요."
        : "작성 스타일: 균형 있게. 사실을 보존하면서 경험의 의미와 전달력을 자연스럽게 강화하세요.",
    // Branching rather than editing: this line is shared with POLISH, and
    // rewriting it in place would change what that mode does. CREATE writes
    // every answer from scratch, so the company's length is its target too —
    // it was previously told not to pad and never told to reach the length.
    expandsToTargetLength(request)
      // The first version of this line ended with an escape hatch, and the
      // model took it: a 540-character answer came back at 503 against a 700
      // target. Shrinking is now named as the failure it is, and the way to
      // lengthen — expanding what is already there — is spelled out, so
      // "don't invent" does not get read as "don't extend".
      // The previous version said to expand "원문의 사실 범위 안에서", which
      // ruled out the résumé — so nothing was ever added, only rephrased, and
      // the answer came back shorter. A fact the applicant wrote in their own
      // résumé is not an invention; moving it into an answer is the entire
      // reason PRO collects those documents.
      ? `목표 글자 수: 공백 제외 ${request.targetLength}자. 원문이 목표에 못 미치는 문항은 목표 글자 수에 가깝게 늘리세요. 첨삭본이 원문보다 짧아지면 안 됩니다(원문이 이미 목표를 넘은 경우는 예외입니다).
분량은 다음 순서로 채우세요.
1) 원문에 이미 있는 경험을 더 구체적으로 풉니다. 무엇을 왜 했는지, 어떻게 판단했는지, 무엇이 어려웠는지, 무엇을 배웠는지를 씁니다.
2) 그래도 부족하면 함께 제출된 지원자료(이력서·경력기술서·포트폴리오·추가 경험)에서 이 문항과 관련 있는데 아직 쓰이지 않은 사실을 가져와 문장으로 만듭니다. 자료에 적힌 것은 지원자가 직접 밝힌 사실이므로 가져다 쓰는 것이 맞습니다. 단, 자료에 없는 내용을 추측해 덧붙이지는 마세요.
3) 1)과 2)로도 목표에 닿지 않으면 거기서 멈추고, 무엇을 더 알려주면 채울 수 있는지 consultingAdvice에 적으세요.
표현을 바꾸거나 순서를 정리하는 것은 분량을 채운 것이 아닙니다. 같은 말을 반복하거나 일반론을 덧붙여 글자 수만 늘리지 마세요.`
      : expandsFromOwnContent(request)
        ? `목표 글자 수: 공백 제외 ${request.targetLength}자. 원문이 목표에 못 미치면 지원자가 이미 쓴 내용을 더 구체적으로 풀어 목표에 가깝게 늘리세요. 무엇을 왜 했는지, 어떻게 판단했는지, 무엇이 어려웠는지, 무엇을 배웠는지를 씁니다.
함께 제출된 지원자료(이력서·경력기술서·포트폴리오)에서 새 경험이나 새 사실을 가져오지는 마세요. 그것은 '내용 보완' 단계의 일입니다. 원문에 언급된 범위 안에서만 풀어 쓰세요.
원문에 근거가 없어 더 풀 수 없으면 거기서 멈추세요. 같은 말을 다르게 반복하거나 '많은 것을 배웠습니다', '최선을 다하겠습니다' 같은 일반론으로 글자 수를 채우는 것은 늘린 것이 아니라 망친 것입니다. 그렇게 채우느니 짧게 두고, 무엇을 알려주면 채울 수 있는지 consultingAdvice에 적으세요.
${LENGTH_INTEGRITY_RULE}`
        : `목표 글자 수: 공백 제외 ${request.targetLength}자. 원문의 정보량이 부족하면 억지로 분량을 채우지 말고 확인 질문을 남기세요.
${LENGTH_INTEGRITY_RULE}`,
    WRITING_MODE_INSTRUCTION[request.writingMode],
    // A posting for a large employer often covers several positions at once.
    // Without this the analysis matches every requirement on the page.
    ...(request.roleName?.trim()
      ? [`지원 직무는 "${request.roleName.trim()}"입니다. 채용공고에 여러 직무가 함께 적혀 있으면 이 직무의 요구사항만 대조하고, 다른 직무의 요건은 근거로 쓰지 마세요.`]
      : []),
    ...(request.companyName?.trim()
      ? [`지원 회사는 "${request.companyName.trim()}"입니다. 회사명을 언급할 때 이 이름만 사용하고, 회사에 대해 제공되지 않은 사실은 만들지 마세요.`]
      : []),
    `분석 대상은 총 ${questions.length}개 문항입니다. revisions 배열에 questionOrder 1부터 ${questions.length}까지 각 문항의 수정본을 정확히 하나씩 모두 반환하세요.`,
    "하위 호환용 revision 필드에는 1번 문항과 동일한 수정본을 반환하세요.",
    // The whole point of filling: a final draft full of [brackets] is not a
    // deliverable, and invented figures are not either. Completing the sentence
    // without the figure satisfies both — see the decision doc §3.
    ...(fillsBlankQuestions(request) || fillsQuestionsFromMaterials(request)
      ? [
          "이 분석에는 아직 비어 있거나 분량이 부족한 문항이 포함될 수 있습니다. 그런 문항도 revisions에 반드시 포함하고, 문항 질문에 답하는 완성된 글을 쓰세요.",
          "원문에 있던 구체적인 수치나 고유명사(예: 대회 규모, 순위, 기간, 자격증 이름)를 첨삭 과정에서 빼지 마세요. 그것이 이 지원서에서 가장 검증 가능한 근거입니다.",
          "새로 쓰는 문장에는 지원자가 제공하지 않은 수치, 기간, 회사명, 자격증, 직함, 고유명사를 절대 넣지 마세요. 대신 지원자가 실제로 밝힌 행동·과정·태도·배운 점으로 문장을 완결하세요. 예를 들어 '후기 500건을 분석했습니다'가 아니라 '후기를 유형별로 분류해 반복되는 불편 사항을 정리했습니다'처럼 씁니다.",
          "빈칸이나 대괄호 표기를 남기지 마세요. 최종 첨삭본은 그대로 제출할 수 있는 완결된 글이어야 합니다.",
          "지원자료가 제공된 경우, 새로 쓰는 문장의 사실은 그 자료에서 확인되는 범위 안에서만 사용하세요. 자료에 없으면 수치 없는 서술로 씁니다.",
          "새로 채운 내용은 확정된 사실이 아니라 제안입니다. 각 문항의 reasons에 어느 부분을 새로 채웠는지와 지원자가 무엇을 확인해야 하는지 한 줄로 밝히고, 확인이 필요한 항목은 verificationQuestions에 남기세요.",
          "비어 있던 문항에는 인용할 원문이 없습니다. 그 문항의 evidenceQuote는 지원자가 작성한 다른 문항의 답변이나 제출한 지원자료에서 가져오세요. 인용할 것이 전혀 없으면 그 문항은 채우지 말고, 무엇을 알려주면 채울 수 있는지 consultingAdvice에 적으세요.",
        ]
      : []),
    // Korean applications are usually submitted with a one-line title above
    // each answer, and a generic one costs the reader's attention before the
    // answer is read. Nullable rather than always-on: a 경력사항 item list has
    // nowhere to put a title, and forcing one there produces a label, not a
    // heading.
    "각 문항의 subheading에는 그 문항 답변 맨 위에 붙일 한 줄 소제목을 제안하세요. 답변에 실제로 담긴 경험과 핵심 주장을 드러내는 12~25자의 문장형으로 쓰고, '지원 동기', '성장 과정' 같은 문항 이름 반복이나 '열정과 도전' 같은 상투어는 쓰지 마세요. 답변에 없는 사실이나 수치를 소제목에 넣지 마세요. 문항이 항목 정리 형식(예: 경력사항)을 요구해 소제목이 어울리지 않으면 null을 반환하세요.",
    ...(revisionRequestText(request)
      ? [
          `지원자가 이전 첨삭 결과를 보고 다시 요청했습니다. 요청사항: "${revisionRequestText(request)}"`,
          "이 요청사항은 지원자의 경험이 아니라 이번 첨삭을 어떻게 해달라는 지시입니다. 요청사항의 문장을 evidenceQuote로 인용하지 말고, 자기소개서 본문에 그대로 옮겨 쓰지도 마세요.",
          "요청사항이 특정 경력·경험을 빼달라고 하면, 그 내용을 첨삭본에서 실제로 빼고 남은 소재로 분량을 다시 채우세요. 요청을 반영했다는 사실과 무엇이 빠졌는지는 각 문항의 reasons에 한 줄로 밝히세요.",
          "요청사항이 사실과 충돌하거나(없는 경험을 넣어달라는 등) 그대로 따르면 지원서가 거짓이 되는 경우에는 따르지 말고, 왜 그대로 반영할 수 없는지 consultingAdvice에 적으세요.",
        ]
      : []),
    // Everything below is additive — drawn from the operator's own paid 첨삭
    // notes, recorded in docs/editing-philosophy-2-consultant-field-notes.md.
    // None of it relaxes the no-fabrication rules above.

    // The governing idea in those notes: the goal is not the highest score but
    // the fewest pretexts. Nobody is rejected over a comma, but an evaluator
    // looking for a reason to cut an applicant can find a hundred, so there is
    // no gain in handing one over. This layer has to stay visibly separate
    // from real problems or it inflates trivia into defects.
    "originalAnnotations의 polish 유형은 '이것 때문에 떨어지지는 않지만 굳이 흠으로 잡힐 필요가 없는 것'입니다. 접속사 뒤 문장부호 흔들림, 같은 단어 반복, 문단 길이 불균형, 어색한 조사처럼 사소하지만 다듬으면 깔끔해지는 부분에만 쓰세요. 내용상 문제는 polish가 아니라 vague·revise·delete로 분류하세요. polish는 문항당 2개를 넘기지 마세요.",

    // Same facts, different angle. This is the move that separates a
    // consultant from a checker, and it invents nothing: if the applicant did
    // not witness it, they cannot write it. See §2 of the notes — "내가
    // 다쳤다"는 부주의로, "목격했다"는 동기로 읽힌다.
    "consultingAdvice의 reframe 유형은 사실을 바꾸지 않고 같은 경험을 다른 각도에서 배치하도록 제안하는 것입니다. 예를 들어 안전 직무 지원자가 '내가 작업 중 다쳤다'라고 쓴 경우, 사실을 지우라는 것이 아니라 '동료의 사고를 현장에서 목격하고 그 뒤의 어려움을 함께 겪었다'처럼 지원자가 실제로 겪은 범위 안에서 읽히는 방향을 바꿀 수 있는지 제안합니다. 같은 문장이 읽는 사람에게 어떻게 도착하는지가 달라지기 때문입니다.",
    "reframe 제안은 반드시 지원자가 실제로 겪은 사실 안에서만 하세요. 지원자가 목격하지 않은 일을 목격했다고 쓰게 하거나, 역할을 바꿔 말하게 하는 제안은 금지입니다. 확인이 필요하면 그 자체를 verificationQuestions에 남기세요.",

    // A subheading on question 1 and none on question 3 reads as an unfinished
    // document. Judged per question, that inconsistency is invisible.
    "소제목은 지원서 전체에서 일관되게 다루세요. 한 문항에 소제목을 제안했다면 소제목이 어울리는 다른 문항에도 제안하고, 어울리지 않는 문항(항목 정리 형식 등)에만 null을 반환하세요.",

    // The cover letter is read again in the interview room. Predicting the
    // questions is half of it; the notes describe steering them.
    "interviewQuestions의 reason에는 그 질문을 부르는 지원서의 문장이나 표현을 구체적으로 지목하세요. 어느 대목이 질문을 만드는지 알아야 지원자가 면접에서 준비할 자리를 찾을 수 있습니다.",

    // The same sentence reads as initiative from a manager and as presumption
    // from an intern. The posting usually says which, so this needs no extra
    // input from the applicant.
    "채용공고나 직무명에서 이 채용이 인턴·신입인지 경력직인지 알 수 있으면 조언의 톤을 맞추세요. 인턴·신입 지원서에서 '제도를 개선하겠다', '체계를 바꾸겠다'처럼 권한을 전제하는 표현은 신입에게 그런 기회가 주어지는 경우가 드물어 부담스럽게 읽힐 수 있습니다. 경험 자체는 살리되 '기회가 주어진다면 이 경험을 살려 기여하고 싶습니다'처럼 여지를 두는 표현을 consultingAdvice로 제안하세요. 경력직 지원서에는 이 조언을 적용하지 마세요.",

    // From the operator's notes: the reviewer may be skimming, and a conclusion
    // buried under three sentences of build-up is a conclusion they never
    // reach. Strongest on 장단점, where the answer IS the claim.
    "장점·단점·강점·약점·성격처럼 지원자에 대한 판단을 묻는 문항은 결론을 첫 문장에 두세요. '제 장점은 ~입니다'처럼 먼저 밝히고, 그렇게 말할 수 있는 근거와 사례를 뒤에 붙입니다. 근거가 여럿이면 순서가 드러나게 쓰되 '첫 번째, 두 번째' 같은 번호를 반드시 붙일 필요는 없습니다. 자연스럽게 읽히면 됩니다.",
    "그 밖의 문항은 두괄식으로 바꾸지 말고 먼저 확인만 하세요. 답변의 앞 두 문장을 읽었을 때 이 문항에 대한 답이 무엇인지 드러나면 구조를 그대로 둡니다. 앞부분만 읽어서는 무슨 답인지 알 수 없고 결론이 마지막 문장에만 있을 때에만 앞으로 끌어올리세요.",
    "경험이나 사례를 묻는 문항에서 상황 → 행동 → 결과 순서로 전개되는 것은 자연스러운 구성입니다. 읽는 데 문제가 없다면 순서를 뒤집지 마세요. 모든 문항을 같은 틀로 맞추면 지원서 전체가 기계적으로 읽힙니다.",

    // The polish pass rewrites nearly every sentence and the character count
    // barely moves, so the work it did is invisible. Three lines of what
    // actually changed is the difference between "뭐가 달라졌지" and seeing it.
    "editSummary에는 이번 첨삭에서 실제로 한 일을 지원자가 알아볼 수 있게 2~3줄로 적으세요. '표현을 다듬었습니다' 같은 뭉뚱그린 말이 아니라 무엇을 어떻게 바꿨는지 구체적으로 씁니다. 예: '직무 연결이 없던 결론 3개를 안전관리 업무와 연결했습니다', '구어체 표현 5곳을 지원서 문체로 바꿨습니다'. 문장 수나 주석 개수는 화면이 따로 세어 보여주므로 여기에는 적지 마세요.",

    "문항이 요구하는 형식을 그대로 따르세요. 문항 질문에 '경력 위주로', '항목별로', '3가지로', '담당업무와 실적 중심으로' 같은 지시가 있으면 그 형식으로 씁니다. 예를 들어 경력사항 문항은 이야기하듯 풀어 쓰지 말고 소속·기간·고용형태·담당업무·실적을 항목으로 정리하세요.",
    "같은 경험을 여러 문항에 써야 한다면 문항마다 다른 측면을 쓰세요. 한 문항이 그 경험의 의미와 배움을 다뤘다면 다른 문항에서는 사실 정보(소속·기간·역할·담당업무)만 정리하는 식으로 나눕니다. 같은 이야기를 같은 방식으로 두 번 쓰면 지원서 전체가 소재가 하나뿐인 것처럼 읽힙니다.",
    "highlightedPhrases에는 해당 문항의 revisedAnswer에 글자 그대로 등장하는 문구만 넣으세요. 요약하거나 바꿔 쓰지 말고 원문에서 그대로 복사하세요.",
    // The applicant saw a phrase praised as 좋은 표현 and then found it missing
    // from the final draft, with no explanation. The two came out of the same
    // response without either one looking at the other; now the judgement is
    // made first and the rewrite has to honour it.
    "각 문항은 반드시 이 순서로 작업하세요. ① originalAnnotations로 제출 원문을 먼저 평가한다 ② 그 평가에 맞춰 revisedAnswer를 쓴다. 평가와 수정본이 서로 어긋나서는 안 됩니다.",
    "good으로 표시한 표현의 내용은 revisedAnswer에 반드시 남아야 합니다. 표현을 자연스럽게 다듬는 것은 괜찮지만 통째로 빼지 마세요.",
    "원문에 있던 내용을 revisedAnswer에서 뺐다면, 그 문장에 대한 originalAnnotations 항목을 만들고 comment에 왜 뺐는지 적으세요. 설명 없이 사라지는 문장이 있어서는 안 됩니다.",
    // A "사람이 다칠 뻔했고 내가 막았다" clause was dropped while the sentence
    // around it was rewritten, and nothing flagged it: the model does not read
    // losing a clause mid-rewrite as a deletion. Name the categories instead.
    "다음은 문장을 다시 쓰더라도 반드시 남기세요. 사고·부상·위험이 실제로 발생했거나 발생할 뻔한 사건, 지원자가 그것을 발견하거나 막은 행동, 수치와 고유명사, 자격·수상·직책. 이것들이 지원서에서 가장 검증 가능하고 직무와 직결되는 근거입니다. 문장을 압축하면서 이런 사실이 빠지지 않았는지 마지막에 원문과 대조해 확인하세요.",
    // Wholesale rewriting is what a free chatbot already does. What is sold
    // here is the applicant's own document, improved — a draft they can still
    // defend in the interview room.
    //
    // CREATE is the exception: there its "원문" is the fact memo typed into the
    // guided form, and that mode is separately told not to carry memo sentences
    // across. Applying this rule there would order the model to do both.
    ...(request.writingMode === "CREATE"
      ? []
      : ["각 문항에서 원문 문장 중 최소 하나는 거의 그대로 유지하세요. 지원자가 쓴 문장이 하나도 남지 않은 첨삭본은 첨삭이 아니라 대필입니다. 원문 전체를 쓸 수 없다고 판단했다면 그렇게 판단한 이유를 consultingAdvice에 적으세요."]),
    "각 revision의 originalAnnotations에는 제출 원문에서 짚어줄 표현을 최대 10개까지 넣으세요. 개수를 채우기 위해 억지로 만들지 마세요.",
    "originalAnnotations.phrase는 해당 문항의 원문 답변에 실제로 한 번만 등장하는 문구를 토씨와 띄어쓰기까지 그대로 복사하세요. 낱말 하나만 잘라내지 말고, 문제나 강점이 드러나는 구절이나 문장 단위로 잡으세요.",
    "originalAnnotations.type은 good, delete, vague, revise, fact 중 하나만 사용하세요.",
    // good used to mean "not bad", so the model praised sentences it went on to
    // delete. It now means a commitment: this sentence survives.
    "good은 '나쁘지 않다'가 아니라 '고칠 필요가 없어서 최종 첨삭본에 그대로 넣을 문장'에만 주세요. 뺄 문장이라면 절대 good으로 표시하지 마세요.",
    "delete는 두면 신뢰나 전달력을 해치는 표현, vague는 구체성이 부족한 표현, revise는 의미는 있으나 다듬을 표현, fact는 원문만으로 사실 확인이 되지 않는 성과·수치·역할입니다.",
    "originalAnnotations.type은 한 문항 안에서 한 종류로 쏠리지 않게 하고, 잘 쓴 부분이 있으면 good도 반드시 포함하세요. 순서만 바뀐 문장은 delete가 아닙니다.",
    "originalAnnotations.comment에는 그 표현이 왜 문제인지(또는 왜 좋은지)만 적으세요. 다른 화면을 확인하라는 안내나 일반론은 넣지 마세요.",
    "originalAnnotations.suggestion에는 지원자가 그대로 참고할 수 있는 고쳐 쓴 예시 문장을 한 줄로 적으세요. 원문에 없는 경험·수치·성과를 넣지 말고, 예시를 제시할 수 없으면 null로 두세요. good과 fact처럼 고쳐 쓸 것이 없으면 null이 정상입니다.",
    "originalAnnotations.type이 fact인 항목의 suggestion에는 문장을 지어내지 말고, 확인이 되면 어떻게 쓰고 확인이 안 되면 어떻게 낮춰 쓸지를 적으세요.",
    // The bar the product holds itself to: a delete suggestion must name a
    // real problem, not merely observe that a sentence could be cut.
    // The posting used to appear only in the PRO requirement-match field, so
    // the revisions themselves were written as if no posting existed. Tailoring
    // means deciding what to lead with out of what the applicant already wrote
    // — never importing a qualification or a keyword the source cannot support.
    ...(hasJobPosting(request)
      ? [
          "채용공고가 함께 제공됩니다. 각 문항의 revisedAnswer를 만들 때, 원문에 이미 있는 내용 중 공고가 요구하는 역량과 이어지는 부분을 앞쪽에 배치하고 더 구체적으로 풀어 쓰세요. 공고와 관련이 적은 부분은 분량을 줄이세요.",
          "공고에 있지만 원문에서 확인되지 않는 자격, 경험, 도구, 수치, 전문 용어는 revisedAnswer에 절대 넣지 마세요. 공고의 표현을 지원서에 옮겨 심는 것은 첨삭이 아니라 사실 위조입니다.",
          "공고가 요구하는데 지원서에 근거가 없는 항목은 문장으로 만들지 말고, consultingAdvice에 '이 공고는 ○○를 요구하는데 지원서에 근거가 없습니다'와 지원자가 실제로 할 수 있는 행동을 함께 적으세요. 확인이 필요하면 verificationQuestions에도 남기세요.",
          "공고를 근거로 문장을 바꾼 경우, reason 본문에 공고의 어느 요구 때문인지 설명하세요. evidenceQuote에는 공고 문장이 아니라, 그 요구와 연결한 지원자 원문을 그대로 넣으세요.",
        ]
      : []),
    // Supporting documents were only mentioned in the BUILD stage line, so a
    // PRO run in POLISH read the résumé and did nothing with it.
    ...(hasSupportingMaterials(request)
      ? [
          "이력서·경력기술서·포트폴리오·추가 경험 자료가 함께 제공됩니다. 자소서 문항의 주장이 얇을 때 이 자료에서 확인되는 사실(기간, 소속, 역할, 담당 업무, 수치)로 뒷받침하세요. 수정 이유와 우선순위의 근거는 자소서 원문 또는 이 지원자료에서 실제 문구를 인용하세요. 자료에 없는 내용은 만들지 마세요.",
          "자소서와 지원자료가 서로 어긋나면(기간, 직함, 소속, 성과) 어느 쪽이 맞는지 단정하지 말고 verificationQuestions에 확인 질문으로 남기세요.",
          // The mismatch above is about a single fact disagreeing. This one is
          // about a *sequence* — "학교를 졸업하고 회사에 들어갔다" — that the
          // dates on the resume can directly contradict even when no single
          // figure is wrong. An applicant's own summary of their timeline is
          // often simplified or wrong in exactly this way, and the résumé's
          // start/end dates are the more reliable source for order.
          "자소서 문장이 '~한 후', '~하고 나서', '이후에는' 같은 표현으로 사건의 순서를 서술하면, 그 순서를 지원자료의 경력·학력 시작일·종료일과 대조하세요. 날짜가 겹치거나 순서가 반대이면(예: 재직 기간과 재학 기간이 겹침, 졸업일이 다음 경력의 시작일보다 늦음) 그 순서를 그대로 새 문장에 쓰지 말고, 시간 표현 없이 사실만 서술하거나 verificationQuestions에 확인을 남기세요.",
        ]
      : []),
    "consultingAdvice의 remove 제안은 '없어도 되는 문장'이 아니라 '두면 감점 요인이 되는 문장'만 대상으로 하세요. rationale에 무엇이 왜 문제인지 원문 근거와 함께 적고, 단순히 분량을 줄이기 위한 삭제는 제안하지 마세요.",
    "consultingAdvice의 모든 항목은 지원자가 바로 실행할 수 있는 구체적 행동이어야 합니다. '더 구체적으로 쓰세요' 같은 일반론은 넣지 마세요.",
    // The final tab is a view of these same revisions, so the only place a
    // whole-document pass can happen is here, after every question is written.
    "모든 문항의 revisedAnswer를 정한 뒤 전체를 다시 읽고 정리하세요. 문항 간에 같은 경험이 반복되면 한 문항에서만 자세히 쓰고 나머지 문항은 다른 경험이나 다른 측면으로 조정하세요. 이 화면의 문항별 첨삭본이 그대로 최종 제출본이 됩니다.",
    ...(getUnansweredQuestions(request).length > 0
      ? ["아직 작성되지 않은 문항은 revisions에 넣지 마세요. 다만 지원서 전체 구성을 판단할 때 참고하고, 필요하면 verificationQuestions나 consultingAdvice에서 언급하세요."]
      : []),
    ...(request.product === "PRO"
      ? [
          "requirementMatches: 채용공고의 핵심 요구사항마다 지원서·지원자료에서 근거를 찾아 matched/partial/missing으로 판정하고, evidence에는 실제 원문 근거를, recommendation에는 다음 행동을 적으세요. 근거가 없으면 missing으로 두고 지어내지 마세요.",
          "interviewQuestions: 지원서에 실제로 적힌 내용에서 이어질 면접 질문을 만들고, reason에는 왜 그 질문이 나오는지, answerGuide에는 답변에 포함해야 할 사실을 적으세요.",
          "interviewRisks: 면접에서 압박이 들어올 지점을 2~5개 찾으세요. topic에는 무엇에 대한 리스크인지, risk에는 면접관이 어떻게 파고들지, evidenceQuote에는 그 판단의 근거가 되는 지원서 원문을 그대로, preparation에는 면접 전에 준비해 둘 구체적 대비를 적으세요.",
          "interviewRisks는 예상질문의 반복이 아니라, 답변이 흔들릴 수 있는 약한 고리와 그 대비여야 합니다. 근거 없는 추측성 리스크는 만들지 마세요.",
          // Says out loud that empty is allowed. Without this the model reads
          // the three PRO fields as "always fill these in".
          "채용공고가 비어 있거나 요구사항을 읽어낼 수 없을 만큼 짧으면 requirementMatches를 빈 배열로 두세요. 공고에 없는 요구사항을 지어내지 마세요.",
          "지원서에 근거가 없어 물어볼 것이 없으면 interviewQuestions와 interviewRisks도 빈 배열로 두세요. 개수를 채우기 위해 만들지 마세요.",
        ]
      : []),
    "출력은 지정된 JSON Schema를 정확히 따르세요.",
  ].join("\n");
}

/**
 * Supporting documents are charged for as a flat PRO fee — begin_quick_analysis
 * only counts the cover letter's characters — while each attachment may hold up
 * to 50,000 characters and there may be twenty of them. Left unbounded, one
 * upload-heavy run costs many times what it was priced at, so the prompt takes
 * a fixed budget and says plainly where it stopped reading.
 */
export const SUPPORTING_CHARACTER_BUDGET = 30_000;

function buildSupportingSections(request: AnalysisRequest) {
  const sections: string[] = [];
  let remaining = SUPPORTING_CHARACTER_BUDGET;

  for (const kind of SUPPORTING_KINDS) {
    for (const document of request.documents.filter((item) => item.kind === kind)) {
      if (remaining <= 0) break;
      const label = document.filename ? `[${SUPPORTING_LABEL[kind]} · ${document.filename}]` : `[${SUPPORTING_LABEL[kind]}]`;
      const text = document.text.slice(0, remaining);
      remaining -= text.length;
      sections.push(label, text.length < document.text.length ? `${text}
(분량이 많아 이후 내용은 생략했습니다.)` : text);
    }
  }
  return sections;
}

export function buildQuickAnalysisInput(request: AnalysisRequest) {
  const coverLetter = request.documents.find((document) => document.kind === "cover_letter");
  if (!coverLetter) throw new Error("분석할 자기소개서가 필요합니다.");
  const jobPosting = request.documents.find((document) => document.kind === "job_posting");
  const questions = getAnalysisQuestions(request);
  const questionSections = questions.flatMap((question) => [
    `[문항 ${question.order}]`,
    ...(question.title ? [`제목: ${question.title}`] : []),
    ...(question.prompt ? [`질문: ${question.prompt}`] : []),
    // A blank answer used to render as a bare "답변:" with nothing under it,
    // which reads as a quotable line. Asked for a priority's evidenceQuote and
    // having no applicant sentence anywhere in the question block, the model
    // quoted the label — and the validator, which searches the applicant's
    // documents rather than this scaffolding, blocked the whole paid run.
    question.answer.trim()
      ? `답변:\n${question.answer}`
      : "답변: (아직 작성되지 않았습니다. 이 문항의 근거는 지원자료에서 찾으세요.)",
  ]);

  const unanswered = getUnansweredQuestions(request);
  const supporting = buildSupportingSections(request);

  return [
    `[요청 ID] ${request.requestId}`,
    ...(request.companyName?.trim() ? [`[지원 회사] ${request.companyName.trim()}`] : []),
    ...(request.roleName?.trim() ? [`[지원 직무] ${request.roleName.trim()}`] : []),
    `[작성 단계] ${request.writingMode}`,
    `[작성 스타일] ${request.writingStyle}`,
    `[자기소개서 문항별 원문 - 총 ${questions.length}개]`,
    ...questionSections,
    // Listed as context, never as a revision target: the applicant has not
    // written an answer yet, so there is nothing to rewrite — but the model
    // still needs to know the question exists to judge overall coverage.
    ...(unanswered.length > 0
      ? ["[아직 작성되지 않은 문항 - 첨삭 대상 아님]", unanswered.map((question) => `- ${question.title.trim() || question.prompt.trim()}`).join("\n")]
      : []),
    ...(jobPosting ? ["[채용공고 참고]", jobPosting.text] : []),
    ...supporting,
  ].join("\n\n");
}
