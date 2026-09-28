import { z } from "zod";

export const environmentSchema = z.enum(["development", "staging", "production"]);
export type Environment = z.infer<typeof environmentSchema>;
export const eventNames = ["page_viewed", "account_created", "login_succeeded", "editor_entered",
  "analysis_entered", "result_generated", "result_saved", "pricing_viewed", "checkout_started", "checkout_created",
  "order_paid_verified", "entitlement_granted", "referral_share_completed", "review_submitted",
  "experiment_exposed", "analysis_failed", "checkout_failed"] as const;
export const verifiedNames = new Set<string>(["account_created", "result_generated", "result_saved", "order_paid_verified", "entitlement_granted", "checkout_created"]);
// No arbitrary text values: even an allowed property must belong to its finite vocabulary.
export const propertiesSchema = z.object({
  route: z.enum(["home", "editor", "analysis", "result", "pricing", "account", "other"]).optional(),
  product: z.enum(["QUICK", "PRO", "FINAL"]).optional(),
  source: z.enum(["direct", "search", "social", "referral", "other"]).optional(),
  outcome: z.enum(["success", "failed", "canceled", "pending"]).optional(),
  experimentKey: z.enum(["analytics_onboarding_v1"]).optional(),
  variant: z.enum(["control", "treatment"]).optional(),
}).strict();
export const eventSchema = z.object({
  schemaVersion: z.literal(1), eventId: z.uuid(), eventName: z.enum(eventNames),
  occurredAt: z.iso.datetime({ offset: true }), anonymousId: z.uuid(), sessionId: z.uuid(),
  authAttemptId: z.uuid().nullable().default(null), billingAttemptId: z.uuid().nullable().default(null),
  analysisRunId: z.uuid().nullable().default(null),
  clientPlatform: z.enum(["web", "android"]), surface: z.enum(["browser", "app_webview", "native"]),
  environment: environmentSchema, properties: propertiesSchema.default({}),
}).strict();
export type AnalyticsEvent = z.infer<typeof eventSchema>;
export function parsePublicBatch(input: unknown, environment: Environment, now = Date.now()) {
  const { events } = z.object({ events: z.array(eventSchema).min(1).max(30) }).strict().parse(input);
  for (const event of events) {
    if (event.environment !== environment || verifiedNames.has(event.eventName)) throw new Error("INVALID_EVENT_TRUST");
    const time = Date.parse(event.occurredAt);
    if (time > now + 300_000 || time < now - 7 * 86_400_000) throw new Error("INVALID_EVENT_TIME");
  }
  return events;
}

export function routeCategory(path: string): z.infer<typeof propertiesSchema>["route"] {
  if (path === "/") return "home";
  if (path==="/quick" || path==="/app" || path==="/pro/create-wizard" || /^\/(quick|pro|final)\/(create|build|polish)$/.test(path)) return "editor";
  if (path.startsWith("/analysis/")) return "analysis";
  if (path.startsWith("/result") && !path.includes("sample")) return "result";
  if (path === "/pricing") return "pricing";
  return "other";
}
