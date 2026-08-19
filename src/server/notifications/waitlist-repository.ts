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
