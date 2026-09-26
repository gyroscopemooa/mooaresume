import { beforeEach, describe, expect, it } from "vitest";
import { resolveInterviewPackConfig } from "@/domain/interview-pack";
import { getPackSample } from "@/fixtures/interview-pack-samples";
import { MemoryPackRepository, makeRun } from "@/server/interview-pack/memory-repository";
import {
  AdminTestError,
  AdminTestService,
  type AdminTestStore,
  type MaterialSetInput,
} from "./admin-test";

const ADMIN_USER = "11111111-1111-4111-8111-111111111111";
const TESTER_USER = "22222222-2222-4222-8222-222222222222";
const OTHER_USER = "33333333-3333-4333-8333-333333333333";

class MemoryStore implements AdminTestStore {
  sets = new Map<string, { owner: string; input: MaterialSetInput }>();
  users = new Map<string, string>([
    ["admin@example.com", ADMIN_USER],
    ["tester@example.com", TESTER_USER],
    ["stranger@example.com", OTHER_USER],
  ]);
  grants: Array<{ id: string; targetUserId: string; maxUses: number; expiresAt: string; revokedAt: string | null; createdAt: string; note: string | null; issuedBy: string }> = [];
  issueCalls = 0;
  revokeCalls: string[] = [];

  async listSets(owner: string) {
    return [...this.sets.entries()].filter(([, row]) => row.owner === owner).map(([id, row]) => ({ id, name: row.input.name, createdAt: "2026-09-26T00:00:00Z", docCount: row.input.docs.length }));
  }
  async getSet(owner: string, id: string) {
    const row = this.sets.get(id);
    return row && row.owner === owner ? row.input : null;
  }
  async saveSet(owner: string, input: MaterialSetInput) {
    const id = crypto.randomUUID();
    this.sets.set(id, { owner, input });
    return { id };
  }
  async deleteSet(owner: string, id: string) {
    const row = this.sets.get(id);
    if (!row || row.owner !== owner) return false;
    this.sets.delete(id);
    return true;
  }
  async findUserIdByEmail(email: string) {
    return this.users.get(email.toLowerCase()) ?? null;
  }
  async issueGrant(input: { targetUserId: string; issuedByUserId: string; maxUses: number; ttlHours: number; note: string | null }) {
    this.issueCalls += 1;
    const active = this.grants.filter((grant) => grant.targetUserId === input.targetUserId && !grant.revokedAt).length;
    if (active >= 3) throw new Error("TEST_GRANT_TOO_MANY_ACTIVE");
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + input.ttlHours * 3600_000).toISOString();
    this.grants.push({ id, targetUserId: input.targetUserId, maxUses: input.maxUses, expiresAt, revokedAt: null, createdAt: new Date().toISOString(), note: input.note, issuedBy: input.issuedByUserId });
    return { grantId: id, expiresAt, maxUses: input.maxUses };
  }
  async revokeGrant(id: string) {
    this.revokeCalls.push(id);
    const grant = this.grants.find((entry) => entry.id === id);
    if (grant) grant.revokedAt = new Date().toISOString();
    return { entitlementsRevoked: 0 };
  }
  async listGrants(ids: string[]) {
    return this.grants.filter((grant) => ids.includes(grant.targetUserId)).map((grant) => ({ ...grant, usedCount: 0 }));
  }
}

let repo: MemoryPackRepository;
let store: MemoryStore;
let service: AdminTestService;

beforeEach(() => {
  repo = new MemoryPackRepository();
  store = new MemoryStore();
  service = new AdminTestService({ repo, store, config: resolveInterviewPackConfig({}), approvedEmails: ["admin@example.com", "tester@example.com"] });
});

describe("테스트 팩 만들기", () => {
  it("샘플 세 개 모두 가상 FINAL 스냅샷으로 만들어지고 이전 분석 참고는 비어 있다", async () => {
    for (const id of ["complete", "insufficient", "conflicting"]) {
      const { packId } = await service.createSamplePack(ADMIN_USER, id);
      const pack = await repo.getPack(ADMIN_USER, packId);
      expect(pack).toMatchObject({ origin: "admin_snapshot", accessSource: "admin_test", isTest: true, analysisRunId: null });
      const materials = await repo.getMaterials(packId, 1);
      expect(materials!.payload.hints).toEqual({ careerTimeline: [], documentConflicts: [] });
      expect(materials!.payload.documents!.length).toBeGreaterThan(0);
    }
  });

  it("샘플 자료에는 기대 동작(정답 설명)이 들어가지 않는다", async () => {
    for (const id of ["complete", "insufficient", "conflicting"]) {
      const { packId } = await service.createSamplePack(ADMIN_USER, id);
      const text = JSON.stringify(await repo.getMaterials(packId, 1));
      for (const forbidden of ["기대 동작", "만들어서는 안 됩니다", "확인 없이 더 좋아 보이는"]) expect(text).not.toContain(forbidden);
    }
  });

  it("알 수 없는 샘플은 거절한다", async () => {
    await expect(service.createSamplePack(ADMIN_USER, "nope")).rejects.toMatchObject({ code: "SAMPLE_NOT_FOUND" });
  });

  it("팩의 주인은 언제나 호출한 사용자다(다른 계정 이름으로 만들 수 없다)", async () => {
    const { packId } = await service.createSamplePack(TESTER_USER, "complete");
    expect(await repo.getPack(ADMIN_USER, packId)).toBeNull();
    expect((await repo.getPack(TESTER_USER, packId))?.ownerUserId).toBe(TESTER_USER);
  });

  it("저장한 내 자료 세트로 팩을 만들고 남의 세트는 불러올 수 없다", async () => {
    const saved = await service.saveSet(ADMIN_USER, { name: "내 자료", company: "내 회사", role: "내 직무", docs: [{ kind: "resume", title: "이력서", text: "나의 이력서 내용입니다. 충분히 긴 문장입니다." }] });
    const { packId } = await service.createFromSet(ADMIN_USER, saved.id);
    const materials = await repo.getMaterials(packId, 1);
    expect(materials!.payload.base).toEqual({ company: "내 회사", role: "내 직무" });
    expect(materials!.payload.documents![0]).toMatchObject({ id: "D1", kind: "resume", title: "이력서" });
    await expect(service.createFromSet(TESTER_USER, saved.id)).rejects.toMatchObject({ code: "SET_NOT_FOUND" });
    expect(await service.listSets(TESTER_USER)).toEqual([]);
    expect(await service.deleteSet(TESTER_USER, saved.id)).toBe(false);
    expect(await service.deleteSet(ADMIN_USER, saved.id)).toBe(true);
  });

  it("자료 세트 입력을 검증하고 개수를 제한한다", async () => {
    await expect(service.saveSet(ADMIN_USER, { name: "", docs: [] })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(service.saveSet(ADMIN_USER, { name: "x", docs: [{ kind: "resume", title: "t", text: "가".repeat(20_001) }] })).rejects.toMatchObject({ code: "VALIDATION" });
    for (let index = 0; index < 20; index += 1) await service.saveSet(ADMIN_USER, { name: `세트 ${index}`, docs: [{ kind: "note", title: "t", text: "내용" }] });
    await expect(service.saveSet(ADMIN_USER, { name: "21번째", docs: [{ kind: "note", title: "t", text: "내용" }] })).rejects.toMatchObject({ code: "TOO_MANY_SETS" });
  });

  it("내 완료 FINAL 결과를 복제하되 남의 결과·미완료·QUICK 은 복제할 수 없다", async () => {
    const docs = getPackSample("complete")!.docs;
    const mine = "44444444-4444-4444-8444-444444444444";
    const quick = "55555555-5555-4555-8555-555555555555";
    const pending = "66666666-6666-4666-8666-666666666666";
    repo.addRun(mine, makeRun({ ownerUserId: ADMIN_USER, docs, company: "회사", role: "직무", hints: { careerTimeline: ["2024~2025 · 검사보조 (resume)"], documentConflicts: [] } }));
    repo.addRun(quick, makeRun({ ownerUserId: ADMIN_USER, docs, product: "QUICK" }));
    repo.addRun(pending, makeRun({ ownerUserId: ADMIN_USER, docs, status: "RUNNING" }));

    const { packId } = await service.cloneOwnRun(ADMIN_USER, mine);
    const pack = await repo.getPack(ADMIN_USER, packId);
    expect(pack?.isTest).toBe(true);
    expect(pack?.label).toContain("복제");
    // 원본 실행은 그대로다(복제는 읽기만 한다).
    expect(repo.runs.get(mine)?.status).toBe("COMPLETED");
    expect((await repo.getMaterials(packId, 1))!.payload.hints?.careerTimeline).toHaveLength(1);

    await expect(service.cloneOwnRun(TESTER_USER, mine)).rejects.toMatchObject({ code: "RUN_NOT_FOUND" });
    await expect(service.cloneOwnRun(ADMIN_USER, quick)).rejects.toMatchObject({ code: "RUN_NOT_FINAL_COMPLETED" });
    await expect(service.cloneOwnRun(ADMIN_USER, pending)).rejects.toMatchObject({ code: "RUN_NOT_FINAL_COMPLETED" });
  });
});

describe("테스트 이용권 발급·회수", () => {
  it("승인된 계정(자기 자신 포함)에게만 발급되고 임의 계정은 거절된다", async () => {
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "admin@example.com" })).resolves.toMatchObject({ maxUses: 2 });
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "TESTER@example.com", maxUses: 1, ttlHours: 2 })).resolves.toMatchObject({ maxUses: 1 });
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "stranger@example.com" })).rejects.toMatchObject({ code: "NOT_APPROVED" });
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "nobody@example.com" })).rejects.toMatchObject({ code: "NOT_APPROVED" });
    expect(store.issueCalls).toBe(2);
  });

  it("승인 목록에는 있지만 가입하지 않은 계정은 안내한다", async () => {
    service = new AdminTestService({ repo, store, config: resolveInterviewPackConfig({}), approvedEmails: ["ghost@example.com"] });
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "ghost@example.com" })).rejects.toMatchObject({ code: "USER_NOT_FOUND" });
  });

  it("횟수·만료 범위를 벗어난 발급은 거절한다", async () => {
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "tester@example.com", maxUses: 99 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "tester@example.com", ttlHours: 0 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "tester@example.com", ttlHours: 500 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "not-an-email" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("한 계정에 살아 있는 이용권이 3장을 넘으면 안내한다", async () => {
    for (let index = 0; index < 3; index += 1) await service.issueGrant(ADMIN_USER, { targetEmail: "tester@example.com" });
    await expect(service.issueGrant(ADMIN_USER, { targetEmail: "tester@example.com" })).rejects.toMatchObject({ code: "GRANT_LIMIT" });
  });

  it("발급자·대상·만료를 남기고 목록에는 승인된 계정 것만 보인다", async () => {
    await service.issueGrant(ADMIN_USER, { targetEmail: "tester@example.com", note: "회귀 점검" });
    // 승인되지 않은 계정에 (직접 저장소로) 만들어진 이용권은 화면 목록에 나오지 않는다.
    await store.issueGrant({ targetUserId: OTHER_USER, issuedByUserId: ADMIN_USER, maxUses: 1, ttlHours: 1, note: null });
    const rows = await service.listGrants();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ targetEmail: "tester@example.com", note: "회귀 점검", usedCount: 0 });
    expect(store.grants[0].issuedBy).toBe(ADMIN_USER);
  });

  it("회수는 승인된 계정의 이용권만 되고 승인되지 않은 계정의 이용권은 건드리지 않는다", async () => {
    const issued = await service.issueGrant(ADMIN_USER, { targetEmail: "tester@example.com" });
    const foreign = await store.issueGrant({ targetUserId: OTHER_USER, issuedByUserId: ADMIN_USER, maxUses: 1, ttlHours: 1, note: null });
    await expect(service.revokeGrant(foreign.grantId)).rejects.toMatchObject({ code: "GRANT_NOT_FOUND" });
    await expect(service.revokeGrant("not-a-uuid")).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(service.revokeGrant(issued.grantId)).resolves.toEqual({ entitlementsRevoked: 0 });
    expect(store.revokeCalls).toEqual([issued.grantId]);
  });

  it("발급은 결제 주문을 만들지 않는다(주문 저장소 접근 자체가 없다)", () => {
    // AdminTestStore 에는 주문·영수증·매출을 다루는 메서드가 없다 — 인터페이스가 그 사실을 고정한다.
    const methods = Object.getOwnPropertyNames(MemoryStore.prototype).filter((name) => name !== "constructor");
    expect(methods.some((name) => /order|receipt|revenue|paid|purchase/i.test(name))).toBe(false);
  });
});

describe("초기화", () => {
  it("선택한 테스트 팩만 지우고 실제 구매 팩과 남의 팩은 지우지 않는다", async () => {
    const docs = getPackSample("complete")!.docs;
    const real = "77777777-7777-4777-8777-777777777777";
    repo.addRun(real, makeRun({ ownerUserId: ADMIN_USER, docs, accessSource: "polar" }));
    const realPack = (await repo.createPack({ ownerUserId: ADMIN_USER, analysisRunId: real, materials: { schema: 1, baseVersion: null, documents: docs, supplements: {}, slotAnswers: [], confirmations: [] }, limits: resolveInterviewPackConfig({}).limits })).packId;
    const mine = (await service.createSamplePack(ADMIN_USER, "complete")).packId;
    const others = (await service.createSamplePack(TESTER_USER, "complete")).packId;

    expect(await service.resetPacks(ADMIN_USER, [realPack, mine, others])).toBe(1);
    expect(repo.packs.has(realPack)).toBe(true);
    expect(repo.packs.has(mine)).toBe(false);
    expect(repo.packs.has(others)).toBe(true);
  });

  it("형식이 잘못된 id 는 거절한다", async () => {
    await expect(service.resetPacks(ADMIN_USER, ["nope"])).rejects.toBeTruthy();
    expect(AdminTestError).toBeTruthy();
  });
});
