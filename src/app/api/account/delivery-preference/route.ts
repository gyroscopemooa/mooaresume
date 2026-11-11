import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canStartWithDelivery, hasVerifiedAccountEmail, isDashboardEligible, isDashboardOnly, type DeliveryUser } from "@/lib/auth/delivery-preference";

const inputSchema = z.object({ userId: z.uuid(), dashboardOnly: z.boolean() }).strict();
const response = (user: DeliveryUser) => NextResponse.json({ userId: user.id, eligible: isDashboardEligible(user), dashboardOnly: isDashboardOnly(user), ready: canStartWithDelivery(user) }, { headers: { "Cache-Control": "no-store" } });
const failure = (status: number) => NextResponse.json({ error: "수신 설정을 확인하지 못했습니다. 계정을 확인하고 다시 시도해 주세요." }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return failure(401);
    return response(data.user);
  } catch { return failure(503); }
}

export async function POST(request: Request) {
  // Require the full origin, not only host, and never accept absent Origin.
  if (request.headers.get("origin") !== new URL(request.url).origin) return failure(403);
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure(400);
  try {
    const client = await createClient();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) return failure(401);
    if (data.user.id !== parsed.data.userId) return failure(409);
    if (!isDashboardEligible(data.user)) return failure(403);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) return failure(503);
    const admin = createServiceClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin;
    const fresh = await admin.getUserById(data.user.id);
    if (fresh.error || fresh.data.user?.id !== data.user.id) return failure(503);
    if (!isDashboardEligible(fresh.data.user)) return failure(403);
    if (!parsed.data.dashboardOnly && !hasVerifiedAccountEmail(fresh.data.user)) return failure(403);
    const preference = { version: 1, mode: parsed.data.dashboardOnly ? "dashboard_only" : "email", user_id: data.user.id, updated_at: new Date().toISOString() };
    // GoTrue merges app_metadata keys. Send only this key, avoiding stale overwrites
    // of provider/security metadata and never changing email or user_metadata.
    const updated = await admin.updateUserById(data.user.id, { app_metadata: { mooa_delivery_preference: preference } });
    if (updated.error || updated.data.user?.id !== data.user.id) return failure(503);
    const saved = await admin.getUserById(data.user.id);
    if (saved.error || saved.data.user?.id !== data.user.id || !isDashboardEligible(saved.data.user)) return failure(503);
    const stored = saved.data.user.app_metadata?.mooa_delivery_preference;
    if (!stored || stored.version !== 1 || stored.mode !== preference.mode || stored.user_id !== data.user.id || stored.updated_at !== preference.updated_at) return failure(503);
    if (!parsed.data.dashboardOnly && !hasVerifiedAccountEmail(saved.data.user)) return failure(409);
    return response(saved.data.user);
  } catch { return failure(503); }
}
