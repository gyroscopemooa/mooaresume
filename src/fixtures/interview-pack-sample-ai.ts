import type {
  AiAssessment,
  AiCard,
  AiSlotAssessment,
  AiSourceRef,
  MaterialDoc,
  PackSlotId,
} from "@/domain/interview-pack";
import { PACK_SLOT_IDS } from "@/domain/interview-pack";
import { capMaterialDocs } from "@/domain/interview-pack-materials";
import { splitParagraphs, splitSentences } from "@/domain/interview-pack-text";
import { PackAiProviderError, type PackAiGateway, type PackAiResult } from "@/server/ai/interview-pack/gateway-types";
import { getPackSample, type PackSampleId } from "./interview-pack-samples";

/**
 * "화면만 보기" 샘플 모드의 고정 응답 — AI 를 대신하는 미리 써 둔 결과.
 *
 * 이 응답도 실제 서비스의 서버 확인(원문 인용 대조·숫자·역할 점검)을 그대로 통과해야 한다.
 * 그래서 인용은 문서에서 문단 번호를 찾아 붙이고, 통과하지 못하는 샘플은 테스트가 잡아 낸다.
 * 이 파일의 내용은 실제 AI 품질을 보여 주는 것이 아니다 — 화면 상태를 점검하기 위한 예시다.
 */

const NO_USAGE = { inputTokens: null, outputTokens: null, totalTokens: null };

type Finder = (kind: MaterialDoc["kind"], quote: string, titleIncludes?: string) => AiSourceRef;

function makeFinder(docs: readonly MaterialDoc[]): Finder {
  return (kind, quote, titleIncludes) => {
    const doc = docs.find((entry) => entry.kind === kind && (!titleIncludes || entry.title.includes(titleIncludes)));
    if (!doc) throw new Error(`sample doc not found: ${kind} ${titleIncludes ?? ""}`);
    const paragraph = splitParagraphs(doc.text).findIndex((line) => line.includes(quote));
    if (paragraph < 0) throw new Error(`sample quote not found: ${quote}`);
    return { docId: doc.id, paragraph, quote };
  };
}

function slotStatuses(entries: Partial<Record<PackSlotId, Omit<AiSlotAssessment, "slot">>>, fallback: Omit<AiSlotAssessment, "slot">): AiSlotAssessment[] {
  return PACK_SLOT_IDS.map((slot) => ({ slot, ...(entries[slot] ?? fallback) }));
}

type CardDraft = { answer: string; keywords: string[]; memoryLine: string; followUps: string[]; evidence: AiSourceRef[]; usedFactIds: string[]; stepLabels: string[] };

function card(slot: PackSlotId, draft: CardDraft): AiCard {
  const sentences = splitSentences(draft.answer);
  // 말하는 순서: 라벨과 답변 안의 문장을 순서대로 짝짓는다(문장 수보다 라벨이 많으면 앞의 것만).
  const steps = draft.stepLabels.slice(0, sentences.length).map((label, index) => ({ label, sentence: sentences[index] }));
  return { slot, answer: draft.answer, keywords: draft.keywords, steps, memoryLine: draft.memoryLine, followUps: draft.followUps, evidence: draft.evidence, usedFactIds: draft.usedFactIds };
}

// ───────────────────────────── A. 자료 충분 ─────────────────────────────

function completeAssessment(docs: readonly MaterialDoc[]): AiAssessment {
  const f = makeFinder(docs);
  return {
    facts: [
      { id: "F1", kind: "role", statement: "샘플파트 품질팀 검사보조(팀원, 관리직·팀장 아님)", source: f("resume", "품질팀 검사보조") },
      { id: "F2", kind: "period", statement: "재직 2024년 1월 1일~2025년 12월 31일, 총 2년", source: f("resume", "2024년 1월 1일~2025년 12월 31일, 총 2년") },
      { id: "F3", kind: "action", statement: "자주 비는 항목을 표로 모으고 항목 명칭을 통일한 체크리스트 초안 작성", source: f("experience", "반복해서 비는 항목을 모아 표로 정리하고, 항목 명칭을 통일한 체크리스트 초안을 작성했다", "EXPERIENCE-01") },
      { id: "F4", kind: "metric", statement: "2025년 4월 200건 중 8건 누락 → 2025년 6월 200건 중 2건", source: f("experience", "2025년 4월의 검사기록 200건 중 필수 항목이 빠진 기록이 8건이었다", "EXPERIENCE-01") },
      { id: "F5", kind: "role", statement: "기록 점검·초안 작성·자료 취합 담당, 최종 승인과 시행 결정은 팀장", source: f("experience", "기록 점검, 초안 작성, 자료 취합을 담당했다", "EXPERIENCE-01") },
      { id: "F6", kind: "collaboration", statement: "생산 담당자의 우려를 듣고 중복 칸을 줄인 초안을 제안", source: f("experience", "상대의 우려를 듣고, 기존에 쓰던 표현을 가능한 한 유지하면서 중복된 칸을 줄인 초안을 제안했다", "EXPERIENCE-02") },
      { id: "F7", kind: "motive", statement: "기록 정리와 조치 확인이 잘 맞았고 공고의 업무에 관심", source: f("note", "품질관리 업무에서 기록을 정리하고 이상 항목의 조치를 끝까지 확인하는 일이 나에게 잘 맞았다", "MOTIVATION-01") },
      { id: "F8", kind: "trait", statement: "강점: 항목별 정리와 누락 확인 습관 / 약점: 작은 항목을 오래 확인해 우선순위를 늦게 정함", source: f("note", "작은 항목을 오래 확인하다가 우선순위를 늦게 정한 적이 있다", "TRAIT-01") },
      { id: "F9", kind: "aspiration", statement: "검사기준·기록 체계·보고 절차를 익히고 반복되는 누락을 선임과 논의", source: f("note", "담당 범위에서 반복되는 기록 누락과 확인 지연을 정리해 선임과 개선 방안을 논의하고 싶다", "GOAL-01") },
      { id: "F10", kind: "company", statement: "공고: 공정검사 기록 관리, 조치 내역 추적, 생산부서와 검사기준 공유", source: f("job_posting", "공정검사 기록 관리, 이상 항목 분류, 조치 내역 추적, 생산부서와 검사기준 공유") },
    ],
    conflicts: [],
    slots: slotStatuses({
      intro_30: { status: "ready", reason: "직무, 강점(정리·누락 확인), 이를 보여 준 경험과 본인 행동이 자료에 있습니다.", questions: [], factIds: ["F1", "F3", "F4"] },
      intro_60: { status: "ready", reason: "역할, 경험, 본인의 행동과 결과, 직무 연결에 필요한 자료가 모두 있습니다.", questions: [], factIds: ["F1", "F2", "F3", "F4", "F5"] },
      motivation_company: { status: "ready", reason: "공고에 적힌 업무와 지원자가 밝힌 실제 지원 이유가 있습니다(회사 문화·시장 정보는 자료에 없어 쓰지 않습니다).", questions: [], factIds: ["F7", "F10"] },
      aspiration: { status: "ready", reason: "직무 업무와 지원자가 밝힌 기여 방향이 있습니다.", questions: [], factIds: ["F9", "F10"] },
      motivation_role: { status: "ready", reason: "직무를 선택한 이유와 관련 경험이 있습니다.", questions: [], factIds: ["F7", "F3"] },
      strength: { status: "ready", reason: "강점과 그것을 보여 준 경험이 있습니다.", questions: [], factIds: ["F8", "F3"] },
      weakness: { status: "ready", reason: "지원자가 밝힌 약점과 보완 노력이 있습니다.", questions: [], factIds: ["F8"] },
      role_experience: { status: "ready", reason: "검사보조로서 맡은 업무와 도구가 있습니다.", questions: [], factIds: ["F1", "F5"] },
      problem_solving: { status: "ready", reason: "어려웠던 상황, 본인의 행동, 결과가 있습니다.", questions: [], factIds: ["F3", "F4"] },
      collaboration: { status: "ready", reason: "우려를 듣고 조율한 행동과 결과가 있습니다.", questions: [], factIds: ["F6"] },
      closing: { status: "ready", reason: "지원동기와 포부가 있어 마무리 말을 만들 수 있습니다.", questions: [], factIds: ["F7", "F9"] },
    }, { status: "ready", reason: "자료가 있습니다.", questions: [], factIds: ["F1"] }),
  };
}

function completeCards(docs: readonly MaterialDoc[]): Partial<Record<PackSlotId, AiCard>> {
  const f = makeFinder(docs);
  const role = f("resume", "품질팀 검사보조");
  const period = f("resume", "2024년 1월 1일~2025년 12월 31일, 총 2년");
  const before = f("experience", "2025년 4월의 검사기록 200건 중 필수 항목이 빠진 기록이 8건이었다", "EXPERIENCE-01");
  const after = f("experience", "2025년 6월의 검사기록 200건 중 필수 항목이 빠진 기록은 2건이었다", "EXPERIENCE-01");
  const action = f("experience", "반복해서 비는 항목을 모아 표로 정리하고, 항목 명칭을 통일한 체크리스트 초안을 작성했다", "EXPERIENCE-01");
  const review = f("experience", "담당 선임의 검토와 팀장의 승인을 거쳐 생산 담당자와 표기 방식을 맞췄다", "EXPERIENCE-01");
  const scope = f("experience", "기록 점검, 초안 작성, 자료 취합을 담당했다", "EXPERIENCE-01");
  const approval = f("experience", "최종 승인과 전체 시행 결정은 팀장이 했다", "EXPERIENCE-01");
  const situation = f("experience", "근무조마다 검사 항목의 이름을 다르게 쓰고 일부 칸을 비워 조치 여부를 다시 확인해야 했다", "EXPERIENCE-01");
  const concern = f("experience", "생산 담당자는 새 체크리스트가 기록 시간을 늘릴 수 있다고 우려했다", "EXPERIENCE-02");
  const propose = f("experience", "상대의 우려를 듣고, 기존에 쓰던 표현을 가능한 한 유지하면서 중복된 칸을 줄인 초안을 제안했다", "EXPERIENCE-02");
  const shifts = f("experience", "검사 시점과 조치 확인 시점의 기록 담당자를 함께 확인했다", "EXPERIENCE-02");
  const used = f("experience", "선임 검토 뒤 합의한 표기 방식으로 현장에서 사용했다", "EXPERIENCE-02");
  const duties = f("resume", "검사표 작성, 기록 누락 확인, 이상 항목 취합, 조치 결과 정리");
  const tools = f("resume", "엑셀 정렬·필터, 기본 수식, 검사 체크리스트");
  const motive = f("note", "품질관리 업무에서 기록을 정리하고 이상 항목의 조치를 끝까지 확인하는 일이 나에게 잘 맞았다", "MOTIVATION-01");
  const posting = f("job_posting", "공정검사 기록 관리, 이상 항목 분류, 조치 내역 추적, 생산부서와 검사기준 공유");
  const strengthQuote = f("note", "자료를 항목별로 정리하고 누락 여부를 확인하는 습관", "TRAIT-01");
  const weakQuote = f("note", "작은 항목을 오래 확인하다가 우선순위를 늦게 정한 적이 있다", "TRAIT-01");
  const weakFix = f("note", "반드시 확인할 항목과 추가 확인할 항목을 먼저 나눠 점검 순서를 정하고 있다", "TRAIT-01");
  const goalFirst = f("note", "초기에는 회사의 검사기준과 기록 체계, 이상 발생 시 보고 절차를 먼저 익히고 싶다", "GOAL-01");
  const goalLater = f("note", "담당 범위에서 반복되는 기록 누락과 확인 지연을 정리해 선임과 개선 방안을 논의하고 싶다", "GOAL-01");
  const noPromise = f("note", "불량률 몇 퍼센트 감소 같은 수치를 약속하지 않는다", "GOAL-01");

  return {
    intro_30: card("intro_30", {
      answer: "검사 기록의 빈칸을 끝까지 확인하는 품질관리 지원자입니다. 샘플파트 품질팀에서 검사보조로 일하며 체크리스트 초안을 만들어 누락 기록을 8건에서 2건으로 줄이는 데 참여했습니다. 이 꼼꼼함으로 공정검사 기록 관리에 기여하겠습니다.",
      keywords: ["빈칸을 끝까지 확인", "검사보조", "체크리스트 초안", "8건에서 2건"],
      stepLabels: ["직무 정체성", "대표 경험", "직무에 대한 기여"],
      memoryLine: "빈칸 끝까지 확인 → 검사보조·체크리스트 → 8건에서 2건 → 기록 관리에 기여",
      followUps: ["‘참여했다’고 하셨는데 본인이 직접 맡은 부분은 무엇인가요?", "누락 기록이 2건 남은 이유는 무엇이라고 보시나요?"],
      evidence: [role, action, before, after],
      usedFactIds: ["F1", "F3", "F4"],
    }),
    intro_60: card("intro_60", {
      answer: "안녕하세요. 저는 정확한 기록으로 현장의 확인 부담을 줄이고 싶은 품질관리 지원자입니다. 샘플파트 품질팀에서 2년 동안 검사보조로 일하며 검사표 작성과 기록 누락 확인, 조치 결과 정리를 맡았습니다. 근무조마다 검사 항목 이름이 달라 확인을 반복하는 문제를 보고, 자주 비는 항목을 표로 모아 항목 명칭을 통일한 체크리스트 초안을 작성했습니다. 선임의 검토와 팀장님의 승인을 거쳐 생산 담당자와 표기 방식을 맞췄고, 200건 중 8건이던 누락 기록이 2건으로 줄었습니다. 이 경험을 바탕으로 정확한 기록과 원활한 협업에 기여하겠습니다.",
      keywords: ["확인 부담", "검사보조", "체크리스트 초안", "팀장님의 승인", "8건이던 누락 기록이 2건"],
      stepLabels: ["정체성", "경험", "문제 발견", "본인 행동과 결과", "직무 연결"],
      memoryLine: "정확한 기록 → 2년 검사보조 → 이름 통일 체크리스트 → 승인 후 8건→2건 → 협업 기여",
      followUps: ["승인은 누가 했고 본인은 어디까지 맡았나요?", "200건은 어떤 기준으로 확인한 기록인가요?", "생산 담당자와는 어떻게 표기를 맞추셨나요?"],
      evidence: [role, period, duties, situation, action, review, before, after],
      usedFactIds: ["F1", "F2", "F3", "F4", "F5"],
    }),
    motivation_company: card("motivation_company", {
      answer: "공고에 공정검사 기록 관리와 조치 내역 추적 업무가 있다는 점을 보고 지원했습니다. 품질관리 업무에서 기록을 정리하고 이상 항목의 조치를 끝까지 확인하는 일이 저에게 잘 맞았습니다. 그 경험을 살리면서 품질관리 역량을 더 키울 수 있다고 생각했습니다.",
      keywords: ["공정검사 기록 관리", "조치 내역 추적", "끝까지 확인", "품질관리 역량"],
      stepLabels: ["지원 계기", "잘 맞았던 경험", "발전 방향"],
      memoryLine: "공고의 기록 관리·조치 추적 → 끝까지 확인이 잘 맞음 → 역량을 더 키움",
      followUps: ["공고의 어떤 업무가 가장 기대되시나요?", "회사에 대해 더 알아본 점이 있나요?"],
      evidence: [motive, posting],
      usedFactIds: ["F7", "F10"],
    }),
    aspiration: card("aspiration", {
      answer: "입사 후에는 먼저 회사의 검사기준과 기록 체계, 이상이 생겼을 때의 보고 절차를 익히겠습니다. 이후 맡은 범위에서 반복되는 기록 누락과 확인 지연을 정리해 선임과 개선 방안을 함께 논의하고 싶습니다. 아직 회사의 실제 공정과 목표를 모르기 때문에 수치를 약속하기보다 배운 기준대로 정확하게 일하는 것부터 시작하겠습니다.",
      keywords: ["검사기준과 기록 체계", "보고 절차", "반복되는 기록 누락", "선임과 개선 방안"],
      stepLabels: ["먼저 익힐 것", "이후 기여 방향", "약속하는 태도"],
      memoryLine: "기준·절차 익히기 → 반복 누락 정리 → 선임과 개선 논의 → 수치 약속 없이 정확하게",
      followUps: ["처음 3개월 동안 무엇부터 하시겠어요?", "개선 방안을 낼 때 선임의 의견이 다르면 어떻게 하시겠어요?"],
      evidence: [goalFirst, goalLater, noPromise],
      usedFactIds: ["F9"],
    }),
    motivation_role: card("motivation_role", {
      answer: "품질관리는 기록을 정리하고 이상 항목의 조치를 끝까지 확인하는 직무라고 생각합니다. 검사보조로 일하면서 이런 일이 저에게 잘 맞는다고 느꼈습니다. 항목 명칭을 통일한 체크리스트로 누락 기록이 줄어드는 것을 보며 이 직무를 더 깊이 배우고 싶어졌습니다.",
      keywords: ["조치를 끝까지 확인", "검사보조", "체크리스트", "더 깊이 배우고"],
      stepLabels: ["직무에 대한 생각", "잘 맞는다고 느낀 경험", "더 배우고 싶은 이유"],
      memoryLine: "기록·조치 확인 직무 → 검사보조로 적성 확인 → 체크리스트 성과 → 더 배우고 싶음",
      followUps: ["품질관리에서 가장 중요하다고 보는 것은 무엇인가요?", "다른 직무와 고민하지는 않으셨나요?"],
      evidence: [motive, action, after],
      usedFactIds: ["F7", "F3"],
    }),
    strength: card("strength", {
      answer: "제 강점은 자료를 항목별로 정리하고 누락 여부를 확인하는 습관입니다. 검사 기록에서 자주 비는 항목을 모아 표로 정리하고 체크리스트 초안을 만든 경험이 그 근거입니다. 이 습관은 기록 관리가 중요한 품질관리 업무에서 도움이 된다고 생각합니다.",
      keywords: ["항목별로 정리", "누락 여부", "체크리스트 초안", "기록 관리"],
      stepLabels: ["강점", "근거 경험", "직무와의 연결"],
      memoryLine: "항목별 정리·누락 확인 → 체크리스트 초안 → 기록 관리에 도움",
      followUps: ["그 습관은 어떻게 생기셨나요?", "강점이 오히려 단점이 된 적은 없나요?"],
      evidence: [strengthQuote, action],
      usedFactIds: ["F8", "F3"],
    }),
    weakness: card("weakness", {
      answer: "작은 항목까지 오래 확인하다가 우선순위를 늦게 정한 적이 있습니다. 그래서 지금은 반드시 확인할 항목과 추가로 확인할 항목을 먼저 나눠서 점검 순서를 정하고 있습니다.",
      keywords: ["작은 항목", "우선순위", "확인할 항목", "점검 순서"],
      stepLabels: ["약점", "보완 노력"],
      memoryLine: "작은 항목에 오래 → 우선순위 늦음 → 확인 항목을 나눠 순서 정하기",
      followUps: ["그 방법을 쓰고 나서 달라진 점이 있나요?", "우선순위를 어떤 기준으로 나누시나요?"],
      evidence: [weakQuote, weakFix],
      usedFactIds: ["F8"],
    }),
    role_experience: card("role_experience", {
      answer: "샘플파트 품질팀에서 검사보조로 검사표 작성, 기록 누락 확인, 이상 항목 취합, 조치 결과 정리를 맡았습니다. 엑셀의 정렬과 필터, 기본 수식으로 기록을 정리했고 검사 체크리스트를 활용해 확인했습니다. 저는 기록 점검과 자료 취합을 담당했고, 최종 승인은 팀장님이 하셨습니다.",
      keywords: ["검사보조", "검사표 작성", "엑셀", "최종 승인은 팀장님"],
      stepLabels: ["소속과 역할", "사용한 도구", "맡은 범위"],
      memoryLine: "검사보조 → 검사표·누락 확인 → 엑셀 정렬·필터 → 최종 승인은 팀장",
      followUps: ["엑셀은 어느 수준까지 쓰시나요?", "이상 항목은 어떤 기준으로 분류하셨나요?"],
      evidence: [role, duties, tools, scope, approval],
      usedFactIds: ["F1", "F5"],
    }),
    problem_solving: card("problem_solving", {
      answer: "근무조마다 검사 항목 이름을 다르게 쓰고 일부 칸을 비워 조치 여부를 다시 확인해야 했던 적이 있습니다. 2025년 4월 검사기록 200건 중 필수 항목이 빠진 기록이 8건이었습니다. 저는 자주 비는 항목을 표로 모으고 명칭을 통일한 체크리스트 초안을 만들었고, 6월 200건에서는 2건으로 줄었습니다. 이는 기록 누락 건수가 줄어든 사례입니다.",
      keywords: ["항목 이름", "200건 중", "체크리스트 초안", "누락 건수"],
      stepLabels: ["상황", "확인한 현황", "본인 행동과 결과", "결과의 의미"],
      memoryLine: "이름이 제각각 → 200건 중 8건 → 표로 모아 통일 → 2건, 누락 건수 기준",
      followUps: ["200건은 어떻게 확인하셨나요?", "제품 품질과는 어떻게 연결된다고 보시나요?"],
      evidence: [situation, before, action, after, f("experience", "검사기록 누락 건수가 줄어든 사례다", "EXPERIENCE-01")],
      usedFactIds: ["F3", "F4"],
    }),
    collaboration: card("collaboration", {
      answer: "생산 담당자가 새 체크리스트가 기록 시간을 늘릴 수 있다고 우려한 적이 있습니다. 저는 우려를 먼저 듣고, 기존에 쓰던 표현은 가능한 한 유지하면서 중복된 칸을 줄인 초안을 제안했습니다. 검사 시점과 조치 확인 시점의 기록 담당자도 함께 확인했고, 선임의 검토를 거쳐 합의한 표기 방식을 현장에서 사용했습니다.",
      keywords: ["우려를 먼저 듣고", "중복된 칸", "기록 담당자", "합의한 표기 방식"],
      stepLabels: ["상황", "본인 행동", "확인한 점", "결과"],
      memoryLine: "시간 우려 → 듣고 중복 칸 줄임 → 담당자 확인 → 합의한 표기 사용",
      followUps: ["의견이 끝내 달랐다면 어떻게 하셨을까요?", "기록 시간은 실제로 어떻게 달라졌나요?"],
      evidence: [concern, propose, shifts, used],
      usedFactIds: ["F6"],
    }),
    closing: card("closing", {
      answer: "먼저 회사의 기준을 정확히 익히고, 기록으로 팀에 도움이 되는 사람이 되겠습니다. 감사합니다.",
      keywords: ["회사의 기준", "정확히 익히고", "기록으로"],
      stepLabels: ["다짐", "마무리 인사"],
      memoryLine: "기준을 정확히 익히기 → 기록으로 팀에 도움 → 감사 인사",
      followUps: ["마지막으로 더 하고 싶은 말씀이 있나요?", "저희에게 궁금한 점이 있나요?"],
      evidence: [goalFirst, motive],
      usedFactIds: ["F7", "F9"],
    }),
  };
}

// ───────────────────────────── B. 자료 부족 ─────────────────────────────

function insufficientAssessment(docs: readonly MaterialDoc[]): AiAssessment {
  const f = makeFinder(docs);
  return {
    facts: [
      { id: "F1", kind: "trait", statement: "스스로 성실하고 책임감 있다고 소개함(뒷받침하는 경험은 없음)", source: f("note", "성실하고 책임감 있는 사람입니다", "MEMO-02") },
      { id: "F2", kind: "other", statement: "지원 직무는 생산관리, 신입", source: f("note", "지원직무: 생산관리", "PROFILE-02") },
    ],
    conflicts: [],
    slots: slotStatuses({
      intro_30: { status: "needs_material", reason: "‘성실하다’는 설명만 있고, 그것을 보여 주는 구체적인 경험과 본인의 행동이 없습니다.", questions: ["성실함이나 책임감을 보여 준 경험을 하나만 적어 주세요(언제, 무엇을 했는지).", "그때 본인이 직접 한 행동은 무엇인가요?"], factIds: [] },
      intro_60: { status: "needs_material", reason: "경험·행동·결과에 관한 자료가 없어 1분 분량의 근거가 모자랍니다.", questions: ["대표 경험 하나에서 본인이 한 행동과 달라진 점을 적어 주세요(숫자가 없어도 됩니다)."], factIds: [] },
      motivation_company: { status: "needs_material", reason: "지원 회사도 채용공고도 없어 회사에 대한 지원동기의 근거가 없습니다.", questions: ["지원하는 회사 이름을 알려 주세요.", "채용공고 본문을 붙여 넣거나, 이 회사에 지원하려는 이유를 적어 주세요."], factIds: [] },
      aspiration: { status: "needs_material", reason: "입사 후 하고 싶은 업무와 기여 방향이 정리되어 있지 않습니다.", questions: ["입사 후 처음 익히고 싶은 것과 이후 기여하고 싶은 방향을 한두 줄로 적어 주세요."], factIds: [] },
      motivation_role: { status: "needs_material", reason: "생산관리를 선택한 구체적인 이유가 없습니다.", questions: ["생산관리 직무를 선택한 이유와 관련된 경험이 있다면 적어 주세요."], factIds: [] },
      strength: { status: "needs_material", reason: "강점을 뒷받침할 경험이 없습니다.", questions: ["본인의 강점 한 가지와 그것이 드러난 경험을 적어 주세요."], factIds: [] },
      weakness: { status: "needs_material", reason: "지원자가 밝힌 약점과 보완 노력이 없습니다.", questions: ["스스로 부족하다고 느낀 점과 보완하려고 하는 일을 적어 주세요."], factIds: [] },
      role_experience: { status: "needs_material", reason: "직무 관련 경험이 제공되지 않았습니다.", questions: ["생산관리와 관련된 경험(수업·아르바이트·프로젝트 등)이 있다면 적어 주세요."], factIds: [] },
      problem_solving: { status: "needs_material", reason: "어려움을 해결한 경험이 제공되지 않았습니다.", questions: ["어려웠던 상황에서 본인이 한 행동과 결과를 적어 주세요."], factIds: [] },
      collaboration: { status: "needs_material", reason: "협업·갈등 경험이 제공되지 않았습니다.", questions: ["다른 사람과 협업하거나 의견이 달랐던 경험이 있다면 적어 주세요."], factIds: [] },
      closing: { status: "needs_material", reason: "지원동기나 포부가 정해져야 마지막 한마디를 만들 수 있습니다.", questions: ["면접 마지막에 꼭 전하고 싶은 말이 있다면 적어 주세요."], factIds: [] },
    }, { status: "needs_material", reason: "자료가 부족합니다.", questions: [], factIds: [] }),
  };
}

// ───────────────────────────── C. 자료 충돌 ─────────────────────────────

function conflictingAssessment(docs: readonly MaterialDoc[]): AiAssessment {
  const f = makeFinder(docs);
  return {
    facts: [
      { id: "F1", kind: "role", statement: "이력서: 품질팀 검사보조, 팀원", source: f("resume", "품질팀 검사보조, 팀원") },
      { id: "F2", kind: "motive", statement: "기록 정리 업무를 더 배우고 싶고 조치 내역 추적 업무에 관심", source: f("note", "기록을 정리하는 업무를 더 배우고 싶고, 공고에 있는 조치 내역 추적 업무에 관심이 있습니다", "MOTIVATION-03") },
      { id: "F3", kind: "aspiration", statement: "입사 초기에 검사기준과 보고 절차를 배우고 정확하게 정리", source: f("note", "입사 초기에는 검사기준과 보고 절차를 배우고, 맡은 자료를 정확하게 정리하고 싶습니다", "GOAL-03") },
    ],
    conflicts: [
      { topic: "period", summary: "같은 회사의 재직기간이 이력서와 자기소개서에서 다릅니다.", left: f("resume", "2024년 7월 1일~2025년 12월 31일, 총 1년 6개월"), right: f("cover_letter", "2023년 1월 1일부터 2025년 12월 31일까지 3년간 근무했습니다") },
      { topic: "role", summary: "같은 프로젝트에서의 역할이 다릅니다(검사보조·팀원 / 팀장).", left: f("resume", "품질팀 검사보조, 팀원"), right: f("cover_letter", "팀장으로서 팀원 5명에게 업무를 배정하고 최종 승인했습니다") },
      { topic: "metric", summary: "같은 개선 전후 기록의 수치가 다릅니다(8건→2건 / 20건→1건).", left: f("resume", "개선 전인 2025년 4월 기록 200건에서 누락 기록 8건, 개선 후인 2025년 6월 기록 200건에서 누락 기록 2건"), right: f("cover_letter", "개선 전인 2025년 4월 기록 200건에서는 누락 기록이 20건이었고") },
    ],
    slots: slotStatuses({
      intro_30: { status: "ready", reason: "직무와 역할·경험 자료가 있습니다.", questions: [], factIds: ["F1"] },
      intro_60: { status: "ready", reason: "직무와 역할·경험 자료가 있습니다.", questions: [], factIds: ["F1"] },
      motivation_company: { status: "ready", reason: "공고 업무에 대한 관심과 지원 이유가 있습니다.", questions: [], factIds: ["F2"] },
      aspiration: { status: "ready", reason: "입사 초기 포부가 있습니다.", questions: [], factIds: ["F3"] },
      motivation_role: { status: "needs_material", reason: "직무를 선택한 구체적인 이유와 관련 경험이 부족합니다.", questions: ["이 직무를 선택한 이유를 한두 줄로 적어 주세요."], factIds: [] },
      strength: { status: "ready", reason: "역할 자료가 있습니다.", questions: [], factIds: ["F1"] },
      weakness: { status: "needs_material", reason: "지원자가 밝힌 약점과 보완 노력이 없습니다.", questions: ["스스로 부족하다고 느낀 점과 보완 노력을 적어 주세요."], factIds: [] },
      role_experience: { status: "ready", reason: "검사기록 양식 정리 경험이 있습니다.", questions: [], factIds: ["F1"] },
      problem_solving: { status: "ready", reason: "개선 사례가 있습니다.", questions: [], factIds: ["F1"] },
      collaboration: { status: "needs_material", reason: "협업·갈등 경험을 밝힌 자료가 없습니다.", questions: ["다른 사람과 협업하거나 의견이 달랐던 경험이 있다면 적어 주세요."], factIds: [] },
      closing: { status: "ready", reason: "지원동기와 포부가 있습니다.", questions: [], factIds: ["F2", "F3"] },
    }, { status: "needs_material", reason: "자료가 부족합니다.", questions: [], factIds: [] }),
  };
}

function conflictingCards(docs: readonly MaterialDoc[]): Partial<Record<PackSlotId, AiCard>> {
  const f = makeFinder(docs);
  const motive = f("note", "기록을 정리하는 업무를 더 배우고 싶고, 공고에 있는 조치 내역 추적 업무에 관심이 있습니다", "MOTIVATION-03");
  const goal = f("note", "입사 초기에는 검사기준과 보고 절차를 배우고, 맡은 자료를 정확하게 정리하고 싶습니다", "GOAL-03");
  const role = f("resume", "품질팀 검사보조, 팀원");
  const period = f("resume", "2024년 7월 1일~2025년 12월 31일, 총 1년 6개월");
  const project = f("resume", "2025년 5월 검사기록 양식 정리");
  const scope = f("resume", "기록 정리와 체크리스트 초안 작성, 최종 승인 및 업무 지시는 팀장이 담당");
  const metric = f("resume", "개선 전인 2025년 4월 기록 200건에서 누락 기록 8건, 개선 후인 2025년 6월 기록 200건에서 누락 기록 2건");
  return {
    // 아래 다섯 개는 사용자가 '이력서 쪽이 맞다'고 확인한 뒤에만 만들어진다(샘플 C 의 이력서 쪽 내용 기준).
    intro_30: card("intro_30", {
      answer: "기록을 정확하게 정리하는 품질관리 지원자입니다. 샘플파트 품질팀에서 검사보조로 검사기록 양식 정리에 참여해 누락 기록을 8건에서 2건으로 줄였습니다. 배운 기준을 정확하게 정리하는 일로 이어 가겠습니다.",
      keywords: ["정확하게 정리", "검사보조", "8건에서 2건"],
      stepLabels: ["직무 정체성", "대표 경험", "직무에 대한 기여"],
      memoryLine: "정확한 기록 정리 → 검사보조·양식 정리 → 8건에서 2건 → 기준을 정확하게",
      followUps: ["양식 정리에서 본인이 맡은 부분은 정확히 어디까지인가요?", "누락 기록이 2건 남은 이유는 무엇인가요?"],
      evidence: [role, project, metric],
      usedFactIds: ["F1"],
    }),
    intro_60: card("intro_60", {
      answer: "안녕하세요. 저는 기록을 정확하게 정리하는 일을 더 배우고 싶은 품질관리 지원자입니다. 샘플파트 품질팀에서 1년 6개월 동안 검사보조로 일했습니다. 2025년 5월에는 검사기록 양식 정리에 참여해 기록 정리와 체크리스트 초안 작성을 맡았습니다. 개선 전 200건 중 8건이던 누락 기록이 개선 후 200건 중 2건으로 줄었고, 최종 승인과 업무 지시는 팀장님이 하셨습니다. 이 경험으로 자료를 정확하게 정리하는 일에 기여하겠습니다.",
      keywords: ["정확하게 정리", "검사보조", "1년 6개월", "체크리스트 초안"],
      stepLabels: ["정체성", "근무 경력", "본인 행동", "결과와 역할 범위", "직무 연결"],
      memoryLine: "정확한 정리 → 1년 6개월 검사보조 → 양식 정리·초안 → 승인은 팀장 → 정리로 기여",
      followUps: ["초안 작성 외에 어떤 일을 맡으셨나요?", "개선 전후 기록은 어떻게 확인하셨나요?"],
      evidence: [role, period, project, scope, metric],
      usedFactIds: ["F1"],
    }),
    strength: card("strength", {
      answer: "제 강점은 기록을 정확하게 정리하는 일입니다. 검사보조로 검사기록 양식 정리에 참여하며 체크리스트 초안을 작성했습니다. 이런 경험이 조치 내역을 추적하는 업무에서 도움이 된다고 생각합니다.",
      keywords: ["정확하게 정리", "검사기록 양식 정리", "체크리스트 초안", "조치 내역"],
      stepLabels: ["강점", "근거 경험", "직무와의 연결"],
      memoryLine: "정확한 기록 정리 → 양식 정리·초안 → 조치 내역 추적에 도움",
      followUps: ["기록을 정리할 때 가장 신경 쓰는 점은 무엇인가요?", "그 강점을 보여 주는 다른 경험도 있나요?"],
      evidence: [scope, project],
      usedFactIds: ["F1"],
    }),
    role_experience: card("role_experience", {
      answer: "샘플파트 품질팀에서 검사보조로 근무했고, 2025년 5월 검사기록 양식 정리에 참여했습니다. 저는 기록 정리와 체크리스트 초안 작성을 맡았고, 최종 승인과 업무 지시는 팀장님이 담당하셨습니다.",
      keywords: ["검사보조", "검사기록 양식 정리", "체크리스트 초안", "팀장님이 담당"],
      stepLabels: ["소속과 역할", "맡은 범위와 승인 주체"],
      memoryLine: "검사보조 → 양식 정리 참여 → 기록 정리·초안 담당 → 승인은 팀장",
      followUps: ["초안은 누구와 어떻게 검토하셨나요?", "가장 어려웠던 부분은 무엇이었나요?"],
      evidence: [role, project, scope],
      usedFactIds: ["F1"],
    }),
    problem_solving: card("problem_solving", {
      answer: "2025년 5월 검사기록 양식 정리 프로젝트에 참여했습니다. 개선 전인 4월 기록 200건에서 누락 기록이 8건이었습니다. 저는 기록을 정리하고 체크리스트 초안을 작성했고, 개선 후인 6월 기록 200건에서는 누락 기록이 2건이었습니다.",
      keywords: ["양식 정리", "200건에서 누락 기록이 8건", "체크리스트 초안", "누락 기록이 2건"],
      stepLabels: ["상황", "개선 전", "본인 행동", "개선 후"],
      memoryLine: "양식 정리 → 200건 중 8건 → 정리와 초안 → 200건 중 2건",
      followUps: ["누락 기록은 어떤 기준으로 세셨나요?", "8건이 2건으로 줄어든 이유는 무엇이라고 보세요?"],
      evidence: [project, metric, scope],
      usedFactIds: ["F1"],
    }),
    motivation_company: card("motivation_company", {
      answer: "기록을 정리하는 업무를 더 배우고 싶어서 지원했습니다. 특히 공고에 있는 조치 내역 추적 업무에 관심이 있습니다. 이 업무를 통해 기록이 실제 조치로 이어지는 과정을 배우고 싶습니다.",
      keywords: ["기록을 정리", "조치 내역 추적", "더 배우고"],
      stepLabels: ["지원 이유", "관심 업무", "배우고 싶은 점"],
      memoryLine: "기록 정리를 더 배움 → 조치 내역 추적에 관심 → 조치로 이어지는 과정",
      followUps: ["조치 내역 추적에서 무엇이 가장 중요하다고 보시나요?", "회사에 대해 알아본 점이 있나요?"],
      evidence: [motive],
      usedFactIds: ["F2"],
    }),
    aspiration: card("aspiration", {
      answer: "입사 초기에는 검사기준과 보고 절차를 배우겠습니다. 그리고 맡은 자료를 정확하게 정리하는 것부터 시작하고 싶습니다.",
      keywords: ["검사기준", "보고 절차", "정확하게 정리"],
      stepLabels: ["먼저 배울 것", "시작할 일"],
      memoryLine: "검사기준·보고 절차 → 자료를 정확하게 정리",
      followUps: ["정확하게 정리하기 위해 어떤 방법을 쓰시나요?", "그다음 단계의 목표는 무엇인가요?"],
      evidence: [goal],
      usedFactIds: ["F3"],
    }),
    closing: card("closing", {
      answer: "검사기준과 보고 절차를 먼저 배우고, 맡은 자료를 정확하게 정리하겠습니다. 감사합니다.",
      keywords: ["검사기준", "보고 절차", "정확하게 정리"],
      stepLabels: ["다짐", "마무리 인사"],
      memoryLine: "기준·절차 배우기 → 자료를 정확하게 정리 → 감사 인사",
      followUps: ["마지막으로 더 하고 싶은 말씀이 있나요?", "저희에게 궁금한 점이 있나요?"],
      evidence: [goal, motive],
      usedFactIds: ["F2", "F3"],
    }),
  };
}

// ───────────────────────────── 고정 응답 게이트웨이 ─────────────────────────────

const SHORTENED: Partial<Record<PackSlotId, string>> = {
  intro_30: "빈칸을 끝까지 확인하는 품질관리 지원자입니다. 검사보조로 체크리스트 초안을 만들어 누락 기록을 8건에서 2건으로 줄이는 데 참여했습니다.",
};

/**
 * 샘플 하나의 고정 응답 게이트웨이. 네트워크를 쓰지 않는다 — 이 파일에는 fetch 도 서버 키도 없다.
 * `docs` 는 팩의 실제 자료 문서(D1.. id 가 붙은 것)여야 인용 문단 번호가 맞는다.
 */
export function createCannedGateway(sampleId: PackSampleId, docs: readonly MaterialDoc[]): PackAiGateway {
  const assessment = sampleId === "complete" ? completeAssessment(docs) : sampleId === "insufficient" ? insufficientAssessment(docs) : conflictingAssessment(docs);
  const cards = sampleId === "complete" ? completeCards(docs) : sampleId === "conflicting" ? conflictingCards(docs) : {};

  const done = <T>(output: T): PackAiResult<T> => ({ output, responseId: null, usage: NO_USAGE, model: "샘플 고정 응답" });

  return {
    async assess() {
      return done(assessment);
    },
    async generate(input) {
      const out = input.slots.map((slot) => cards[slot]).filter((entry): entry is AiCard => Boolean(entry));
      return done({ cards: out });
    },
    async revise(input) {
      const shortened = SHORTENED[input.slot];
      const base = cards[input.slot];
      if (input.kind === "shorten" && shortened && base) {
        return done({ cards: [{ ...base, answer: shortened, keywords: ["빈칸을 끝까지 확인", "검사보조", "체크리스트 초안"], steps: [{ label: "정체성", sentence: splitSentences(shortened)[0] }, { label: "경험", sentence: splitSentences(shortened)[1] }], memoryLine: "빈칸 확인 → 검사보조·체크리스트 → 8건에서 2건" }] });
      }
      // 미리 써 둔 수정 예시가 없는 요청은 실제 AI 를 부르지 않는 샘플이라는 안내로 끝낸다(성공으로 꾸미지 않는다).
      throw new PackAiProviderError(null, "SAMPLE_HAS_NO_CANNED_REVISION");
    },
  };
}

/** 샘플이 쓰는 문서(정렬·id 부여 결과). 팩 만들기와 같은 함수로 만들어 인용 위치가 항상 맞는다. */
export function sampleDocs(sampleId: PackSampleId): MaterialDoc[] {
  const sample = getPackSample(sampleId);
  if (!sample) throw new Error(`unknown sample: ${sampleId}`);
  return capMaterialDocs(sample.docs);
}
