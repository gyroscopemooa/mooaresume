import "server-only";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { GrantOutcome, RewardGrantInput, RewardGrantRepository } from "./grant-reward";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
});

const outcomeSchema = z.enum(["GRANTED", "DUPLICATE", "NO_USER"]);

function createServiceRoleClient() {
  const env = serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  });
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class SupabaseRewardGrantRepository implements RewardGrantRepository {
  async grant(input: RewardGrantInput): Promise<GrantOutcome> {
    const { data, error } = await createServiceRoleClient().rpc("grant_livesub_reward", {
      p_submission_id: input.submissionId,
      p_campaign_id: input.campaignId,
      p_environment: input.environment,
      p_contact: input.contact,
      p_reward_code: input.rewardCode,
    });
    if (error) throw new Error(`LIVESUB_REWARD_GRANT_FAILED:${error.code}`);
    return outcomeSchema.parse(data);
  }
}
