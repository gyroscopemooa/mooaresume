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
    return NextResponse.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 500 });
  }
}
