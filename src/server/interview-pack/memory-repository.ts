import type {
  FinalHints,
  MaterialDoc,
  MaterialsPayload,
  PackAssessment,
  PackCard,
  PackLimits,
  PackSlotId,
  StoredAnswer,
  UsageKind,
} from "@/domain/interview-pack";
import type {
  AiCallRecord,
  FinalRunSource,
  PackAccessSource,
  PackRecord,
  PackRepository,
  ReserveOutcome,
  RunAccess,
  SavedAnswerInput,
  StoredMaterials,
  UsageCounts,
} from "@/server/interview-pack/types";

/**
 * 면접 준비팩 저장소의 메모리 구현.
 *
 * 두 곳에서 쓴다: 서비스 규칙 테스트, 그리고 브라우저에서 도는 관리자 "화면만 보기" 샘플 모드
 * (네트워크·DB·AI 를 전혀 부르지 않고 같은 서비스 코드를 돌리기 위해).
 *
 * DB 함수의 규칙(소유자 확인, 예약·한도·중복 키·진행 잠금, 초기화 뒤 늦은 저장 거절, 원장 유지)을 같은 모양으로
 * 흉내 낸다. 실제 SQL 은 별도로 진짜 Postgres 에서 검증했고, 여기는 서비스 계층 규칙을 빠르게 돌리기 위한 것이다.
 */

type UsageRow = { id: string; packId: string; ownerUserId: string; kind: UsageKind; requestKey: string; slot: PackSlotId | null; state: "reserved" | "confirmed" | "released"; reservedAt: number };

export type FakeRun = {
  ownerUserId: string;
  product: "QUICK" | "PRO" | "FINAL";
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  completedAt: string | null;
  access: RunAccess;
  source: FinalRunSource;
};

const TTL_MS = 5 * 60 * 1000;

export class MemoryPackRepository implements PackRepository {
  readonly runs = new Map<string, FakeRun>();
  readonly packs = new Map<string, PackRecord & { testGrantActive: boolean }>();
  readonly materials = new Map<string, StoredMaterials[]>();
  readonly answers = new Map<string, StoredAnswer[]>();
  readonly usage: UsageRow[] = [];
  readonly ledger: AiCallRecord[] = [];
  private counter = 0;
  clock = () => Date.now();

  private id(_prefix: string): string {
    this.counter += 1;
    // 실제 DB 처럼 UUID 모양이어야 라우트의 형식 검사를 통과한다.
    return crypto.randomUUID();
  }

  addRun(runId: string, run: FakeRun) {
    this.runs.set(runId, run);
  }

  async getPack(ownerUserId: string, packId: string) {
    const pack = this.packs.get(packId);
    return pack && pack.ownerUserId === ownerUserId ? clone(pack) : null;
  }

  async getPackByRun(ownerUserId: string, analysisRunId: string) {
    for (const pack of this.packs.values()) if (pack.analysisRunId === analysisRunId && pack.ownerUserId === ownerUserId) return clone(pack);
    return null;
  }

  async getMaterials(packId: string, version: number) {
    return clone(this.materials.get(packId)?.find((entry) => entry.version === version) ?? null);
  }

  async listCurrentAnswers(packId: string) {
    const latest = new Map<PackSlotId, StoredAnswer>();
    for (const answer of [...(this.answers.get(packId) ?? [])].sort((a, b) => b.revisionNo - a.revisionNo)) {
      if (!latest.has(answer.slot)) latest.set(answer.slot, answer);
    }
    return clone([...latest.values()]);
  }

  async listAnswerRevisions(packId: string, slot: PackSlotId) {
    return clone((this.answers.get(packId) ?? []).filter((answer) => answer.slot === slot).sort((a, b) => b.revisionNo - a.revisionNo));
  }

  async countUsage(packId: string): Promise<UsageCounts> {
    const counts: UsageCounts = { check: 0, initial: 0, complete: 0, edit: 0 };
    for (const row of this.usage) if (row.packId === packId && this.counts(row)) counts[row.kind] += 1;
    return counts;
  }

  private counts(row: UsageRow) {
    return row.state === "confirmed" || (row.state === "reserved" && row.reservedAt > this.clock() - TTL_MS);
  }

  async getFinalRunSummary(ownerUserId: string, analysisRunId: string) {
    const run = this.runs.get(analysisRunId);
    return run && run.ownerUserId === ownerUserId ? { product: run.product, status: run.status, completedAt: run.completedAt } : null;
  }

  async getRunAccess(ownerUserId: string, analysisRunId: string): Promise<RunAccess> {
    const run = this.runs.get(analysisRunId);
    if (!run || run.ownerUserId !== ownerUserId) return { allowed: false, reason: "RUN_NOT_FOUND" };
    if (run.product !== "FINAL") return { allowed: false, reason: "NOT_FINAL" };
    if (run.status !== "COMPLETED") return { allowed: false, reason: "NOT_COMPLETED" };
    return run.access;
  }

  async loadFinalRunSource(ownerUserId: string, analysisRunId: string) {
    const run = this.runs.get(analysisRunId);
    return run && run.ownerUserId === ownerUserId ? clone(run.source) : null;
  }

  async createPack(input: { ownerUserId: string; analysisRunId: string; materials: MaterialsPayload; limits: PackLimits }) {
    const access = await this.getRunAccess(input.ownerUserId, input.analysisRunId);
    if (!access.allowed) throw Object.assign(new Error(`PACK_NOT_ALLOWED:${access.reason}`), { code: "PACK_NOT_ALLOWED" });
    const existing = await this.getPackByRun(input.ownerUserId, input.analysisRunId);
    if (existing) return { packId: existing.id, created: false };
    const id = this.id("pack");
    this.packs.set(id, {
      id, ownerUserId: input.ownerUserId, origin: "final_run", analysisRunId: input.analysisRunId,
      accessSource: access.accessSource, isTest: access.accessSource === "admin_test", testGrantId: access.testGrantId, label: null,
      materialsVersion: 1, assessment: null, assessmentMaterialsVersion: null, limits: input.limits, initialGeneratedAt: null,
      busyKind: null, busyUntil: null, createdAt: new Date(this.clock()).toISOString(), testGrantActive: access.accessSource === "admin_test",
    });
    this.materials.set(id, [{ version: 1, payload: clone(input.materials) }]);
    return { packId: id, created: true };
  }

  async createAdminSnapshotPack(input: { ownerUserId: string; materials: MaterialsPayload; limits: PackLimits; label: string | null; clonedFromRunId: string | null }) {
    const id = this.id("snap");
    this.packs.set(id, {
      id, ownerUserId: input.ownerUserId, origin: "admin_snapshot", analysisRunId: null, accessSource: "admin_test", isTest: true,
      testGrantId: null, label: input.label, materialsVersion: 1, assessment: null, assessmentMaterialsVersion: null, limits: input.limits,
      initialGeneratedAt: null, busyKind: null, busyUntil: null, createdAt: new Date(this.clock()).toISOString(), testGrantActive: true,
    });
    this.materials.set(id, [{ version: 1, payload: clone(input.materials) }]);
    return { packId: id };
  }

  async saveMaterials(ownerUserId: string, packId: string, payload: MaterialsPayload) {
    const pack = this.mustOwn(ownerUserId, packId);
    const versions = this.materials.get(packId) ?? [];
    const next = versions.length + 1;
    if (next > 30) throw Object.assign(new Error("MATERIAL_VERSION_LIMIT"), { code: "MATERIAL_VERSION_LIMIT" });
    versions.push({ version: next, payload: clone(payload) });
    this.materials.set(packId, versions);
    pack.materialsVersion = next;
    return next;
  }

  async reserveUsage(input: { ownerUserId: string; packId: string; kind: UsageKind; requestKey: string; slot: PackSlotId | null }): Promise<ReserveOutcome> {
    const pack = this.mustOwn(input.ownerUserId, input.packId);
    if (pack.origin === "final_run" && pack.analysisRunId) {
      const run = this.runs.get(pack.analysisRunId);
      const access = run?.access;
      if (!run || !access || !access.allowed) return { outcome: "DENIED", reason: access && !access.allowed ? access.reason : "RUN_NOT_FOUND" };
      if (!pack.testGrantActive && pack.isTest) return { outcome: "DENIED", reason: "TEST_GRANT_REVOKED" };
    }
    const now = this.clock();
    for (const row of this.usage) {
      if (row.packId === pack.id && row.state === "reserved" && row.reservedAt <= now - TTL_MS) row.state = "released";
    }
    const existing = this.usage.find((row) => row.packId === pack.id && row.requestKey === input.requestKey);
    if (existing) return { outcome: "DUPLICATE", usageId: existing.id, state: existing.state, kind: existing.kind };
    if ((input.kind === "complete" || input.kind === "edit") && !pack.initialGeneratedAt) return { outcome: "INITIAL_REQUIRED" };
    if (pack.busyUntil && new Date(pack.busyUntil).getTime() > now) return { outcome: "BUSY", kind: pack.busyKind };
    const limit = pack.limits[input.kind];
    const used = this.usage.filter((row) => row.packId === pack.id && row.kind === input.kind && this.counts(row)).length;
    if (used >= limit) return { outcome: "LIMIT_REACHED", used, limit };
    const usageId = this.id("usage");
    this.usage.push({ id: usageId, packId: pack.id, ownerUserId: input.ownerUserId, kind: input.kind, requestKey: input.requestKey, slot: input.slot, state: "reserved", reservedAt: now });
    pack.busyKind = input.kind;
    pack.busyUntil = new Date(now + TTL_MS).toISOString();
    (pack as { busyRequestKey?: string }).busyRequestKey = input.requestKey;
    return { outcome: "RESERVED", usageId, used: used + 1, limit };
  }

  async settleUsage(ownerUserId: string, usageId: string, state: "released" | "confirmed", _failureCode: string | null) {
    const row = this.usage.find((entry) => entry.id === usageId && entry.ownerUserId === ownerUserId);
    if (!row || row.state !== "reserved") return false;
    row.state = state;
    const pack = this.packs.get(row.packId);
    if (pack && (pack as { busyRequestKey?: string }).busyRequestKey === row.requestKey) {
      pack.busyKind = null;
      pack.busyUntil = null;
      (pack as { busyRequestKey?: string }).busyRequestKey = undefined;
    }
    return true;
  }

  private activeUsage(ownerUserId: string, usageId: string, kinds: UsageKind[]) {
    const row = this.usage.find((entry) => entry.id === usageId && entry.ownerUserId === ownerUserId);
    const pack = row ? this.packs.get(row.packId) : undefined;
    if (!row || !pack || row.state !== "reserved" || !kinds.includes(row.kind)) throw Object.assign(new Error("USAGE_NOT_ACTIVE"), { code: "USAGE_NOT_ACTIVE" });
    return { row, pack };
  }

  async saveAssessment(input: { ownerUserId: string; usageId: string; materialsVersion: number; assessment: PackAssessment }) {
    const { row, pack } = this.activeUsage(input.ownerUserId, input.usageId, ["check"]);
    pack.assessment = clone(input.assessment);
    pack.assessmentMaterialsVersion = input.materialsVersion;
    await this.settleUsage(input.ownerUserId, row.id, "confirmed", null);
  }

  async refreshAssessment(input: { ownerUserId: string; packId: string; materialsVersion: number; assessment: PackAssessment }) {
    const pack = this.mustOwn(input.ownerUserId, input.packId);
    if (!pack.assessment) return false;
    if (pack.busyUntil && new Date(pack.busyUntil).getTime() > this.clock()) throw Object.assign(new Error("PACK_BUSY"), { code: "PACK_BUSY" });
    pack.assessment = clone(input.assessment);
    pack.assessmentMaterialsVersion = input.materialsVersion;
    return true;
  }

  async saveAnswers(input: { ownerUserId: string; usageId: string; materialsVersion: number; cards: SavedAnswerInput[] }) {
    const { row, pack } = this.activeUsage(input.ownerUserId, input.usageId, ["initial", "complete", "edit"]);
    let saved = 0;
    const list = this.answers.get(pack.id) ?? [];
    for (const entry of input.cards) {
      if (row.kind === "edit" && entry.slot !== row.slot) continue;
      if (row.kind === "complete" && list.some((answer) => answer.slot === entry.slot)) continue;
      const revisionNo = Math.max(0, ...list.filter((answer) => answer.slot === entry.slot).map((answer) => answer.revisionNo)) + 1;
      list.push({ id: this.id("ans"), slot: entry.slot, revisionNo, origin: row.kind === "edit" ? "ai_revised" : "ai", materialsVersion: input.materialsVersion, card: clone(entry.card), createdAt: new Date(this.clock()).toISOString() });
      saved += 1;
    }
    this.answers.set(pack.id, list);
    if (row.kind === "initial" && !pack.initialGeneratedAt) pack.initialGeneratedAt = new Date(this.clock()).toISOString();
    await this.settleUsage(input.ownerUserId, row.id, "confirmed", null);
    return saved;
  }

  async saveUserAnswer(input: { ownerUserId: string; packId: string; slot: PackSlotId; origin: "user_edited" | "restored"; baseRevision: number; materialsVersion: number; card: PackCard }) {
    this.mustOwn(input.ownerUserId, input.packId);
    const list = this.answers.get(input.packId) ?? [];
    const current = Math.max(0, ...list.filter((answer) => answer.slot === input.slot).map((answer) => answer.revisionNo));
    if (current === 0) throw Object.assign(new Error("ANSWER_NOT_FOUND"), { code: "ANSWER_NOT_FOUND" });
    if (current !== input.baseRevision) throw Object.assign(new Error("STALE_REVISION"), { code: "STALE_REVISION" });
    list.push({ id: this.id("ans"), slot: input.slot, revisionNo: current + 1, origin: input.origin, materialsVersion: input.materialsVersion, card: clone(input.card), createdAt: new Date(this.clock()).toISOString() });
    this.answers.set(input.packId, list);
    return current + 1;
  }

  async recordAiCall(record: AiCallRecord) {
    this.ledger.push({ ...record });
  }

  async countTestAiCallsSince(sinceIso: string) {
    void sinceIso;
    return this.ledger.filter((entry) => entry.isTest).length;
  }

  async deleteTestPacks(ownerUserId: string, packIds: string[]) {
    let deleted = 0;
    for (const id of packIds) {
      const pack = this.packs.get(id);
      if (!pack || pack.ownerUserId !== ownerUserId || pack.accessSource !== "admin_test") continue;
      this.packs.delete(id);
      this.materials.delete(id);
      this.answers.delete(id);
      for (let index = this.usage.length - 1; index >= 0; index -= 1) if (this.usage[index].packId === id) this.usage.splice(index, 1);
      // 원장은 남고 pack_id 만 비워진다.
      for (const entry of this.ledger) if (entry.packId === id) entry.packId = null;
      deleted += 1;
    }
    return deleted;
  }

  async listTestPacks(ownerUserId: string) {
    return [...this.packs.values()]
      .filter((pack) => pack.ownerUserId === ownerUserId && pack.accessSource === "admin_test")
      .map((pack) => ({ id: pack.id, label: pack.label, origin: pack.origin, analysisRunId: pack.analysisRunId, createdAt: pack.createdAt, initialGeneratedAt: pack.initialGeneratedAt, materialsVersion: pack.materialsVersion }));
  }

  private mustOwn(ownerUserId: string, packId: string) {
    const pack = this.packs.get(packId);
    if (!pack || pack.ownerUserId !== ownerUserId) throw Object.assign(new Error("PACK_NOT_FOUND"), { code: "PACK_NOT_FOUND" });
    return pack;
  }
}

function clone<T>(value: T): T {
  return value === null || value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T);
}

export function makeRun(input: {
  ownerUserId: string;
  docs: MaterialDoc[];
  company?: string;
  role?: string;
  accessSource?: PackAccessSource;
  product?: FakeRun["product"];
  status?: FakeRun["status"];
  completedAt?: string | null;
  hints?: FinalHints;
}): FakeRun {
  const completedAt = input.completedAt === undefined ? "2026-09-27T00:00:00.000Z" : input.completedAt;
  return {
    ownerUserId: input.ownerUserId,
    product: input.product ?? "FINAL",
    status: input.status ?? "COMPLETED",
    completedAt,
    access: { allowed: true, accessSource: input.accessSource ?? "polar", testGrantId: input.accessSource === "admin_test" ? "grant-1" : null, completedAt },
    source: { docs: input.docs, company: input.company ?? "", role: input.role ?? "", hints: input.hints ?? { careerTimeline: [], documentConflicts: [] }, completedAt },
  };
}
