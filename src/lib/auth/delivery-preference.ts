export type DeliveryUser = {
  id?: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  app_metadata?: { provider?: unknown; providers?: unknown; mooa_delivery_preference?: unknown } | null;
};

/** Provider and preference claims must come from server-controlled Auth metadata. */
export function isDashboardEligible(user: DeliveryUser | null | undefined): boolean {
  const configured = process.env.NEXT_PUBLIC_NAVER_AUTH_PROVIDER;
  const naver = configured && /^custom:[a-z0-9][a-z0-9:-]*$/.test(configured) ? configured : "custom:naver";
  const metadata = user?.app_metadata;
  return [metadata?.provider, ...(Array.isArray(metadata?.providers) ? metadata.providers : [])]
    .some((provider) => provider === "kakao" || provider === naver);
}

export function isDashboardOnly(user: DeliveryUser | null | undefined): boolean {
  if (!user?.id || !isDashboardEligible(user)) return false;
  const value = user.app_metadata?.mooa_delivery_preference;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const preference = value as Record<string, unknown>;
  return preference.version === 1 && preference.mode === "dashboard_only"
    && preference.user_id === user.id && typeof preference.updated_at === "string"
    && /^\d{4}-\d{2}-\d{2}T/.test(preference.updated_at)
    && Number.isFinite(Date.parse(preference.updated_at));
}

export function hasVerifiedAccountEmail(user: DeliveryUser | null | undefined): boolean {
  return Boolean(user?.email?.trim() && user.email_confirmed_at?.trim());
}

export function canStartWithDelivery(user: DeliveryUser | null | undefined): boolean {
  return Boolean(user) && (!isDashboardEligible(user) || hasVerifiedAccountEmail(user) || isDashboardOnly(user));
}

export function notificationEmail(user: DeliveryUser | null | undefined): string | undefined {
  if (!user || isDashboardOnly(user) || (isDashboardEligible(user) && !hasVerifiedAccountEmail(user))) return undefined;
  return user.email?.trim() || undefined;
}

/** Billing may use a verified address even when application notifications are off. */
export function checkoutEmail(user: DeliveryUser | null | undefined): string | undefined {
  if (isDashboardEligible(user) && !hasVerifiedAccountEmail(user)) return undefined;
  return user?.email?.trim() || undefined;
}
