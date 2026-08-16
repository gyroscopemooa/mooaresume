import { z } from "zod";
import { createQuickCheckoutQuote, toQuickCheckoutMetadata } from "@/domain/usage-entitlement";
import type { PolarCheckoutGateway } from "./polar-checkout";

export const createQuickCheckoutRequestSchema = z.object({
  analysisRunId: z.string().uuid(),
});

const quickCheckoutContextSchema = z.object({
  analysisRunId: z.string().uuid(),
  applicationCaseId: z.string().uuid(),
  totalCharacters: z.number().int().positive(),
  openCheckout: z.object({
    checkoutId: z.string().min(1),
    checkoutUrl: z.string().url(),
    expiresAt: z.string().datetime(),
  }).nullable().optional(),
});

export type QuickCheckoutContext = z.infer<typeof quickCheckoutContextSchema>;

export class QuickCheckoutError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "QuickCheckoutError";
  }
}

export async function createQuickCheckout(input: {
  rawRequest: unknown;
  loadContext: (analysisRunId: string) => Promise<{
    data: unknown;
    error: { code?: string; message: string } | null;
  }>;
  registerSession?: (analysisRunId: string, session: {
    checkoutId: string;
    checkoutUrl: string;
    expiresAt: string;
  }) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
  gateway: PolarCheckoutGateway;
  user: { id: string; email?: string };
  successUrl: string;
  returnUrl: string;
  customerIpAddress?: string;
}) {
  const request = createQuickCheckoutRequestSchema.parse(input.rawRequest);
  const loaded = await input.loadContext(request.analysisRunId);
  if (loaded.error) {
    throw new QuickCheckoutError(
      "결제할 지원 건을 확인하지 못했습니다.",
      loaded.error.code ?? "CHECKOUT_CONTEXT_FAILED",
    );
  }

  const context = quickCheckoutContextSchema.parse(loaded.data);
  if (context.analysisRunId !== request.analysisRunId) {
    throw new QuickCheckoutError("분석 실행 정보가 일치하지 않습니다.", "ANALYSIS_RUN_MISMATCH");
  }

  const quote = createQuickCheckoutQuote(context.totalCharacters);
  if (context.openCheckout) {
    return { ...context.openCheckout, quote, reused: true };
  }
  const metadata = toQuickCheckoutMetadata(quote, context.applicationCaseId);
  const createdSession = await input.gateway.createCheckout({
    quote,
    metadata,
    successUrl: input.successUrl,
    returnUrl: input.returnUrl,
    externalCustomerId: input.user.id,
    customerEmail: input.user.email,
    customerIpAddress: input.customerIpAddress,
  });

  const registered = input.registerSession
    ? await input.registerSession(request.analysisRunId, createdSession)
    : { data: createdSession, error: null };
  if (registered.error) {
    throw new QuickCheckoutError(
      "결제 페이지를 안전하게 기록하지 못했습니다.",
      registered.error.code ?? "CHECKOUT_REGISTRATION_FAILED",
    );
  }
  const session = z.object({
    checkoutId: z.string().min(1),
    checkoutUrl: z.string().url(),
    expiresAt: z.string().datetime(),
  }).parse(registered.data);

  return {
    ...session,
    quote,
    reused: session.checkoutId !== createdSession.checkoutId,
  };
}
