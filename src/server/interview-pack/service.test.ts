import { beforeEach, describe, expect, it } from "vitest";
import {
  PACK_SLOT_IDS,
  resolveInterviewPackConfig,
  type AiAssessment,
  type AiCard,
  type MaterialDoc,
  type PackSlotId,
} from "@/domain/interview-pack";
import { splitParagraphs } from "@/domain/interview-pack-text";
import { PackAiInvalidOutputError, PackAiProviderError, type PackAiGateway, type PackAiResult } from "@/server/ai/interview-pack/gateway";
import { getPackSample } from "@/fixtures/interview-pack-samples";
import { MemoryPackRepository, makeRun } from "@/test-support/interview-pack-memory-repository";
import { InterviewPackService, PackServiceError, type PackState } from "./service";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const RUN = "33333333-3333-4333-8333-333333333333";

function docsOf(id: "complete" | "insufficient" | "conflicting"): MaterialDoc[] {
  return getPackSample(id)!.docs.map((doc) => ({ ...doc }));
}

/** 자료 문서에서 실제로 있는 문장을 찾아 근거 참조를 만든다. */
function ref(docs: MaterialDoc[], kind: MaterialDoc["kind"], quote: string, titleIncludes?: string) {
  const doc = docs.find((entry) => entry.kind === kind && (!titleIncludes || entry.title.includes(titleIncludes)))!;
  const paragraph = splitParagraphs(doc.text).findIndex((line) => line.includes(quote));
  if (paragraph < 0) throw new Error(`quote not in doc: ${quote}`);
  return { docId: doc.id, paragraph, quote };
}

function usage() {
  return { inputTokens: 1000, outputTokens: 500, totalTokens: 1500 };
}

class FakeAi implements PackAiGateway {
  assessCalls = 0;
  generateCalls: Array<{ slots: readonly PackSlotId[]; retryNotes?: unknown }> = [];
  reviseCalls = 0;
  assessImpl: () => Promise<PackAiResult<AiAssessment>>;
  generateImpl: (slots: readonly PackSlotId[], attempt: number) => Promise<PackAiResult<{ cards: AiCard[] }>>;
  reviseImpl: (attempt: number) => Promise<PackAiResult<{ cards: AiCard[] }>>;

  constructor(private readonly docs: MaterialDoc[]) {
    this.assessImpl = async () => ({ output: this.goodAssessment(), responseId: "resp-a", usage: usage(), model: "test-model" });
    this.generateImpl = async (slots) => ({ output: { cards: slots.map((slot) => this.goodCard(slot)) }, responseId: "resp-g", usage: usage(), model: "test-model" });
    this.reviseImpl = async () => ({ output: { cards: [this.goodCard("intro_30", "짧게 줄인 답변입니다. 검사보조로 체크리스트를 만들어 누락 기록을 8건에서 2건으로 줄였습니다.")] }, responseId: "resp-r", usage: usage(), model: "test-model" });
  }

  goodAssessment(): AiAssessment {
    const role = ref(this.docs, "resume", "품질팀 검사보조");
    const metric = ref(this.docs, "experience", "필수 항목이 빠진 기록이 8건", "EXPERIENCE-01");
    return {
      facts: [
        { id: "F1", kind: "role", statement: "품질팀 검사보조", source: role },
        { id: "F2", kind: "metric", statement: "누락 기록 8건→2건", source: metric },
      ],
      conflicts: [],
      slots: PACK_SLOT_IDS.map((slot) => ({
        slot,
        status: slot === "weakness" ? ("needs_material" as const) : ("ready" as const),
        reason: slot === "weakness" ? "약점을 밝힌 자료가 없습니다" : "자료가 있음",
        questions: slot === "weakness" ? ["스스로 부족하다고 느낀 점을 적어 주세요."] : [],
        factIds: slot === "weakness" ? [] : ["F1", "F2"],
      })),
    };
  }

  goodCard(slot: PackSlotId, answer?: string): AiCard {
    const role = ref(this.docs, "resume", "품질팀 검사보조");
    const openers: Record<PackSlotId, string> = {
      intro_30: "검사 기록의 빈칸을 끝까지 확인하는 품질관리 지원자입니다",
      intro_60: "안녕하세요. 저는 품질관리 직무에 지원한 지원자입니다",
      motivation_company: "공고의 공정검사 기록 관리 업무가 제 경험과 맞닿아 있어 지원했습니다",
      aspiration: "입사 후에는 먼저 검사기준과 기록 체계를 익히겠습니다",
      motivation_role: "기록을 정리하고 조치를 끝까지 확인하는 일이 저에게 잘 맞았습니다",
      strength: "제 강점은 자료를 항목별로 정리하고 누락을 확인하는 습관입니다",
      weakness: "작은 항목을 오래 확인하다 우선순위를 늦게 정한 적이 있습니다",
      role_experience: "샘플파트 품질팀에서 검사표 작성과 기록 누락 확인을 맡았습니다",
      problem_solving: "근무조마다 검사 항목 이름이 달라 확인을 반복하는 문제가 있었습니다",
      collaboration: "생산 담당자가 기록 시간이 늘 수 있다고 우려해 의견을 들었습니다",
      closing: "정확한 기록으로 팀에 도움이 되는 사람이 되겠습니다",
    };
    const bodies: Partial<Record<PackSlotId, string>> = {
      intro_30: "검사보조로 체크리스트를 만들어 누락 기록을 8건에서 2건으로 줄인 경험이 있습니다. 이 꼼꼼함으로 기록 관리에 기여하겠습니다.",
      intro_60: "샘플파트 품질팀에서 검사보조로 일하며 검사 기록을 정리했습니다. 기록이 빠진 항목을 모아 체크리스트 초안을 만들었고, 선임과 팀장님의 검토를 받았습니다. 그 결과 누락 기록이 8건에서 2건으로 줄었습니다. 이 경험을 살려 정확한 기록과 협업에 기여하겠습니다.",
    };
    const text = answer ?? `${openers[slot]}. ${bodies[slot] ?? `검사보조로 일하며 체크리스트를 정리해 누락 기록을 8건에서 2건으로 줄였습니다. 이 경험이 이 항목의 근거입니다.`}`;
    const sentences = text.split(/(?<=[.!?])\s+/);
    return {
      slot,
      answer: text,
      keywords: ["검사보조", "체크리스트", "8건에서 2건"].filter((keyword) => text.includes(keyword)).concat(["검사보조", "체크리스트", "8건에서 2건"]).slice(0, 3),
      steps: [
        { label: "시작", sentence: sentences[0] },
        { label: "경험", sentence: sentences[1] ?? sentences[0] },
      ],
      memoryLine: "검사보조 → 체크리스트 → 8건에서 2건",
      followUps: ["본인이 직접 한 일은 무엇인가요?", "2건이 남은 이유는 무엇인가요?"],
      evidence: [role],
      usedFactIds: ["F1", "F2"],
    };
  }

  async assess() {
    this.assessCalls += 1;
    return this.assessImpl();
  }
  async generate(input: { slots: readonly PackSlotId[]; retryNotes?: unknown }) {
    this.generateCalls.push({ slots: input.slots, retryNotes: input.retryNotes });
    return this.generateImpl(input.slots, this.generateCalls.length);
  }
  async revise() {
    this.reviseCalls += 1;
    return this.reviseImpl(this.reviseCalls);
  }
  get totalCalls() {
    return this.assessCalls + this.generateCalls.length + this.reviseCalls;
  }
}

/** 가짜 AI 가 실제로 호출에 들어온 순간까지 기다리게 해 주는 문. */
function gate() {
  let release!: () => void;
  let entered!: () => void;
  const open = new Promise<void>((resolve) => { release = resolve; });
  const reached = new Promise<void>((resolve) => { entered = resolve; });
  return { open, release, entered, reached };
}

let repo: MemoryPackRepository;
let docs: MaterialDoc[];
let ai: FakeAi;
let service: InterviewPackService;
let key = 0;
const nextKey = () => `req-key-${String((key += 1)).padStart(6, "0")}`;

function build(options: { aiEnabled?: boolean; env?: Record<string, string> } = {}) {
  service = new InterviewPackService({
    repo,
    ai: options.aiEnabled === false ? null : ai,
    model: { model: "test-model" },
    config: resolveInterviewPackConfig({ INTERVIEW_PACK_ELIGIBLE_FROM: "all", ...options.env }),
  });
}

beforeEach(() => {
  repo = new MemoryPackRepository();
  docs = docsOf("complete");
  ai = new FakeAi(getPackSampleDocsWithIds(docs));
  repo.addRun(RUN, makeRun({ ownerUserId: USER, docs, company: "샘플모빌리티 주식회사(가상기업)", role: "자동차 부품 품질관리" }));
  build();
});

/** 서비스가 문서 id 를 D1.. 로 다시 매기므로, 가짜 AI 가 인용할 때도 같은 id 를 써야 한다. */
function getPackSampleDocsWithIds(source: MaterialDoc[]): MaterialDoc[] {
  const order = ["job_posting", "resume", "cover_letter", "experience", "note", "certificate", "other"];
  return [...source].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)).map((doc, index) => ({ ...doc, id: `D${index + 1}` }));
}

async function openAndCheck(): Promise<PackState> {
  const opened = await service.openForRun(USER, RUN);
  const checked = await service.check(USER, opened.pack.id, nextKey());
  return checked.state;
}

describe("열기 — 권한과 정책", () => {
  it("기존 구매자 적용 정책이 닫혀 있으면 실제 구매 건에는 열지 않는다(소급 발급 금지)", async () => {
    build({ env: { INTERVIEW_PACK_ELIGIBLE_FROM: "none" } });
    await expect(service.openForRun(USER, RUN)).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
    expect(repo.packs.size).toBe(0);
  });

  it("정책 날짜 이전에 끝난 결과는 열리지 않고 이후 결과는 열린다", async () => {
    build({ env: { INTERVIEW_PACK_ELIGIBLE_FROM: "2026-10-01T00:00:00Z" } });
    await expect(service.openForRun(USER, RUN)).rejects.toMatchObject({ code: "NOT_ELIGIBLE" });
    build({ env: { INTERVIEW_PACK_ELIGIBLE_FROM: "2026-09-01T00:00:00Z" } });
    await expect(service.openForRun(USER, RUN)).resolves.toBeTruthy();
  });

  it("테스트 이용권으로 만든 FINAL 은 정책과 상관없이 열린다", async () => {
    build({ env: { INTERVIEW_PACK_ELIGIBLE_FROM: "none" } });
    const testRun = "44444444-4444-4444-8444-444444444444";
    repo.addRun(testRun, makeRun({ ownerUserId: USER, docs, accessSource: "admin_test", company: "C", role: "R" }));
    const state = await service.openForRun(USER, testRun);
    expect(state.pack.isTest).toBe(true);
    expect(state.pack.accessSource).toBe("admin_test");
    expect(state.testBudget?.dailyLimit).toBe(30);
  });

  it("QUICK·미완료·남의 결과에는 새 생성 경로가 막힌다", async () => {
    const quick = "55555555-5555-4555-8555-555555555555";
    const pending = "66666666-6666-4666-8666-666666666666";
    repo.addRun(quick, makeRun({ ownerUserId: USER, docs, product: "QUICK" }));
    repo.addRun(pending, makeRun({ ownerUserId: USER, docs, status: "RUNNING" }));
    await expect(service.openForRun(USER, quick)).rejects.toMatchObject({ code: "NOT_FINAL" });
    await expect(service.openForRun(USER, pending)).rejects.toMatchObject({ code: "NOT_COMPLETED" });
    await expect(service.openForRun(OTHER, RUN)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repo.packs.size).toBe(0);
  });

  it("남의 팩은 조회·점검·생성 어느 것도 할 수 없다", async () => {
    const opened = await service.openForRun(USER, RUN);
    await expect(service.getState(OTHER, opened.pack.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.check(OTHER, opened.pack.id, nextKey())).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.generate(OTHER, opened.pack.id, nextKey(), "initial")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.saveSupplements(OTHER, opened.pack.id, {})).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(ai.totalCalls).toBe(0);
  });

  it("열면 원본 자료가 1번 버전으로 복사되고 다시 열어도 같은 팩이다", async () => {
    const first = await service.openForRun(USER, RUN);
    const second = await service.openForRun(USER, RUN);
    expect(second.pack.id).toBe(first.pack.id);
    expect(repo.packs.size).toBe(1);
    expect(first.materials.company).toBe("샘플모빌리티 주식회사(가상기업)");
    expect(first.materials.role).toBe("자동차 부품 품질관리");
    expect(first.materials.docs.length).toBe(9);
    expect(first.materials.docs.map((doc) => doc.id)).toEqual(["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8", "D9"]);
    expect(first.materials.docs[0].kind).toBe("job_posting");
  });

  it("열기·조회·탭 전환은 AI 를 부르지 않는다", async () => {
    const opened = await service.openForRun(USER, RUN);
    await service.getState(USER, opened.pack.id);
    await service.getState(USER, opened.pack.id);
    expect(ai.totalCalls).toBe(0);
    expect(repo.ledger).toHaveLength(0);
  });
});

describe("자료 보완(AI 없음)", () => {
  it("보완 내용은 새 버전으로 저장되고 원본 1번은 그대로다", async () => {
    const opened = await service.openForRun(USER, RUN);
    const saved = await service.saveSupplements(USER, opened.pack.id, { supplements: { applyReason: "기록을 끝까지 확인하는 일이 잘 맞았습니다.", company: "샘플모빌리티(수정)" } });
    expect(saved.state.pack.materialsVersion).toBe(2);
    expect(saved.state.materials.company).toBe("샘플모빌리티(수정)");
    const versions = repo.materials.get(opened.pack.id)!;
    expect(versions).toHaveLength(2);
    expect(versions[0].payload.supplements).toEqual({});
    expect(versions[0].payload.documents).toHaveLength(9);
    expect(versions[1].payload.documents).toBeUndefined();
    expect(saved.state.materials.docs.some((doc) => doc.id === "U")).toBe(true);
    expect(ai.totalCalls).toBe(0);
  });

  it("같은 내용을 다시 저장하면 새 버전을 만들지 않는다", async () => {
    const opened = await service.openForRun(USER, RUN);
    await service.saveSupplements(USER, opened.pack.id, { supplements: { applyReason: "지원 이유입니다 정말로." } });
    const again = await service.saveSupplements(USER, opened.pack.id, { supplements: { applyReason: "지원 이유입니다 정말로." } });
    expect(again.state.pack.materialsVersion).toBe(2);
    expect(again.notice).toContain("바뀐 내용이 없어");
  });

  it("빈 값으로 저장해도 이전에 채운 값을 지우지 않는다", async () => {
    const opened = await service.openForRun(USER, RUN);
    await service.saveSupplements(USER, opened.pack.id, { supplements: { applyReason: "지원 이유입니다 정말로." } });
    const next = await service.saveSupplements(USER, opened.pack.id, { supplements: { applyReason: "", exclude: "약점 이야기는 빼 주세요" } });
    expect(next.state.materials.supplements.applyReason).toBe("지원 이유입니다 정말로.");
    expect(next.state.materials.supplements.exclude).toBe("약점 이야기는 빼 주세요");
  });

  it("클라이언트가 보낸 충돌 확인 문구가 아니라 서버가 가진 원문으로 확인 내용을 채운다", async () => {
    const conflicting = docsOf("conflicting");
    const runC = "77777777-7777-4777-8777-777777777777";
    repo.addRun(runC, makeRun({ ownerUserId: USER, docs: conflicting, company: "샘플모빌리티", role: "품질관리" }));
    const fakeAi = new FakeAi(getPackSampleDocsWithIds(conflicting));
    const ordered = getPackSampleDocsWithIds(conflicting);
    const resume = ordered.find((doc) => doc.kind === "resume")!;
    const cover = ordered.find((doc) => doc.kind === "cover_letter")!;
    fakeAi.assessImpl = async () => ({
      output: {
        facts: [{ id: "F1", kind: "role", statement: "검사보조", source: ref(ordered, "resume", "품질팀 검사보조, 팀원") }],
        conflicts: [{
          topic: "period", summary: "재직기간이 다릅니다",
          left: { docId: resume.id, paragraph: splitParagraphs(resume.text).findIndex((line) => line.includes("1년 6개월")), quote: "2024년 7월 1일~2025년 12월 31일, 총 1년 6개월" },
          right: { docId: cover.id, paragraph: 0, quote: "2023년 1월 1일부터 2025년 12월 31일까지 3년간 근무했습니다" },
        }],
        slots: PACK_SLOT_IDS.map((slot) => ({ slot, status: "ready" as const, reason: "가능", questions: [], factIds: ["F1"] })),
      },
      responseId: "r", usage: usage(), model: "test-model",
    });
    service = new InterviewPackService({ repo, ai: fakeAi, model: { model: "test-model" }, config: resolveInterviewPackConfig({ INTERVIEW_PACK_ELIGIBLE_FROM: "all" }) });
    const opened = await service.openForRun(USER, runC);
    const checked = (await service.check(USER, opened.pack.id, nextKey())).state;
    expect(checked.assessment!.conflicts).toHaveLength(1);
    expect(checked.assessment!.unresolvedConflictCount).toBe(1);
    expect(checked.assessment!.slots.find((slot) => slot.slot === "intro_30")?.status).toBe("needs_confirmation");
    expect(checked.assessment!.slots.find((slot) => slot.slot === "aspiration")?.status).toBe("ready");

    // 존재하지 않는 충돌 id 는 거절한다.
    await expect(service.saveSupplements(USER, opened.pack.id, { confirmations: [{ conflictId: "C-deadbeef", choice: "left" }] })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(service.saveSupplements(USER, opened.pack.id, { confirmations: [{ conflictId: checked.assessment!.conflicts[0].id, choice: "custom" }] })).rejects.toMatchObject({ code: "VALIDATION" });

    const callsBefore = fakeAi.totalCalls;
    const resolved = await service.saveSupplements(USER, opened.pack.id, { confirmations: [{ conflictId: checked.assessment!.conflicts[0].id, choice: "left" }] });
    // 서버가 원문(이력서 쪽 문단)에서 확인 내용을 채웠다.
    const stored = repo.materials.get(opened.pack.id)!.at(-1)!.payload.confirmations[0];
    expect(stored.chosenText).toContain("1년 6개월");
    expect(stored.rejectedText).toContain("3년간");
    // AI 호출 없이 상태가 풀리고 새 버전 기준 점검 결과가 된다.
    expect(fakeAi.totalCalls).toBe(callsBefore);
    expect(resolved.state.assessment!.stale).toBe(false);
    expect(resolved.state.assessment!.unresolvedConflictCount).toBe(0);
    expect(resolved.state.assessment!.slots.find((slot) => slot.slot === "intro_30")?.status).toBe("ready");
  });
});

describe("점검(AI) — 생성권을 깎지 않는다", () => {
  it("점검은 AI 를 한 번 부르고 결과를 저장하며 점검 횟수만 센다", async () => {
    const state = await openAndCheck();
    expect(ai.assessCalls).toBe(1);
    expect(state.assessment).not.toBeNull();
    expect(state.assessment!.stale).toBe(false);
    expect(state.usage.initial.used).toBe(0);
    expect(state.usage.edit.used).toBe(0);
    expect(state.usage.check).toMatchObject({ used: 1, limit: 5 });
    const byId = new Map(state.assessment!.slots.map((slot) => [slot.slot, slot]));
    expect(byId.get("intro_30")?.status).toBe("ready");
    expect(byId.get("weakness")?.status).toBe("needs_material");
    expect(byId.get("weakness")?.questions.length).toBeGreaterThan(0);
  });

  it("같은 요청 키로 다시 보내면 AI 를 다시 부르지 않고 저장된 결과를 돌려준다", async () => {
    const opened = await service.openForRun(USER, RUN);
    const requestKey = nextKey();
    await service.check(USER, opened.pack.id, requestKey);
    const replay = await service.check(USER, opened.pack.id, requestKey);
    expect(replay.replayed).toBe(true);
    expect(ai.assessCalls).toBe(1);
  });

  it("동시에 두 번 눌러도 AI 는 한 번만 호출된다", async () => {
    const opened = await service.openForRun(USER, RUN);
    const door = gate();
    const original = ai.assessImpl;
    ai.assessImpl = async () => { door.entered(); await door.open; return original(); };

    const first = service.check(USER, opened.pack.id, nextKey());
    await door.reached;
    // 첫 요청이 AI 를 기다리는 동안 두 번째 클릭이 들어온다 — 진행 중 잠금에 걸려 바로 거절된다.
    await expect(service.check(USER, opened.pack.id, nextKey())).rejects.toMatchObject({ code: "BUSY" });
    door.release();
    await expect(first).resolves.toBeTruthy();
    expect(ai.assessCalls).toBe(1);
    expect(repo.usage.filter((row) => row.state === "confirmed")).toHaveLength(1);
  });

  it("점검은 5회까지이고 그 뒤에는 AI 를 부르지 않는다", async () => {
    const opened = await service.openForRun(USER, RUN);
    for (let index = 0; index < 5; index += 1) await service.check(USER, opened.pack.id, nextKey());
    await expect(service.check(USER, opened.pack.id, nextKey())).rejects.toMatchObject({ code: "LIMIT_REACHED" });
    expect(ai.assessCalls).toBe(5);
  });

  it("자료가 없으면 AI 를 부르지 않고 안내한다", async () => {
    const emptyRun = "88888888-8888-4888-8888-888888888888";
    repo.addRun(emptyRun, makeRun({ ownerUserId: USER, docs: [], company: "", role: "" }));
    const opened = await service.openForRun(USER, emptyRun);
    await expect(service.check(USER, opened.pack.id, nextKey())).rejects.toMatchObject({ code: "NO_MATERIALS" });
    expect(ai.totalCalls).toBe(0);
  });

  it("AI 설정이 없으면 점검·생성은 안내하고 읽기는 계속 된다", async () => {
    build({ aiEnabled: false });
    const opened = await service.openForRun(USER, RUN);
    expect(opened.aiAvailable).toBe(false);
    await expect(service.check(USER, opened.pack.id, nextKey())).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    expect((await service.getState(USER, opened.pack.id)).pack.id).toBe(opened.pack.id);
  });
});

describe("실패 복구 — 횟수를 깎지 않는다", () => {
  it("호출이 실패하면 예약이 반납되어 횟수가 그대로이고 원장에는 실패가 남는다", async () => {
    const opened = await service.openForRun(USER, RUN);
    ai.assessImpl = async () => { throw new PackAiProviderError(500, "PROVIDER_HTTP_500"); };
    await expect(service.check(USER, opened.pack.id, nextKey())).rejects.toMatchObject({ code: "AI_FAILED" });
    const state = await service.getState(USER, opened.pack.id);
    expect(state.usage.check.used).toBe(0);
    expect(state.pack.busy).toBeNull();
    expect(repo.ledger).toHaveLength(1);
    expect(repo.ledger[0]).toMatchObject({ outcome: "PROVIDER_FAILED", purpose: "check" });
    // 바로 다시 시도할 수 있다.
    ai.assessImpl = async () => ({ output: ai.goodAssessment(), responseId: "r", usage: usage(), model: "test-model" });
    await expect(service.check(USER, opened.pack.id, nextKey())).resolves.toBeTruthy();
  });

  it("형식이 틀린 응답은 서버가 한 번만 다시 시도하고 그래도 안 되면 실패로 반납한다", async () => {
    const opened = await service.openForRun(USER, RUN);
    ai.assessImpl = async () => { throw new PackAiInvalidOutputError("OUTPUT_EMPTY"); };
    await expect(service.check(USER, opened.pack.id, nextKey())).rejects.toMatchObject({ code: "AI_INVALID" });
    expect(ai.assessCalls).toBe(2);
    expect(repo.ledger.map((entry) => entry.outcome)).toEqual(["INVALID_OUTPUT", "INVALID_OUTPUT"]);
    expect((await service.getState(USER, opened.pack.id)).usage.check.used).toBe(0);
  });

  it("첫 응답이 형식 오류여도 재시도가 성공하면 한 번만 차감된다", async () => {
    const opened = await service.openForRun(USER, RUN);
    const good = ai.assessImpl;
    let attempt = 0;
    ai.assessImpl = async () => { attempt += 1; if (attempt === 1) throw new PackAiInvalidOutputError("OUTPUT_NOT_JSON"); return good(); };
    const result = await service.check(USER, opened.pack.id, nextKey());
    expect(result.state.usage.check.used).toBe(1);
    expect(ai.assessCalls).toBe(2);
  });

  it("생성이 실패하면 최초 생성권이 반납되어 다시 만들 수 있다", async () => {
    const state = await openAndCheck();
    ai.generateImpl = async () => { throw new PackAiProviderError(null, "PROVIDER_TIMEOUT"); };
    await expect(service.generate(USER, state.pack.id, nextKey(), "initial")).rejects.toMatchObject({ code: "AI_FAILED" });
    let after = await service.getState(USER, state.pack.id);
    expect(after.usage.initial.used).toBe(0);
    expect(after.pack.initialGenerated).toBe(false);
    ai.generateImpl = async (slots) => ({ output: { cards: slots.map((slot) => ai.goodCard(slot)) }, responseId: "r", usage: usage(), model: "test-model" });
    await service.generate(USER, state.pack.id, nextKey(), "initial");
    after = await service.getState(USER, state.pack.id);
    expect(after.usage.initial.used).toBe(1);
    expect(after.pack.initialGenerated).toBe(true);
  });

  it("작업이 죽어 예약이 5분 넘게 남으면 만료되어 다시 시도할 수 있고 옛 요청은 저장하지 못한다", async () => {
    const state = await openAndCheck();
    const door = gate();
    const original = ai.generateImpl;
    ai.generateImpl = async (slots, attempt) => { door.entered(); await door.open; return original(slots, attempt); };
    const stuck = service.generate(USER, state.pack.id, nextKey(), "initial");
    stuck.catch(() => undefined);
    await door.reached;
    // 6분이 지났다고 보고, 다른 요청이 이어받는다.
    const start = repo.clock();
    repo.clock = () => start + 6 * 60 * 1000;
    ai.generateImpl = original;
    const second = await service.generate(USER, state.pack.id, nextKey(), "initial");
    expect(second.state.pack.initialGenerated).toBe(true);
    // 옛 요청이 뒤늦게 끝나도 저장하지 못한다.
    door.release();
    await expect(stuck).rejects.toBeInstanceOf(PackServiceError);
    expect(repo.usage.filter((row) => row.kind === "initial" && row.state === "confirmed")).toHaveLength(1);
    expect((await service.getState(USER, state.pack.id)).answers.filter((answer) => answer.slot === "intro_30")).toHaveLength(1);
  });
});

describe("생성 — 자료가 충분한 항목만", () => {
  it("점검하지 않았거나 자료가 바뀐 뒤에는 생성할 수 없다(자동 재생성 없음)", async () => {
    const opened = await service.openForRun(USER, RUN);
    await expect(service.generate(USER, opened.pack.id, nextKey(), "initial")).rejects.toMatchObject({ code: "NEEDS_CHECK" });
    await service.check(USER, opened.pack.id, nextKey());
    await service.saveSupplements(USER, opened.pack.id, { supplements: { emphasis: "검사기록 정리를 강조하고 싶습니다." } });
    await expect(service.generate(USER, opened.pack.id, nextKey(), "initial")).rejects.toMatchObject({ code: "NEEDS_CHECK" });
    expect(ai.generateCalls).toHaveLength(0);
  });

  it("만들 수 있는 항목만 한 번의 호출로 만들고, 부족한 항목은 보완 상태로 남는다", async () => {
    const state = await openAndCheck();
    const result = await service.generate(USER, state.pack.id, nextKey(), "initial");
    expect(ai.generateCalls).toHaveLength(1);
    expect(ai.generateCalls[0].slots).not.toContain("weakness");
    expect(ai.generateCalls[0].slots).toHaveLength(10);
    expect(result.state.answers.map((answer) => answer.slot)).not.toContain("weakness");
    expect(result.state.answers).toHaveLength(10);
    expect(result.state.assessment!.slots.find((slot) => slot.slot === "weakness")?.status).toBe("needs_material");
    expect(result.state.usage.initial).toMatchObject({ used: 1, limit: 1, remaining: 0 });
    expect(result.notice).toContain("보완이 필요한 1개 항목");
    // 첫 화면 순서: 30초, 1분, 지원동기, 포부가 앞이다.
    expect(result.state.answers.slice(0, 4).map((answer) => answer.slot)).toEqual(["intro_30", "intro_60", "motivation_company", "aspiration"]);
    for (const answer of result.state.answers) {
      expect(answer.complete).toBe(true);
      expect(answer.origin).toBe("ai");
      expect(answer.stale).toBe(false);
    }
  });

  it("최초 생성은 한 번뿐이고, 두 번째는 AI 를 부르지 않는다", async () => {
    const state = await openAndCheck();
    await service.generate(USER, state.pack.id, nextKey(), "initial");
    await expect(service.generate(USER, state.pack.id, nextKey(), "initial")).rejects.toMatchObject({ code: "LIMIT_REACHED" });
    expect(ai.generateCalls).toHaveLength(1);
  });

  it("같은 요청 키를 다시 보내도 이중 차감되지 않는다", async () => {
    const state = await openAndCheck();
    const requestKey = nextKey();
    await service.generate(USER, state.pack.id, requestKey, "initial");
    const replay = await service.generate(USER, state.pack.id, requestKey, "initial");
    expect(replay.replayed).toBe(true);
    expect(ai.generateCalls).toHaveLength(1);
    expect(replay.state.usage.initial.used).toBe(1);
  });

  it("보류된 항목은 자료를 보완하고 다시 점검한 뒤 최초 생성권을 더 쓰지 않고 이어서 만든다", async () => {
    let state = await openAndCheck();
    await service.generate(USER, state.pack.id, nextKey(), "initial");
    await service.saveSupplements(USER, state.pack.id, { slotAnswers: [{ slot: "weakness", question: "부족한 점", answer: "작은 항목을 오래 확인하다가 우선순위를 늦게 정한 적이 있습니다." }] });
    ai.assessImpl = async () => {
      const assessment = ai.goodAssessment();
      return { output: { ...assessment, slots: assessment.slots.map((slot) => ({ ...slot, status: "ready" as const, questions: [], factIds: ["F1", "F2"] })) }, responseId: "r", usage: usage(), model: "test-model" };
    };
    state = (await service.check(USER, state.pack.id, nextKey())).state;
    const completed = await service.generate(USER, state.pack.id, nextKey(), "complete");
    expect(ai.generateCalls[1].slots).toEqual(["weakness"]);
    expect(completed.state.answers.map((answer) => answer.slot)).toContain("weakness");
    // 최초 생성권 사용량은 그대로 1/1 이다. 기존 답변은 바뀌지 않았다.
    expect(completed.state.usage.initial.used).toBe(1);
    expect(completed.state.usage.complete.used).toBe(1);
    expect(completed.state.answers.find((answer) => answer.slot === "intro_30")?.revisionNo).toBe(1);
  });

  it("모델이 요청하지 않은 항목이나 중복 항목을 돌려줘도 버린다", async () => {
    const state = await openAndCheck();
    ai.generateImpl = async (slots) => ({
      output: { cards: [...slots.map((slot) => ai.goodCard(slot)), ai.goodCard("weakness"), ai.goodCard("intro_30", "중복으로 온 다른 답변입니다. 검사보조로 일했습니다.")] },
      responseId: "r", usage: usage(), model: "test-model",
    });
    const result = await service.generate(USER, state.pack.id, nextKey(), "initial");
    expect(result.state.answers.map((answer) => answer.slot)).not.toContain("weakness");
    expect(result.state.answers.filter((answer) => answer.slot === "intro_30")).toHaveLength(1);
  });
});

describe("생성 결과 확인 — 자료 밖 내용은 완성 답변이 아니다", () => {
  it("불량률·팀장 같은 지어낸 내용이 나오면 한 번 다시 쓰게 하고, 고쳐지면 그 결과를 저장한다", async () => {
    const state = await openAndCheck();
    let attempt = 0;
    ai.generateImpl = async (slots) => {
      attempt += 1;
      const cards = slots.map((slot) => ai.goodCard(slot));
      if (attempt === 1) {
        // 첫 시도: intro_30 이 제품 불량률과 팀장 역할을 만들어 낸다.
        cards[0] = ai.goodCard("intro_30", "저는 품질팀 팀장으로서 제품 불량률을 30% 줄였습니다. 검사보조로 일하며 검사 기록을 정리했습니다.");
      }
      return { output: { cards }, responseId: "r", usage: usage(), model: "test-model" };
    };
    const result = await service.generate(USER, state.pack.id, nextKey(), "initial");
    expect(ai.generateCalls).toHaveLength(2);
    expect(ai.generateCalls[1].slots).toEqual(["intro_30"]);
    expect(JSON.stringify(ai.generateCalls[1].retryNotes)).toContain("intro_30");
    const intro = result.state.answers.find((answer) => answer.slot === "intro_30")!;
    expect(intro.card.answer).not.toContain("불량률");
    expect(intro.complete).toBe(true);
    // 재시도도 같은 최초 생성권 안에서 일어났다.
    expect(result.state.usage.initial.used).toBe(1);
  });

  it("재시도해도 계속 자료와 맞지 않으면 확인 필요 초안으로 저장하고 완성 답변으로 표시하지 않는다", async () => {
    const state = await openAndCheck();
    ai.generateImpl = async (slots) => ({
      output: { cards: slots.map((slot) => (slot === "aspiration" ? ai.goodCard(slot, "입사 후 제품 불량률을 50% 줄이겠습니다. 검사보조로 일했습니다.") : ai.goodCard(slot))) },
      responseId: "r", usage: usage(), model: "test-model",
    });
    const result = await service.generate(USER, state.pack.id, nextKey(), "initial");
    const aspiration = result.state.answers.find((answer) => answer.slot === "aspiration")!;
    expect(aspiration.complete).toBe(false);
    expect(aspiration.card.issues.some((issue) => issue.severity === "error")).toBe(true);
    expect(result.state.answers.filter((answer) => answer.complete).length).toBe(9);
  });

  it("30초 자기소개가 1분 자기소개를 잘라 붙인 것이면 오류로 잡는다", async () => {
    const state = await openAndCheck();
    const sixty = ai.goodCard("intro_60").answer;
    const half = sixty.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
    ai.generateImpl = async (slots) => ({
      output: { cards: slots.map((slot) => (slot === "intro_30" ? ai.goodCard(slot, half) : slot === "intro_60" ? ai.goodCard(slot, sixty) : ai.goodCard(slot))) },
      responseId: "r", usage: usage(), model: "test-model",
    });
    const result = await service.generate(USER, state.pack.id, nextKey(), "initial");
    const intro30 = result.state.answers.find((answer) => answer.slot === "intro_30")!;
    expect(intro30.card.issues.some((issue) => issue.type === "structure")).toBe(true);
    expect(intro30.complete).toBe(false);
  });
});

describe("선택 답변 AI 수정", () => {
  async function generated() {
    const state = await openAndCheck();
    await service.generate(USER, state.pack.id, nextKey(), "initial");
    return state.pack.id;
  }

  it("수정은 그 항목만 바꾸고 AI 수정 횟수 하나를 쓰며, 이전 버전은 남는다", async () => {
    const packId = await generated();
    const before = (await service.getState(USER, packId)).answers.find((answer) => answer.slot === "intro_30")!;
    const result = await service.revise(USER, packId, { slot: "intro_30", kind: "shorten", requestKey: nextKey() });
    const after = result.state.answers.find((answer) => answer.slot === "intro_30")!;
    expect(after.revisionNo).toBe(before.revisionNo + 1);
    expect(after.origin).toBe("ai_revised");
    expect(after.card.answer).toContain("짧게 줄인");
    expect(result.state.usage.edit).toMatchObject({ used: 1, limit: 3, remaining: 2 });
    expect(result.state.answers.find((answer) => answer.slot === "intro_60")?.revisionNo).toBe(1);
    const revisions = await service.listRevisions(USER, packId, "intro_30");
    expect(revisions.map((revision) => revision.revisionNo)).toEqual([2, 1]);
  });

  it("AI 수정은 3번까지이고 그 뒤에는 AI 를 부르지 않는다", async () => {
    const packId = await generated();
    for (let index = 0; index < 3; index += 1) await service.revise(USER, packId, { slot: "intro_30", kind: "shorten", requestKey: nextKey() });
    await expect(service.revise(USER, packId, { slot: "intro_30", kind: "shorten", requestKey: nextKey() })).rejects.toMatchObject({ code: "LIMIT_REACHED" });
    expect(ai.reviseCalls).toBe(3);
  });

  it("수정본이 자료와 맞지 않으면 기존 답변을 유지하고 횟수를 깎지 않는다", async () => {
    const packId = await generated();
    ai.reviseImpl = async () => ({ output: { cards: [ai.goodCard("intro_30", "저는 팀장으로서 시장점유율을 높였습니다. 검사보조로 일했습니다.")] }, responseId: "r", usage: usage(), model: "test-model" });
    const before = (await service.getState(USER, packId)).answers.find((answer) => answer.slot === "intro_30")!;
    await expect(service.revise(USER, packId, { slot: "intro_30", kind: "custom", customText: "조금 더 자신 있게", requestKey: nextKey() })).rejects.toMatchObject({ code: "VERIFICATION_FAILED" });
    const after = await service.getState(USER, packId);
    expect(after.answers.find((answer) => answer.slot === "intro_30")?.revisionNo).toBe(before.revisionNo);
    expect(after.usage.edit.used).toBe(0);
    // 재시도까지 두 번 호출되었고 원장에 남았다.
    expect(ai.reviseCalls).toBe(2);
  });

  it("방향 바꾸기는 자기소개에서만 되고, 아직 만들지 않은 항목은 수정할 수 없다", async () => {
    const packId = await generated();
    await expect(service.revise(USER, packId, { slot: "strength", kind: "direction_motivation", requestKey: nextKey() })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(service.revise(USER, packId, { slot: "weakness", kind: "shorten", requestKey: nextKey() })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(service.revise(USER, packId, { slot: "intro_30", kind: "custom", customText: "", requestKey: nextKey() })).rejects.toMatchObject({ code: "VALIDATION" });
    expect(ai.reviseCalls).toBe(0);
  });

  it("최초 생성 전에는 AI 수정을 예약할 수 없다", async () => {
    const state = await openAndCheck();
    await expect(service.revise(USER, state.pack.id, { slot: "intro_30", kind: "shorten", requestKey: nextKey() })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("직접 수정·복원·연습 — AI 도 이용권도 쓰지 않는다", () => {
  async function generatedPack() {
    const state = await openAndCheck();
    await service.generate(USER, state.pack.id, nextKey(), "initial");
    return state.pack.id;
  }

  it("직접 수정은 사용자 수정본으로 저장되고 키워드·근거 상태가 갱신되며 AI 를 부르지 않는다", async () => {
    const packId = await generatedPack();
    const callsBefore = ai.totalCalls;
    const current = (await service.getState(USER, packId)).answers.find((answer) => answer.slot === "intro_30")!;
    const result = await service.editAnswer(USER, packId, { slot: "intro_30", baseRevision: current.revisionNo, answer: "검사보조로 일하며 체크리스트 초안을 만들었습니다. 누락 기록이 75% 줄었습니다." });
    const edited = result.state.answers.find((answer) => answer.slot === "intro_30")!;
    expect(edited.origin).toBe("user_edited");
    expect(edited.card.keywords.find((keyword) => keyword.text === "8건에서 2건")?.sentenceIndex).toBeNull();
    expect(edited.card.issues.some((issue) => issue.type === "unsupported_number")).toBe(true);
    expect(edited.card.issues.every((issue) => issue.severity === "warn")).toBe(true);
    expect(ai.totalCalls).toBe(callsBefore);
    expect(result.state.usage.edit.used).toBe(0);
  });

  it("다른 곳에서 먼저 고쳤다면 오래된 판 기준의 수정은 거절한다", async () => {
    const packId = await generatedPack();
    const current = (await service.getState(USER, packId)).answers.find((answer) => answer.slot === "intro_30")!;
    await service.editAnswer(USER, packId, { slot: "intro_30", baseRevision: current.revisionNo, answer: "첫 번째 수정본입니다. 검사보조로 일했습니다." });
    await expect(service.editAnswer(USER, packId, { slot: "intro_30", baseRevision: current.revisionNo, answer: "두 번째 수정본입니다. 검사보조로 일했습니다." })).rejects.toMatchObject({ code: "STALE_REVISION" });
  });

  it("이전 버전 복원은 새 판으로 쌓이고 사용량을 늘리지 않는다", async () => {
    const packId = await generatedPack();
    const first = (await service.getState(USER, packId)).answers.find((answer) => answer.slot === "intro_30")!;
    const edited = await service.editAnswer(USER, packId, { slot: "intro_30", baseRevision: first.revisionNo, answer: "수정본입니다. 검사보조로 일하며 기록을 정리했습니다." });
    const revisionNow = edited.state.answers.find((answer) => answer.slot === "intro_30")!.revisionNo;
    const restored = await service.restoreAnswer(USER, packId, { slot: "intro_30", revisionNo: first.revisionNo, baseRevision: revisionNow });
    const after = restored.state.answers.find((answer) => answer.slot === "intro_30")!;
    expect(after.origin).toBe("restored");
    expect(after.card.answer).toBe(first.card.answer);
    expect(after.revisionNo).toBe(revisionNow + 1);
    expect(restored.state.usage.edit.used).toBe(0);
  });

  it("자료가 바뀐 뒤 기존 답변에는 이전 자료 기준 표시가 붙고 자동으로 다시 만들지 않는다", async () => {
    const packId = await generatedPack();
    const generationCalls = ai.generateCalls.length;
    const saved = await service.saveSupplements(USER, packId, { supplements: { contribution: "선임과 함께 기록 누락을 정리하고 싶습니다." } });
    expect(saved.state.answers.every((answer) => answer.stale)).toBe(true);
    expect(saved.state.assessment!.stale).toBe(true);
    expect(ai.generateCalls.length).toBe(generationCalls);
  });

  it("환불·회수로 새 생성이 막혀도 이미 받은 답변의 조회와 직접 수정은 된다", async () => {
    const packId = await generatedPack();
    const run = repo.runs.get(RUN)!;
    run.access = { allowed: false, reason: "ORDER_NOT_PAID" };
    await expect(service.check(USER, packId, nextKey())).rejects.toMatchObject({ code: "ACCESS_DENIED" });
    const state = await service.getState(USER, packId);
    expect(state.answers).toHaveLength(10);
    const current = state.answers.find((answer) => answer.slot === "intro_30")!;
    await expect(service.editAnswer(USER, packId, { slot: "intro_30", baseRevision: current.revisionNo, answer: "환불 뒤에도 직접 고칠 수 있는 답변입니다." })).resolves.toBeTruthy();
  });
});

describe("관리자 테스트 팩", () => {
  async function snapshotPack(company = "샘플모빌리티", role = "품질관리") {
    const created = await repo.createAdminSnapshotPack({
      ownerUserId: USER,
      materials: { schema: 1, baseVersion: null, documents: getPackSampleDocsWithIds(docs), base: { company, role }, supplements: {}, slotAnswers: [], confirmations: [] },
      limits: resolveInterviewPackConfig({}).limits,
      label: "샘플 A", clonedFromRunId: null,
    });
    return created.packId;
  }

  it("스냅샷 팩도 같은 점검·생성 로직과 한도를 탄다", async () => {
    const packId = await snapshotPack();
    const state = (await service.check(USER, packId, nextKey())).state;
    expect(state.pack.isTest).toBe(true);
    expect(state.pack.origin).toBe("admin_snapshot");
    await service.generate(USER, packId, nextKey(), "initial");
    await expect(service.generate(USER, packId, nextKey(), "initial")).rejects.toMatchObject({ code: "LIMIT_REACHED" });
  });

  it("하루 실제-AI 테스트 한도에 도달하면 AI 를 부르기 전에 막는다", async () => {
    build({ env: { INTERVIEW_PACK_TEST_DAILY_AI_CALLS: "2" } });
    const packId = await snapshotPack();
    await service.check(USER, packId, nextKey());
    await service.check(USER, packId, nextKey());
    await expect(service.check(USER, packId, nextKey())).rejects.toMatchObject({ code: "TEST_DAILY_LIMIT" });
    expect(ai.assessCalls).toBe(2);
    const state = await service.getState(USER, packId);
    expect(state.testBudget).toMatchObject({ dailyLimit: 2, usedToday: 2, remaining: 0 });
    expect(state.testBudget?.tokenLimits.generate).toBeGreaterThan(0);
  });

  it("실제 구매 팩에는 테스트 한도가 적용되지 않고 테스트 예산 정보도 없다", async () => {
    build({ env: { INTERVIEW_PACK_TEST_DAILY_AI_CALLS: "1" } });
    const state = await openAndCheck();
    expect(state.testBudget).toBeNull();
    await service.check(USER, state.pack.id, nextKey());
    expect(ai.assessCalls).toBe(2);
  });

  it("초기화하면 팩·답변·사용량은 지워지지만 AI 호출 원장과 하루 한도 기록은 남는다", async () => {
    build({ env: { INTERVIEW_PACK_TEST_DAILY_AI_CALLS: "3" } });
    const packId = await snapshotPack();
    await service.check(USER, packId, nextKey());
    await service.check(USER, packId, nextKey());
    expect(await repo.deleteTestPacks(USER, [packId])).toBe(1);
    expect(repo.packs.has(packId)).toBe(false);
    expect(repo.ledger).toHaveLength(2);
    expect(repo.ledger.every((entry) => entry.packId === null && entry.isTest)).toBe(true);
    // 새 팩을 만들어도 오늘 쓴 호출은 그대로 세어진다.
    const another = await snapshotPack();
    await service.check(USER, another, nextKey());
    await expect(service.check(USER, another, nextKey())).rejects.toMatchObject({ code: "TEST_DAILY_LIMIT" });
  });

  it("초기화는 실제 구매 건의 팩을 지우지 않는다", async () => {
    const opened = await service.openForRun(USER, RUN);
    expect(await repo.deleteTestPacks(USER, [opened.pack.id])).toBe(0);
    expect(repo.packs.has(opened.pack.id)).toBe(true);
  });

  it("진행 중에 초기화되면 늦게 끝난 작업이 결과를 다시 쓰지 못한다", async () => {
    const packId = await snapshotPack();
    const door = gate();
    const original = ai.assessImpl;
    ai.assessImpl = async () => { door.entered(); await door.open; return original(); };
    const running = service.check(USER, packId, nextKey());
    running.catch(() => undefined);
    await door.reached;
    await repo.deleteTestPacks(USER, [packId]);
    door.release();
    await expect(running).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(repo.packs.has(packId)).toBe(false);
    // 비용은 원장에 남는다.
    expect(repo.ledger.some((entry) => entry.purpose === "check" && entry.outcome === "COMPLETED")).toBe(true);
  });
});

describe("오류 메시지와 원장에는 자료 원문이 없다", () => {
  it("원장 기록에는 토큰·모델·결과 코드만 있고 자료 문장은 없다", async () => {
    await openAndCheck();
    const serialized = JSON.stringify(repo.ledger);
    expect(serialized).not.toContain("검사보조");
    expect(serialized).not.toContain("샘플파트");
    expect(repo.ledger[0]).toMatchObject({ outcome: "COMPLETED", model: "test-model", inputTokens: 1000, outputTokens: 500 });
  });

  it("서비스 오류 메시지에는 자료 내용이 실리지 않는다", async () => {
    const opened = await service.openForRun(USER, RUN);
    ai.assessImpl = async () => { throw new PackAiProviderError(500, "PROVIDER_HTTP_500"); };
    const error = await service.check(USER, opened.pack.id, nextKey()).catch((caught) => caught as PackServiceError);
    expect(error).toBeInstanceOf(PackServiceError);
    expect(error.message).not.toContain("검사보조");
    expect(JSON.stringify((error as PackServiceError).detail ?? {})).not.toContain("샘플파트");
  });
});
