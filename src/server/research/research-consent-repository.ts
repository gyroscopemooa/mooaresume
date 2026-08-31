import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

/**
 * 동의 기록을 서버에서 씁니다.
 *
 * This used to be the browser calling PostgREST directly, and it was the only
 * important write in the app that did. Every other one goes through a route and
 * a service-role client, and every other one kept working while this returned
 * 401 for a token whose signing key, issue time and expiry all checked out.
 *
 * Chasing that difference is not worth more of anyone's day for a checkbox. The
 * fix is to stop being the exception: authenticate the person the same way the
 * other routes do, then write the row the same way the other repositories do.
 *
 * The two-direction shape of the RPC is preserved exactly — granting and
 * withdrawing are one call, because a product where granting is a button and
 * withdrawing is a support ticket is not offering a choice.
 */

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

function createServiceRoleClient() {
  const env = serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function writeResearchConsent(
  ownerUserId: string,
  granted: boolean,
  consentVersion: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await createServiceRoleClient()
    .from("research_consents")
    .upsert(
      {
        owner_user_id: ownerUserId,
        consent_version: consentVersion,
        granted,
        // The table's check constraint reads these two together: a granted row
        // carries a grant time and no revocation, a refused row carries a
        // revocation. Withdrawing keeps the original grant time, which is the
        // record of what happened rather than a tidier version of it.
        granted_at: granted ? now : undefined,
        revoked_at: granted ? null : now,
        updated_at: now,
      },
      { onConflict: "owner_user_id" },
    );
  if (error) throw new Error(`${error.code ?? "UNKNOWN"} · ${error.message}`);
}

export async function readResearchConsent(
  ownerUserId: string,
  consentVersion: string,
): Promise<boolean | null> {
  const { data } = await createServiceRoleClient()
    .from("research_consents")
    .select("granted, consent_version")
    .eq("owner_user_id", ownerUserId)
    .maybeSingle();
  // An answer to older wording does not carry over — that is what versioning the
  // consent is for.
  if (!data || data.consent_version !== consentVersion) return null;
  return Boolean(data.granted);
}
