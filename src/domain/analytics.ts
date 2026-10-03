import { z } from "zod";

export const clientEvents = ["session_started", "page_viewed", "signed_in", "app_foregrounded", "app_backgrounded", "result_viewed", "export_completed", "checkout_clicked"] as const;
export const platformSchema = z.enum(["web", "android", "ios", "unknown"]);
export const environmentSchema = z.enum(["development", "staging", "production"]);
export const propertiesSchema = z.object({
  route: z.enum(["home", "review", "result", "resume", "career", "portfolio", "account", "pricing", "referral", "other"]).optional(),
  channel: z.enum(["direct", "search", "social", "referral", "other"]).optional(),
  product: z.enum(["QUICK", "PRO", "FINAL", "RESUME", "CAREER", "PORTFOLIO"]).optional(),
  surface: z.enum(["browser", "twa", "native"]).optional(),
  appVersion: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/).optional(),
}); // Zod strips ALL unknown keys before persistence, including the offline queue.
export const eventSchema = z.object({
  eventId: z.string().uuid(), anonymousId: z.string().uuid(), sessionId: z.string().uuid(),
  eventName: z.enum(clientEvents), occurredAt: z.string().datetime(),
  platform: platformSchema.exclude(["unknown"]), properties: propertiesSchema,
}).strict();
export type ClientEvent = z.infer<typeof eventSchema>;
export function normalizeBatch(input: unknown, now = Date.now()) {
  const { events } = z.object({ events: z.array(eventSchema).min(1).max(30) }).strict().parse(input);
  for (const e of events) {
    const age = now - Date.parse(e.occurredAt);
    if (age > 7 * 86400000 || age < -300000) throw new Error("INVALID_TIME");
    if (e.anonymousId !== events[0].anonymousId) throw new Error("MIXED_IDENTITY");
  }
  return events;
}
export function routeCategory(path: string): z.infer<typeof propertiesSchema>["route"] {
  const root = path.split(/[?#]/)[0].replace(/^\/app(?=\/|$)/, "").split("/").filter(Boolean)[0] ?? "";
  const map: Record<string, z.infer<typeof propertiesSchema>["route"]> = { "": "home", quick: "review", pro: "review", final: "review", analysis: "review", result: "result", resume: "resume", career: "career", portfolio: "portfolio", my: "account", account: "account", pricing: "pricing", refer: "referral" };
  return map[root] ?? "other";
}
export type AnalyticsFact = {
  event_id: string; user_id: string | null; anonymous_id: string | null;
  event_name: string; occurred_at: string; platform: z.infer<typeof platformSchema>;
  environment: z.infer<typeof environmentSchema>; evidence: "client_observed" | "server_verified";
  properties: Record<string, unknown>;
};
export const funnelSteps = ["session_started", "account_created", "case_saved", "order_paid", "core_completed"] as const;
const day = (s: string) => Math.floor((Date.parse(s) + 9 * 3600000) / 86400000);
export function summarizeAnalytics(events: AnalyticsFact[], from: string, to: string, now = new Date().toISOString()) {
  const actors = new Map<string, AnalyticsFact[]>();
  const seen = new Set<string>();
  for (const e of [...events].sort((a,b) => a.occurred_at.localeCompare(b.occurred_at))) {
    if (seen.has(e.event_id) || e.occurred_at > now) continue;
    seen.add(e.event_id);
    const key = e.user_id ?? e.anonymous_id;
    if (!key) continue;
    const group = actors.get(key) ?? []; group.push(e); actors.set(key, group);
  }
  const counts = funnelSteps.map(() => 0);
  let activated = 0, reused = 0;
  const retention = [1,7,30].map(days => ({ days, eligible: 0, returned: 0, rate: null as number | null }));
  for (const group of actors.values()) {
    const selected = group.filter(e => e.occurred_at >= from && e.occurred_at < to);
    let cursor = -Infinity;
    for (let i = 0; i < funnelSteps.length; i++) {
      const found = selected.find(e => e.event_name === funnelSteps[i] && Date.parse(e.occurred_at) > cursor && (i === 0 || e.evidence === "server_verified"));
      if (!found) break;
      counts[i]++; cursor = Date.parse(found.occurred_at);
    }
    const core = group.filter(e => e.event_name === "core_completed" && e.evidence === "server_verified");
    if (core.some(e => e.occurred_at >= from && e.occurred_at < to)) activated++;
    if (new Set(core.map(e => day(e.occurred_at))).size > 1 && core.some(e => e.occurred_at >= from && e.occurred_at < to && day(e.occurred_at) > day(core[0].occurred_at))) reused++;
    // First core completion within the retained observation window, never called lifetime-first.
    const first = core[0];
    if (!first || first.occurred_at < from || first.occurred_at >= to) continue;
    for (const r of retention) {
      const target = day(first.occurred_at) + r.days;
      if (target >= day(now)) continue; // A whole KST day must have elapsed.
      r.eligible++;
      if (core.some(e => day(e.occurred_at) === target)) r.returned++;
    }
  }
  for (const r of retention) r.rate = r.eligible ? r.returned / r.eligible : null;
  return { actors: [...actors.values()].filter(group=>group.some(e=>e.occurred_at>=from&&e.occurred_at<to)).length, activated, reused, funnel: funnelSteps.map((event, i) => ({ event, count: counts[i] })), retention };
}
