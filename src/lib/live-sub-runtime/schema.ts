import { z } from "zod";

const linkTypeSchema = z.enum(["external", "webview", "deeplink", "none"]);
const audienceSchema = z.enum(["all", "free", "premium"]);
const isoDateSchema = z.string().datetime({ offset: true });

const bannerSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().default(true),
  placement: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  eyebrow: z.string().optional(),
  ctaLabel: z.string().optional(),
  targetUrl: z.string().optional(),
  linkType: linkTypeSchema.default("none"),
  locales: z.array(z.string().min(1)).optional(),
  audience: audienceSchema.default("all"),
  startAt: isoDateSchema.optional(),
  endAt: isoDateSchema.optional(),
  priority: z.number().int().default(0),
});

const noticeSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().default(true),
  type: z.enum(["banner", "modal", "inline"]),
  title: z.string().min(1),
  body: z.string().min(1),
  ctaLabel: z.string().optional(),
  targetUrl: z.string().optional(),
  linkType: linkTypeSchema.default("none"),
  locales: z.array(z.string().min(1)).optional(),
  audience: audienceSchema.default("all"),
  startAt: isoDateSchema.optional(),
  endAt: isoDateSchema.optional(),
  priority: z.number().int().default(0),
  dismissible: z.boolean().default(false),
  showOnce: z.boolean().default(false),
});

const maintenanceSchema = z.object({
  enabled: z.boolean().default(false),
  message: z.string().default(""),
  scope: z.string().default("all"),
  startsAt: isoDateSchema.optional(),
  endsAt: isoDateSchema.optional(),
});

const configEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  appKey: z.literal("mooaresume").default("mooaresume"),
  environment: z.string().default("production"),
  version: z.number().int().nonnegative().nullable().optional(),
  featureFlags: z.unknown().optional(),
  banners: z.array(z.unknown()).default([]),
  notices: z.array(z.unknown()).default([]),
  maintenance: z.unknown().optional(),
});

export type RuntimeBanner = z.infer<typeof bannerSchema>;
export type RuntimeNotice = z.infer<typeof noticeSchema>;
export type RuntimeMaintenance = z.infer<typeof maintenanceSchema>;
export type LinkType = z.infer<typeof linkTypeSchema>;
export type RuntimeConfig = Omit<z.infer<typeof configEnvelopeSchema>, "banners" | "notices" | "maintenance" | "version" | "featureFlags"> & {
  version: number | null;
  featureFlags: Record<string, boolean>;
  banners: RuntimeBanner[];
  notices: RuntimeNotice[];
  maintenance: RuntimeMaintenance;
};

/**
 * The envelope must be a v1 MOOA config, while an invalid optional item must
 * not discard the rest of a correctly published configuration.
 */
export function parseRuntimeConfig(value: unknown): RuntimeConfig | null {
  const envelope = configEnvelopeSchema.safeParse(value);
  if (!envelope.success) return null;

  return {
    ...envelope.data,
    version: envelope.data.version ?? null,
    featureFlags: typeof envelope.data.featureFlags === "object" && envelope.data.featureFlags !== null && !Array.isArray(envelope.data.featureFlags)
      ? Object.fromEntries(Object.entries(envelope.data.featureFlags).filter(([, value]) => typeof value === "boolean"))
      : {},
    banners: envelope.data.banners.flatMap((item) => {
      const parsed = bannerSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
    notices: envelope.data.notices.flatMap((item) => {
      const parsed = noticeSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }),
    maintenance: maintenanceSchema.safeParse(envelope.data.maintenance).data ?? {
      enabled: false,
      message: "",
      scope: "all",
    },
  };
}
