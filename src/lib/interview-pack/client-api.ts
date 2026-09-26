import type { StoredAnswer } from "@/domain/interview-pack";
import type { SupplementInput } from "@/domain/interview-pack-materials";
import { buildBaseMaterials } from "@/domain/interview-pack-materials";
import { resolveInterviewPackConfig } from "@/domain/interview-pack";
import { createCannedGateway, sampleDocs } from "@/fixtures/interview-pack-sample-ai";
import { getPackSample, type PackSampleId } from "@/fixtures/interview-pack-samples";
import { MemoryPackRepository } from "@/server/interview-pack/memory-repository";
import { InterviewPackService, PackServiceError, type ActionResult, type PackErrorCode, type PackState } from "@/server/interview-pack/service";

/**
 * 면접 준비팩 화면이 서버와 이야기하는 방법 두 가지.
 *
 *  - 실제(live): /api/interview-pack 라우트를 fetch 한다. 서버가 로그인·소유권·권한·사용량을 모두 확인한다.
 *  - 샘플(sample): 브라우저 안에서 같은 서비스 코드를 메모리 저장소와 "고정 응답 AI" 로 돌린다.
 *    이 경로에는 fetch 가 한 번도 없다 — 결제·AI·외부 유료 API 를 부를 방법 자체가 없다.
 *
 * 실제 경로가 실패했을 때 샘플 응답으로 대신하는 코드는 어디에도 없다(성공처럼 보이게 하지 않는다).
 */

export type AvailabilityView = { available: boolean; code?: PackErrorCode; reason?: string };
export type LoadResult = { state: PackState | null; availability: AvailabilityView };

export class PackApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
    /** 서버 응답을 받지 못한 경우(연결 끊김 등). 이때는 결과를 알 수 없으므로 같은 요청 키로 다시 보낸다. */
    readonly network = false,
    readonly detail?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PackApiError";
  }
}

export interface PackClientApi {
  load(): Promise<LoadResult>;
  open(): Promise<PackState>;
  saveMaterials(input: SupplementInput): Promise<ActionResult>;
  check(requestKey: string): Promise<ActionResult>;
  generate(requestKey: string, mode: "initial" | "complete"): Promise<ActionResult>;
  edit(input: { slot: string; baseRevision: number; answer: string }): Promise<ActionResult>;
  revise(input: { slot: string; kind: string; customText?: string; requestKey: string }): Promise<ActionResult>;
  restore(input: { slot: string; revisionNo: number; baseRevision: number }): Promise<ActionResult>;
  revisions(slot: string): Promise<StoredAnswer[]>;
}

// ───────────────────────────── 실제 ─────────────────────────────

type Target = { analysisRunId: string } | { packId: string };

async function call<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "content-type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new PackApiError("연결이 끊겼습니다. 네트워크를 확인하고 다시 시도해 주세요.", 0, null, true);
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new PackApiError(
      typeof record.error === "string" ? record.error : "요청을 처리하지 못했습니다.",
      response.status,
      typeof record.code === "string" ? record.code : null,
      false,
      record.detail && typeof record.detail === "object" ? (record.detail as Record<string, unknown>) : undefined,
    );
  }
  return payload as T;
}

export function createLiveApi(target: Target): PackClientApi {
  let packId = "packId" in target ? target.packId : null;
  const requirePackId = () => {
    if (!packId) throw new PackApiError("팩이 아직 만들어지지 않았습니다.", 409, null);
    return packId;
  };
  const base = () => `/api/interview-pack/${requirePackId()}`;

  return {
    async load() {
      try {
        if ("packId" in target) {
          const { state } = await call<{ state: PackState }>(`/api/interview-pack/${target.packId}`);
          return { state, availability: { available: true } };
        }
        const result = await call<LoadResult>(`/api/interview-pack?analysisRunId=${encodeURIComponent(target.analysisRunId)}`);
        if (result.state) packId = result.state.pack.id;
        return result;
      } catch (error) {
        // 404 는 "이 기능이 이 사용자에게 없다"는 뜻이다(플래그 꺼짐·권한 없음). 오류 화면 대신 조용히 숨긴다.
        if (error instanceof PackApiError && error.status === 404) return { state: null, availability: { available: false, reason: "not_offered" } };
        throw error;
      }
    },
    async open() {
      if ("packId" in target) return (await call<{ state: PackState }>(`/api/interview-pack/${target.packId}`)).state;
      const { state } = await call<{ state: PackState }>("/api/interview-pack", { method: "POST", body: { analysisRunId: target.analysisRunId } });
      packId = state.pack.id;
      return state;
    },
    saveMaterials: (input) => call<ActionResult>(`${base()}/materials`, { method: "POST", body: input }),
    check: (requestKey) => call<ActionResult>(`${base()}/check`, { method: "POST", body: { requestKey } }),
    generate: (requestKey, mode) => call<ActionResult>(`${base()}/generate`, { method: "POST", body: { requestKey, mode } }),
    edit: (input) => call<ActionResult>(`${base()}/answers`, { method: "POST", body: { action: "edit", ...input } }),
    revise: (input) => call<ActionResult>(`${base()}/answers`, { method: "POST", body: { action: "revise", ...input } }),
    restore: (input) => call<ActionResult>(`${base()}/answers`, { method: "POST", body: { action: "restore", ...input } }),
    async revisions(slot) {
      return (await call<{ revisions: StoredAnswer[] }>(`${base()}/answers?slot=${encodeURIComponent(slot)}`)).revisions;
    },
  };
}

// ───────────────────────────── 샘플 ─────────────────────────────

const SAMPLE_USER = "00000000-0000-4000-8000-00000000a000";

/**
 * 고정 가상 자료와 고정 응답으로 돌아가는 샘플 API.
 * 같은 서비스 코드를 쓰므로 상태·한도·서버 확인이 실제와 똑같이 움직이지만, 결과 내용은 미리 써 둔 예시다.
 */
export function createSampleApi(sampleId: PackSampleId): PackClientApi {
  const sample = getPackSample(sampleId);
  if (!sample) throw new Error(`unknown sample: ${sampleId}`);

  const repo = new MemoryPackRepository();
  const docs = sampleDocs(sampleId);
  const service = new InterviewPackService({
    repo,
    ai: createCannedGateway(sampleId, docs),
    model: { model: "샘플 고정 응답" },
    // 고정 응답은 유료 호출이 아니므로 "하루 실제 AI 테스트 한도"에 걸리지 않게 한도를 최대로 둔다.
    config: resolveInterviewPackConfig({ INTERVIEW_PACK_TEST_DAILY_AI_CALLS: "500" }),
  });
  let packIdPromise: Promise<string> | null = null;
  const ensurePack = () => {
    packIdPromise ??= repo
      .createAdminSnapshotPack({
        ownerUserId: SAMPLE_USER,
        materials: buildBaseMaterials({ docs: sample.docs, company: sample.company, role: sample.role, hints: { careerTimeline: [], documentConflicts: [] } }),
        limits: resolveInterviewPackConfig({}).limits,
        label: `샘플 · ${sample.title}`,
        clonedFromRunId: null,
      })
      .then((created) => created.packId);
    return packIdPromise;
  };

  async function run<T>(work: (packId: string) => Promise<T>): Promise<T> {
    try {
      return await work(await ensurePack());
    } catch (error) {
      if (error instanceof PackServiceError) throw new PackApiError(error.message, error.status, error.code, false, error.detail);
      throw error;
    }
  }

  // 실제 화면과 같은 첫 화면(‘만들기’ 안내)을 보이려고, 열기 전에는 팩이 없는 것처럼 답한다.
  let opened = false;

  return {
    load: () => run(async (packId) => (opened ? { state: await service.getState(SAMPLE_USER, packId), availability: { available: true } } : { state: null, availability: { available: true } })),
    open: () => run(async (packId) => { opened = true; return service.getState(SAMPLE_USER, packId); }),
    saveMaterials: (input) => run((packId) => service.saveSupplements(SAMPLE_USER, packId, input)),
    check: (requestKey) => run((packId) => service.check(SAMPLE_USER, packId, requestKey)),
    generate: (requestKey, mode) => run((packId) => service.generate(SAMPLE_USER, packId, requestKey, mode)),
    edit: (input) => run((packId) => service.editAnswer(SAMPLE_USER, packId, input)),
    revise: async (input) => {
      try {
        return await run((packId) => service.revise(SAMPLE_USER, packId, input));
      } catch (error) {
        // 고정 응답에 없는 수정 요청. 실제 AI 를 부르지 않는 화면이라는 것을 분명히 알린다.
        if (error instanceof PackApiError && error.code === "AI_FAILED") {
          throw new PackApiError("샘플 화면에는 이 수정 요청의 예시 응답이 없습니다. 실제 AI 를 부르지 않는 화면입니다. (‘조금 줄이기’는 30초 자기소개에서 예시를 볼 수 있어요.)", 422, "SAMPLE_NO_REVISION");
        }
        throw error;
      }
    },
    restore: (input) => run((packId) => service.restoreAnswer(SAMPLE_USER, packId, input)),
    revisions: (slot) => run((packId) => service.listRevisions(SAMPLE_USER, packId, slot)),
  };
}
