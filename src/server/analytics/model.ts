import { z } from "zod";
import { environmentSchema, propertiesSchema } from "@/lib/analytics/schema";

const text = z.string();
const nullable = text.nullable();
const owner = { id: text, owner_user_id: text, product: text, status: text, created_at: text };
export const snapshotSchema = z.object({
  events: z.array(z.object({ event_id: text, event_name: text, occurred_at: text, received_at: text,
    anonymous_id: text, session_id: text, user_id: nullable, auth_attempt_id: nullable,
    billing_attempt_id: nullable, analysis_run_id: nullable, client_platform: z.enum(["web", "android"]),
    surface: text, environment: environmentSchema, event_source: text, evidence_type: text,
    is_internal: z.boolean(), is_test: z.boolean(), properties: propertiesSchema })),
  links: z.array(z.object({ environment: environmentSchema, anonymous_id: text, user_id: text })),
  accounts: z.array(z.object({ user_id: text, is_internal: z.boolean(), is_test: z.boolean() })),
  members: z.array(z.object({ id: text, created_at: text, last_sign_in_at: nullable })),
  orders: z.array(z.object({ id: text, owner_user_id: text, provider: text, product: text,
    amount: z.number(), currency: text, status: text, paid_at: text, refunded_at: nullable, updated_at: text })),
  entitlements: z.array(z.object({ ...owner, billing_order_id: nullable, test_grant_id: nullable.default(null), consumed_at: nullable, revoked_at: nullable })),
  rewards: z.array(z.object({ ...owner, billing_order_id: nullable, consumed_at: nullable, expires_at: nullable })),
  runs: z.array(z.object({ ...owner, completed_at: nullable, saved_at: nullable, is_test: z.boolean().default(false) })),
  presence: z.array(z.object({ environment: environmentSchema, user_id: text, platform: z.enum(["web", "android"]), last_seen_at: text })),
  assignments: z.array(z.object({ environment: environmentSchema, user_id: text, experiment_key: text, variant: text, assigned_at: text })),
  interviews: z.array(z.object({ owner_user_id: text, analysis_run_id: text, paid_extra_sessions: z.number().int().nonnegative(),
    restart_free_used: z.boolean(), weak_retry_free_used: z.boolean(), updated_at: text })).default([]),
  checkouts:z.array(z.object({id:text,owner_user_id:text,created_at:text,status:text})).default([]),
});
export type Snapshot = z.infer<typeof snapshotSchema>;
export const resources = ["collection-status", "summary", "funnel", "bottlenecks", "acquisition", "activation",
  "retention", "members", "timeline", "events", "purchasers", "entitlements", "orders", "data-quality",
  "experiments", "campaign-safety", "errors"] as const;
export type Resource = typeof resources[number];
const boolean = z.enum(["true", "false"]).transform(v => v === "true").optional();
export const querySchema = z.object({
  from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }), environment: environmentSchema,
  platform: z.enum(["web", "android"]).optional(), includeInternal: boolean, includeTest: boolean,
  userId: z.uuid().optional(), limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
  eventName: text.max(80).optional(), product: z.enum(["QUICK", "PRO", "FINAL", "INTERVIEW_RETRY"]).optional(),
  provider: z.string().transform(v=>v.toUpperCase()).pipe(z.enum(["POLAR", "GOOGLE_PLAY", "MOOA_CREDIT"])).optional(), purchaser: boolean, refunded: boolean,
  remaining: z.enum(["positive", "exhausted"]).optional(), repurchased: boolean,
  q: text.max(80).optional(), coupon: text.max(80).optional(),
}).strict().refine(q => Date.parse(q.from) < Date.parse(q.to) && Date.parse(q.to) - Date.parse(q.from) <= 366 * 86400000);
export type Query = z.infer<typeof querySchema>;
export function parseQuery(url: URL, environment: string, now = Date.now()) {
  return querySchema.parse({ from: new Date(now - 30 * 86400000).toISOString(), to: new Date(now).toISOString(),
    environment, ...Object.fromEntries(url.searchParams) });
}
