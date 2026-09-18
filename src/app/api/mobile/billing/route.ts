import { z } from "zod";
import { createCheckoutQuote } from "@/domain/usage-entitlement";
import { createAndroidPublisherClientFromEnv } from "@/server/billing/google-play-checkout";
import { processGooglePlayPurchase, GooglePlayVerificationError, verifyGooglePlayPurchaseRequestSchema } from "@/server/billing/google-play-verification";
import { SupabaseGooglePlayEntitlementRepository } from "@/server/billing/supabase-google-play-entitlement-repository";
import { authenticateMobile, mobileFailure, mobileJson, readMobileJson, MobileHttpError } from "@/server/mobile/auth";
import { purchaseBinding, assertPurchaseBinding } from "@/server/mobile/purchase-binding";
export const runtime = "nodejs";
const contextSchema = z.object({ analysisRunId: z.string().uuid(), applicationCaseId: z.string().uuid(), product: z.enum(["QUICK", "PRO", "FINAL"]), totalCharacters: z.number().int().positive() });
function assertEnabled() {
  if (process.env.GOOGLE_PLAY_NATIVE_ENABLED !== "true") throw new MobileHttpError(503, "BILLING_NOT_READY");
}
export async function GET(request: Request) {
  try {
    const { client, user } = await authenticateMobile(request);
    assertEnabled();
    const id = z.string().uuid().safeParse(new URL(request.url).searchParams.get("id"));
    if (!id.success) throw new MobileHttpError(400, "INVALID_INPUT");
    const loaded = await client.rpc("prepare_quick_checkout", { p_analysis_run_id: id.data });
    if (loaded.error) throw new MobileHttpError(409, "CHECKOUT_NOT_AVAILABLE");
    const context = contextSchema.parse(loaded.data);
    if (context.analysisRunId !== id.data) throw new MobileHttpError(409, "CHECKOUT_NOT_AVAILABLE");
    const { config } = createAndroidPublisherClientFromEnv();
    const quote = createCheckoutQuote(context.product, context.totalCharacters);
    const productId = config.productIds[context.product][quote.extraBlocks];
    if (!productId) throw new MobileHttpError(422, "PRODUCT_NOT_AVAILABLE");
    return mobileJson({ productId, ...purchaseBinding(user.id, id.data) });
  } catch (error) { return mobileFailure(error); }
}
export async function POST(request: Request) {
  try {
    const { client: supabase, user } = await authenticateMobile(request);
    assertEnabled();
    const parsed = verifyGooglePlayPurchaseRequestSchema.safeParse(await readMobileJson(request));
    if (!parsed.success || parsed.data.purchaseToken.length > 4096) throw new MobileHttpError(400, "INVALID_INPUT");
    const { client, config } = createAndroidPublisherClientFromEnv();
    const result = await processGooglePlayPurchase({
      rawRequest: parsed.data,
      currentUserId: user.id,
      loadRunCaseId: async (analysisRunId) => {
        const { data } = await supabase.from("analysis_runs").select("application_case_id").eq("id", analysisRunId).maybeSingle();
        return typeof data?.application_case_id === "string" ? data.application_case_id : null;
      },
      loadContext: async (analysisRunId) => {
        const { data, error } = await supabase.rpc("prepare_quick_checkout", { p_analysis_run_id: analysisRunId });
        return { data, error };
      },
      expectedProductIds: config.productIds,
      fetchPurchase: async (productId, token) => {
        const response = await client.purchases.products.get({ packageName: config.packageName, productId, token });
        assertPurchaseBinding(response.data, user.id, parsed.data.analysisRunId);
        return { purchaseState: response.data.purchaseState ?? null, orderId: response.data.orderId, acknowledgementState: response.data.acknowledgementState, regionCode: response.data.regionCode ?? null };
      },
      acknowledgePurchase: async (productId, token) => {
        await client.purchases.products.acknowledge({ packageName: config.packageName, productId, token, requestBody: {} });
      },
      repository: new SupabaseGooglePlayEntitlementRepository(),
    });
    if (!["GRANTED", "ALREADY_GRANTED"].includes(result.repositoryResult)) throw new MobileHttpError(409, "PURCHASE_NOT_GRANTED");
    return mobileJson({ verified: true });
  } catch (error) {
    if (error instanceof GooglePlayVerificationError) return mobileJson({ code: error.code }, 409);
    return mobileFailure(error);
  }
}

