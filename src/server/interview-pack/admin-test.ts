import { z } from "zod";
import {
  isApprovedTestAccount,
  type InterviewPackConfig,
  type MaterialDoc,
  type PackDocKind,
} from "@/domain/interview-pack";
import { buildBaseMaterials } from "@/domain/interview-pack-materials";
import { getPackSample } from "@/fixtures/interview-pack-samples";
import type { PackRepository } from "./types";

/**
 * 관리자 무결제 테스트 — 샘플/저장한 자료/내 FINAL 결과로 테스트 팩 만들기, 테스트 이용권 발급·회수, 초기화.
 *
 * 모든 동작은 "이미 서버가 확인한 관리자 + 승인된 테스트 계정 + 로그인 세션 사용자" 만 부를 수 있고(라우트가 확인),
 * 여기서도 한 번 더 승인 목록을 확인한다. 실제 결제·주문·매출은 어디에서도 만들지 않는다.
 */

export type AdminTestErrorCode =
  | "NOT_APPROVED"
  | "USER_NOT_FOUND"
  | "SAMPLE_NOT_FOUND"
  | "SET_NOT_FOUND"
  | "RUN_NOT_FOUND"
  | "RUN_NOT_FINAL_COMPLETED"
  | "TOO_MANY_SETS"
  | "VALIDATION"
  | "GRANT_NOT_FOUND"
  | "GRANT_LIMIT"
  | "PACK_LIMIT";

export class AdminTestError extends Error {
  constructor(readonly code: AdminTestErrorCode, message: string) {
    super(message);
    this.name = "AdminTestError";
  }
}

export const materialSetInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  company: z.string().trim().max(120).default(""),
  role: z.string().trim().max(120).default(""),
  docs: z
    .array(z.object({
      kind: z.enum(["resume", "cover_letter", "job_posting", "experience", "note", "other"]),
      title: z.string().trim().min(1).max(120),
      text: z.string().min(1).max(20_000),
    }))
    .min(1)
    .max(8),
});
export type MaterialSetInput = z.infer<typeof materialSetInputSchema>;

export const grantInputSchema = z.object({
  targetEmail: z.string().trim().toLowerCase().email().max(254),
  maxUses: z.number().int().min(1).max(5).default(2),
  ttlHours: z.number().int().min(1).max(72).default(24),
  note: z.string().trim().max(300).optional(),
});
export type GrantInput = z.infer<typeof grantInputSchema>;

export type GrantRow = {
  id: string;
  targetUserId: string;
  targetEmail: string | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  note: string | null;
};

export type SetSummary = { id: string; name: string; createdAt: string; docCount: number };

export interface AdminTestStore {
  listSets(ownerUserId: string): Promise<SetSummary[]>;
  getSet(ownerUserId: string, setId: string): Promise<MaterialSetInput | null>;
  saveSet(ownerUserId: string, input: MaterialSetInput): Promise<{ id: string }>;
  deleteSet(ownerUserId: string, setId: string): Promise<boolean>;
  findUserIdByEmail(email: string): Promise<string | null>;
  issueGrant(input: { targetUserId: string; issuedByUserId: string; maxUses: number; allowedCharacters: number; ttlHours: number; note: string | null }): Promise<{ grantId: string; expiresAt: string; maxUses: number }>;
  revokeGrant(grantId: string): Promise<{ entitlementsRevoked: number }>;
  /** 이 사용자들에게 발급된 이용권. 화면에는 승인된 계정 것만 넘긴다. */
  listGrants(targetUserIds: string[]): Promise<Array<Omit<GrantRow, "targetEmail">>>;
}

const MAX_SETS = 20;

export class AdminTestService {
  constructor(private readonly deps: { repo: PackRepository; store: AdminTestStore; config: InterviewPackConfig; approvedEmails: readonly string[] }) {}

  // ─────────── 테스트 팩 만들기 ───────────

  async createSamplePack(ownerUserId: string, sampleId: string) {
    const sample = getPackSample(sampleId);
    if (!sample) throw new AdminTestError("SAMPLE_NOT_FOUND", "샘플을 찾지 못했습니다.");
    // 가상 FINAL 스냅샷: 문서와 회사·직무만 담는다. 이전 분석 참고(hints)는 비워 두어, 자료를 스스로 읽는지 점검한다.
    const materials = buildBaseMaterials({ docs: sample.docs, company: sample.company, role: sample.role, hints: { careerTimeline: [], documentConflicts: [] } });
    return this.create(ownerUserId, materials, `샘플 · ${sample.title}`, null);
  }

  async createFromSet(ownerUserId: string, setId: string) {
    const set = await this.deps.store.getSet(ownerUserId, setId);
    if (!set) throw new AdminTestError("SET_NOT_FOUND", "저장한 자료 세트를 찾지 못했습니다.");
    const docs: MaterialDoc[] = set.docs.map((doc, index) => ({
      id: `D${index + 1}`, kind: doc.kind as PackDocKind, title: doc.title, text: doc.text, documentId: null, documentVersionId: null, filename: null,
    }));
    const materials = buildBaseMaterials({ docs, company: set.company, role: set.role, hints: { careerTimeline: [], documentConflicts: [] } });
    return this.create(ownerUserId, materials, `내 자료 · ${set.name}`, null);
  }

  /** 로그인한 본인의 완료된 FINAL 결과를 테스트 사본으로 가져온다. 자소서 첨삭은 다시 돌리지 않는다. */
  async cloneOwnRun(ownerUserId: string, analysisRunId: string) {
    const summary = await this.deps.repo.getFinalRunSummary(ownerUserId, analysisRunId);
    if (!summary) throw new AdminTestError("RUN_NOT_FOUND", "본인의 FINAL 결과를 찾지 못했습니다.");
    if (summary.product !== "FINAL" || summary.status !== "COMPLETED") throw new AdminTestError("RUN_NOT_FINAL_COMPLETED", "완료된 FINAL 결과만 복제할 수 있습니다.");
    const source = await this.deps.repo.loadFinalRunSource(ownerUserId, analysisRunId);
    if (!source) throw new AdminTestError("RUN_NOT_FOUND", "본인의 FINAL 결과를 찾지 못했습니다.");
    const materials = buildBaseMaterials({ docs: source.docs, company: source.company, role: source.role, hints: source.hints });
    return this.create(ownerUserId, materials, `내 FINAL 복제 · ${analysisRunId.slice(0, 8)}`, analysisRunId);
  }

  private async create(ownerUserId: string, materials: ReturnType<typeof buildBaseMaterials>, label: string, clonedFromRunId: string | null) {
    try {
      return await this.deps.repo.createAdminSnapshotPack({ ownerUserId, materials, limits: this.deps.config.limits, label, clonedFromRunId });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("TOO_MANY_TEST_PACKS")) throw new AdminTestError("PACK_LIMIT", "테스트 팩이 너무 많습니다. 쓰지 않는 팩을 초기화해 주세요.");
      throw error;
    }
  }

  async resetPacks(ownerUserId: string, packIds: string[]): Promise<number> {
    const ids = z.array(z.string().uuid()).max(50).parse(packIds);
    return this.deps.repo.deleteTestPacks(ownerUserId, ids);
  }

  // ─────────── 내 자료 세트 ───────────

  listSets(ownerUserId: string) {
    return this.deps.store.listSets(ownerUserId);
  }

  async saveSet(ownerUserId: string, rawInput: unknown) {
    const parsed = materialSetInputSchema.safeParse(rawInput);
    if (!parsed.success) throw new AdminTestError("VALIDATION", "자료 세트 입력을 확인해 주세요(이름·문서 1~8개, 문서당 2만 자 이하).");
    const existing = await this.deps.store.listSets(ownerUserId);
    if (existing.length >= MAX_SETS) throw new AdminTestError("TOO_MANY_SETS", `저장한 자료 세트는 ${MAX_SETS}개까지입니다. 쓰지 않는 세트를 지워 주세요.`);
    return this.deps.store.saveSet(ownerUserId, parsed.data);
  }

  deleteSet(ownerUserId: string, setId: string) {
    return this.deps.store.deleteSet(ownerUserId, z.string().uuid().parse(setId));
  }

  // ─────────── 테스트 이용권 ───────────

  /**
   * 발급. 받는 사람은 서버 환경변수의 승인된 테스트 계정뿐이다(자기 자신 포함).
   * 임의 계정·다른 사람의 이메일을 적어도 발급되지 않는다.
   */
  async issueGrant(issuerUserId: string, rawInput: unknown) {
    const parsed = grantInputSchema.safeParse(rawInput);
    if (!parsed.success) throw new AdminTestError("VALIDATION", "발급 입력을 확인해 주세요.");
    if (!isApprovedTestAccount(parsed.data.targetEmail, this.deps.approvedEmails)) {
      throw new AdminTestError("NOT_APPROVED", "승인된 테스트 계정에만 발급할 수 있습니다.");
    }
    const targetUserId = await this.deps.store.findUserIdByEmail(parsed.data.targetEmail);
    if (!targetUserId) throw new AdminTestError("USER_NOT_FOUND", "그 이메일로 가입한 계정을 찾지 못했습니다. 먼저 그 계정으로 한 번 로그인해 주세요.");
    try {
      return await this.deps.store.issueGrant({
        targetUserId,
        issuedByUserId: issuerUserId,
        maxUses: parsed.data.maxUses,
        allowedCharacters: this.deps.config.testGrantAllowedCharacters,
        ttlHours: parsed.data.ttlHours,
        note: parsed.data.note ?? null,
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("TEST_GRANT_TOO_MANY_ACTIVE")) throw new AdminTestError("GRANT_LIMIT", "그 계정에 살아 있는 테스트 이용권이 이미 3장 있습니다. 하나를 회수한 뒤 발급해 주세요.");
      throw error;
    }
  }

  /** 회수. 승인된 계정에 발급된 이용권만 회수할 수 있다. */
  async revokeGrant(grantId: string) {
    const id = z.string().uuid().safeParse(grantId);
    if (!id.success) throw new AdminTestError("VALIDATION", "이용권을 확인해 주세요.");
    const approvedIds = await this.approvedUserIds();
    const grants = await this.deps.store.listGrants([...approvedIds.keys()]);
    if (!grants.some((grant) => grant.id === id.data)) throw new AdminTestError("GRANT_NOT_FOUND", "회수할 이용권을 찾지 못했습니다.");
    return this.deps.store.revokeGrant(id.data);
  }

  async listGrants(): Promise<GrantRow[]> {
    const approvedIds = await this.approvedUserIds();
    const grants = await this.deps.store.listGrants([...approvedIds.keys()]);
    return grants.map((grant) => ({ ...grant, targetEmail: approvedIds.get(grant.targetUserId) ?? null }));
  }

  private async approvedUserIds(): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    for (const email of this.deps.approvedEmails) {
      const id = await this.deps.store.findUserIdByEmail(email);
      if (id) map.set(id, email);
    }
    return map;
  }
}
