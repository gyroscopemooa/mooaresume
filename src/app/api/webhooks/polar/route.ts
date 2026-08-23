import { WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { NextResponse } from "next/server";
import { getPolarWebhookConfiguration } from "@/server/billing/polar-checkout";
import { SupabasePolarEntitlementRepository } from "@/server/billing/supabase-polar-entitlement-repository";
import { processPolarWebhook } from "@/server/billing/polar-webhook";

export const runtime = "nodejs";

function toHeaderRecord(headers: Headers) {
  return Object.fromEntries(headers.entries());
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  try {
    const config = getPolarWebhookConfiguration();
    const result = await processPolarWebhook({
      rawBody,
      headers: toHeaderRecord(request.headers),
      secret: config.webhookSecret,
      expectedProductIds: { QUICK: config.quickProductId, PRO: config.proProductId },
      environment: config.server,
      repository: new SupabasePolarEntitlementRepository(),
    });
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "INVALID_WEBHOOK_SIGNATURE" }, { status: 403 });
    }
    console.error("polar_webhook_failed", {
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    });

    // The Polar SDK parses+validates the full payload before we can even see
    // the event type, so a schema hiccup on an event we don't act on (e.g.
    // checkout.updated) throws before reaching our own dispatch logic below.
    // Only fail loudly for the event types that actually grant/revoke
    // entitlements; everything else is safe to acknowledge and ignore.
    const criticalEventTypes = ["order.paid", "order.updated", "order.refunded"];
    const rawType = (() => {
      try {
        return JSON.parse(rawBody)?.type;
      } catch {
        return undefined;
      }
    })();
    if (typeof rawType === "string" && !criticalEventTypes.includes(rawType)) {
      return NextResponse.json({ disposition: "IGNORED", eventType: rawType, reason: "UNPARSEABLE_NONCRITICAL_EVENT" }, { status: 202 });
    }

    return NextResponse.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
