import { z } from "zod";

const linkTypeSchema = z.enum(["external", "webview", "deeplink", "none"]);
const audienceSchema = z.enum(["all", "free", "premium"]);
const campaignStatusSchema = z.enum(["draft", "active", "paused", "ended"]);
const placementSchema = z.enum(["home_modal", "home_banner", "result_top_banner", "result_bottom_cta", "pricing_banner", "announcement_bar"]);
const frequencyModeSchema = z.enum(["once", "daily", "every_3_days", "per_session"]);
const isoDateSchema = z.string().datetime({ offset: true });

const bannerSchema = z.object({ id: z.string().min(1), enabled: z.boolean().default(true), placement: z.string().min(1), title: z.string().optional(), description: z.string().optional(), eyebrow: z.string().optional(), ctaLabel: z.string().optional(), targetUrl: z.string().optional(), linkType: linkTypeSchema.default("none"), locales: z.array(z.string().min(1)).optional(), audience: audienceSchema.default("all"), startAt: isoDateSchema.optional(), endAt: isoDateSchema.optional(), priority: z.number().int().default(0) });
const noticeSchema = z.object({ id: z.string().min(1), enabled: z.boolean().default(true), type: z.enum(["banner", "modal", "inline"]), title: z.string().min(1), body: z.string().min(1), ctaLabel: z.string().optional(), targetUrl: z.string().optional(), linkType: linkTypeSchema.default("none"), locales: z.array(z.string().min(1)).optional(), audience: audienceSchema.default("all"), startAt: isoDateSchema.optional(), endAt: isoDateSchema.optional(), priority: z.number().int().default(0), dismissible: z.boolean().default(false), showOnce: z.boolean().default(false) });

/** Content is owned by HQ: an explicit locale entry falls back to defaultLocale, then defaultContent. */
const campaignContentSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  buttonText: z.string().optional(),
  secondaryButtonText: z.string().optional(),
  badgeText: z.string().optional(),
  imageUrl: z.string().refine((value) => value === "" || URL.canParse(value) && new URL(value).protocol === "https:").optional(),
  linkUrl: z.string().optional(),
});
const placementConfigSchema = z.object({
  enabled: z.boolean().optional(),
  delayMs: z.number().int().min(0).max(10_000).optional(),
  scrollTriggerPercent: z.number().min(0).max(100).optional(),
  showCloseButton: z.boolean().optional(),
  layout: z.enum(["card", "banner", "compact"]).optional(),
  maxWidth: z.number().int().min(240).max(1_600).optional(),
  triggerEvent: z.enum(["page_load", "result_rendered", "translation_end", "paywall_open"]).optional(),
});
const eventCampaignSchema = z.object({
  id: z.string().min(1), status: campaignStatusSchema, placements: z.array(placementSchema).min(1), placementConfigs: z.record(z.string(), placementConfigSchema).default({}), platforms: z.array(z.string().min(1)).default([]), locales: z.array(z.string().min(1)).default([]), audience: audienceSchema.default("all"), targetRules: z.unknown().optional(), frequency: z.object({ mode: frequencyModeSchema, hideDaysAfterClose: z.number().nonnegative().optional() }), linkType: linkTypeSchema.default("none"), startAt: isoDateSchema.optional(), endAt: isoDateSchema.optional(), priority: z.number().int().default(0), defaultLocale: z.string().min(1), defaultContent: campaignContentSchema, localizedContent: z.record(z.string(), campaignContentSchema.partial()).default({}),
});
const maintenanceSchema = z.object({ enabled: z.boolean().default(false), message: z.string().default(""), scope: z.string().default("all"), startsAt: isoDateSchema.optional(), endsAt: isoDateSchema.optional() });
const configEnvelopeSchema = z.object({ schemaVersion: z.literal(1), appKey: z.literal("mooaresume").default("mooaresume"), environment: z.string().default("production"), version: z.number().int().nonnegative().nullable().optional(), featureFlags: z.unknown().optional(), banners: z.array(z.unknown()).default([]), eventCampaigns: z.array(z.unknown()).default([]), notices: z.array(z.unknown()).default([]), maintenance: z.unknown().optional() });

export type RuntimeBanner = z.infer<typeof bannerSchema>;
export type RuntimeNotice = z.infer<typeof noticeSchema>;
export type RuntimeMaintenance = z.infer<typeof maintenanceSchema>;
export type LinkType = z.infer<typeof linkTypeSchema>;
export type RuntimeEventCampaign = z.infer<typeof eventCampaignSchema>;
export type RuntimeEventPlacement = z.infer<typeof placementSchema>;
export type RuntimeEventPlacementConfig = z.infer<typeof placementConfigSchema>;
export type RuntimeEventContent = z.infer<typeof campaignContentSchema>;
export type RuntimeConfig = Omit<z.infer<typeof configEnvelopeSchema>, "banners" | "eventCampaigns" | "notices" | "maintenance" | "version" | "featureFlags"> & { version: number | null; featureFlags: Record<string, boolean>; banners: RuntimeBanner[]; eventCampaigns: RuntimeEventCampaign[]; notices: RuntimeNotice[]; maintenance: RuntimeMaintenance };

export function parseRuntimeConfig(value: unknown): RuntimeConfig | null {
  const envelope = configEnvelopeSchema.safeParse(value);
  if (!envelope.success) return null;
  return {
    ...envelope.data,
    version: envelope.data.version ?? null,
    featureFlags: typeof envelope.data.featureFlags === "object" && envelope.data.featureFlags !== null && !Array.isArray(envelope.data.featureFlags) ? Object.fromEntries(Object.entries(envelope.data.featureFlags).filter(([, value]) => typeof value === "boolean")) : {},
    banners: envelope.data.banners.flatMap((item) => { const parsed = bannerSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }),
    eventCampaigns: envelope.data.eventCampaigns.flatMap((item) => { const parsed = eventCampaignSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }),
    notices: envelope.data.notices.flatMap((item) => { const parsed = noticeSchema.safeParse(item); return parsed.success ? [parsed.data] : []; }),
    maintenance: maintenanceSchema.safeParse(envelope.data.maintenance).data ?? { enabled: false, message: "", scope: "all" },
  };
}
