import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

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

export async function saveWaitlistSignup(email: string): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from("waitlist_signups")
    .upsert({ email, source: "landing" }, { onConflict: "email", ignoreDuplicates: true });

  if (error) throw new Error(error.message);
}

// Returns null (not 0) on any failure — e.g. the migration hasn't been applied
// yet — so the landing page can hide the counter instead of showing "0명".
export async function getWaitlistCount(): Promise<number | null> {
  try {
    const { count, error } = await createServiceRoleClient()
      .from("waitlist_signups")
      .select("*", { count: "exact", head: true });
    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}
