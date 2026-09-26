import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { materialSetInputSchema, type AdminTestStore, type MaterialSetInput } from "./admin-test";

/**
 * 관리자 테스트 저장소의 Supabase 구현(서비스 키). 관리자 콘솔 라우트에서만 만든다.
 * 이용권 발급·회수는 DB 함수가 하고, 여기서는 그 함수를 부르고 목록을 읽을 뿐이다.
 */

function serviceClient(): SupabaseClient {
  const url = z.string().url().parse(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = z.string().min(1).parse(process.env.SUPABASE_SECRET_KEY);
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function failure(error: { message: string }): Error {
  // DB 함수의 오류 코드(메시지 앞부분)만 위로 올린다.
  return new Error(error.message.split(":")[0].trim());
}

export class SupabaseAdminTestStore implements AdminTestStore {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = serviceClient()) {
    this.client = client;
  }

  async listSets(ownerUserId: string) {
    const { data, error } = await this.client
      .from("admin_test_material_sets")
      .select("id, name, created_at, payload")
      .eq("owner_user_id", ownerUserId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw failure(error);
    return (data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      createdAt: String(row.created_at),
      docCount: Array.isArray((row.payload as { docs?: unknown[] } | null)?.docs) ? (row.payload as { docs: unknown[] }).docs.length : 0,
    }));
  }

  async getSet(ownerUserId: string, setId: string): Promise<MaterialSetInput | null> {
    const { data, error } = await this.client
      .from("admin_test_material_sets")
      .select("name, payload")
      .eq("id", setId)
      .eq("owner_user_id", ownerUserId)
      .maybeSingle();
    if (error) throw failure(error);
    if (!data) return null;
    const parsed = materialSetInputSchema.safeParse({ ...(data.payload as object), name: data.name });
    return parsed.success ? parsed.data : null;
  }

  async saveSet(ownerUserId: string, input: MaterialSetInput) {
    const { name, ...payload } = input;
    const { data, error } = await this.client
      .from("admin_test_material_sets")
      .insert({ owner_user_id: ownerUserId, name, payload })
      .select("id")
      .single();
    if (error) throw failure(error);
    return { id: String(data.id) };
  }

  async deleteSet(ownerUserId: string, setId: string) {
    const { data, error } = await this.client
      .from("admin_test_material_sets")
      .delete()
      .eq("id", setId)
      .eq("owner_user_id", ownerUserId)
      .select("id");
    if (error) throw failure(error);
    return (data ?? []).length > 0;
  }

  /** 관리자 콘솔의 다른 화면과 같은 방식(관리자 API 목록)으로 이메일 → 사용자 id 를 찾는다. */
  async findUserIdByEmail(email: string): Promise<string | null> {
    const target = email.trim().toLowerCase();
    for (let page = 1; page <= 5; page += 1) {
      const { data, error } = await this.client.auth.admin.listUsers({ page, perPage: 1_000 });
      if (error) throw failure(error);
      const found = data.users.find((user) => (user.email ?? "").toLowerCase() === target);
      if (found) return found.id;
      if (data.users.length < 1_000) return null;
    }
    return null;
  }

  async issueGrant(input: { targetUserId: string; issuedByUserId: string; maxUses: number; allowedCharacters: number; ttlHours: number; note: string | null }) {
    const { data, error } = await this.client.rpc("issue_admin_test_grant", {
      p_target_user_id: input.targetUserId,
      p_issued_by_user_id: input.issuedByUserId,
      p_max_uses: input.maxUses,
      p_allowed_characters: input.allowedCharacters,
      p_ttl_hours: input.ttlHours,
      p_note: input.note,
    });
    if (error) throw failure(error);
    return z.object({ grantId: z.string().uuid(), expiresAt: z.string(), maxUses: z.number().int() }).parse(data);
  }

  async revokeGrant(grantId: string) {
    const { data, error } = await this.client.rpc("revoke_admin_test_grant", { p_grant_id: grantId });
    if (error) throw failure(error);
    return { entitlementsRevoked: z.object({ entitlementsRevoked: z.number().int() }).parse(data).entitlementsRevoked };
  }

  async listGrants(targetUserIds: string[]) {
    if (targetUserIds.length === 0) return [];
    const { data, error } = await this.client
      .from("admin_test_grants")
      .select("id, target_user_id, max_uses, expires_at, revoked_at, created_at, note")
      .in("target_user_id", targetUserIds)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw failure(error);
    const ids = (data ?? []).map((row) => String(row.id));
    const used = new Map<string, number>();
    if (ids.length > 0) {
      const { data: uses, error: useError } = await this.client.from("admin_test_grant_uses").select("grant_id").in("grant_id", ids);
      if (useError) throw failure(useError);
      for (const row of uses ?? []) used.set(String(row.grant_id), (used.get(String(row.grant_id)) ?? 0) + 1);
    }
    return (data ?? []).map((row) => ({
      id: String(row.id),
      targetUserId: String(row.target_user_id),
      maxUses: Number(row.max_uses),
      usedCount: used.get(String(row.id)) ?? 0,
      expiresAt: String(row.expires_at),
      revokedAt: (row.revoked_at as string | null) ?? null,
      createdAt: String(row.created_at),
      note: (row.note as string | null) ?? null,
    }));
  }
}
