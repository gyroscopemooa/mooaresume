import "server-only";

import { Polar } from "@polar-sh/sdk";
import type { CheckoutQuote, CheckoutMetadata } from "@/domain/usage-entitlement";
import { PresentmentCurrency, type PresentmentCurrency as PresentmentCurrencyType } from "@polar-sh/sdk/models/components/presentmentcurrency.js";

export type CreatePolarCheckoutInput = {
  quote: CheckoutQuote;
  metadata: CheckoutMetadata;
  successUrl: string;
  returnUrl: string;
  externalCustomerId: string;
  customerEmail?: string;
  customerIpAddress?: string;
};

export type PolarCheckoutSession = { checkoutId: string; checkoutUrl: string; expiresAt: string };

export interface PolarCheckoutGateway {
  createCheckout(input: CreatePolarCheckoutInput): Promise<PolarCheckoutSession>;
}

type PolarCheckoutClient = {
  checkouts: {
    create: Polar["checkouts"]["create"];
  };
};

export class PolarSdkCheckoutGateway implements PolarCheckoutGateway {
  constructor(
    private readonly client: PolarCheckoutClient,
    private readonly productIds: { QUICK: string; PRO: string },
    private readonly defaultPresentmentCurrency: PresentmentCurrencyType = "krw",
    private readonly defaultPresentmentPriceAmount: number | undefined = undefined,
  ) {}

  async createCheckout(input: CreatePolarCheckoutInput): Promise<PolarCheckoutSession> {
    const checkout = await this.client.checkouts.create({
      products: [this.productIds[input.metadata.tier]],
      prices: {
        [this.productIds[input.metadata.tier]]: [
          {
            amountType: "fixed",
            priceCurrency: "krw",
            priceAmount: input.quote.totalPriceKrw,
            taxBehavior: "inclusive",
          },
          ...(this.defaultPresentmentCurrency !== "krw"
            ? [{
                amountType: "fixed" as const,
                priceCurrency: this.defaultPresentmentCurrency,
                priceAmount: this.defaultPresentmentPriceAmount ?? (() => {
                  throw new Error("POLAR_DEFAULT_PRESENTMENT_PRICE_AMOUNT is required when the Polar organization default currency is not KRW");
                })(),
                taxBehavior: "inclusive" as const,
              }]
            : []),
        ],
      },
      metadata: {
        ...(input.metadata.applicationCaseId
          ? { applicationCaseId: input.metadata.applicationCaseId }
          : {}),
        tier: input.metadata.tier,
        totalCharacters: input.metadata.totalCharacters,
        baseCharacters: input.metadata.baseCharacters,
        includedCharacters: input.metadata.includedCharacters,
        extraBlocks: input.metadata.extraBlocks,
        allowedCharacters: input.metadata.allowedCharacters,
      },
      externalCustomerId: input.externalCustomerId,
      customerEmail: input.customerEmail,
      customerIpAddress: input.customerIpAddress,
      successUrl: input.successUrl,
      returnUrl: input.returnUrl,
      currency: "krw",
      locale: "ko-KR",
      allowDiscountCodes: true,
      allowTrial: false,
    }, {
      timeoutMs: 10_000,
    });

    return {
      checkoutId: checkout.id,
      checkoutUrl: checkout.url,
      expiresAt: checkout.expiresAt.toISOString(),
    };
  }
}

export function getPolarCheckoutConfiguration() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  const quickProductId = process.env.POLAR_QUICK_PRODUCT_ID;
  const proProductId = process.env.POLAR_PRO_PRODUCT_ID;
  const rawServer = process.env.POLAR_SERVER?.trim().toLowerCase();
  if (rawServer && rawServer !== "production" && rawServer !== "sandbox") {
    throw new Error(`POLAR_SERVER는 production 또는 sandbox여야 합니다. 현재 값: "${process.env.POLAR_SERVER}"`);
  }
  const server = rawServer === "production" ? "production" : "sandbox";
  const defaultPresentmentCurrency = (process.env.POLAR_DEFAULT_PRESENTMENT_CURRENCY ?? "krw").trim().toLowerCase();
  const defaultPriceRaw = process.env.POLAR_DEFAULT_PRESENTMENT_PRICE_AMOUNT?.trim();
  const defaultPresentmentPriceAmount = defaultPriceRaw ? Number(defaultPriceRaw) : undefined;
  if (!Object.values(PresentmentCurrency).includes(defaultPresentmentCurrency as PresentmentCurrencyType) || (defaultPresentmentPriceAmount !== undefined && (!Number.isInteger(defaultPresentmentPriceAmount) || defaultPresentmentPriceAmount < 0))) {
    throw new Error("POLAR_DEFAULT_PRESENTMENT_CURRENCY must be a 3-letter currency and POLAR_DEFAULT_PRESENTMENT_PRICE_AMOUNT must be an integer");
  }

  if (!accessToken || !quickProductId || !proProductId) {
    throw new Error("POLAR_ACCESS_TOKEN, POLAR_QUICK_PRODUCT_ID, POLAR_PRO_PRODUCT_ID가 필요합니다.");
  }
  return { accessToken, quickProductId, proProductId, server, defaultPresentmentCurrency: defaultPresentmentCurrency as PresentmentCurrencyType, defaultPresentmentPriceAmount } as const;
}

export function getPolarWebhookConfiguration() {
  const { quickProductId, proProductId } = getPolarCheckoutConfiguration();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("POLAR_WEBHOOK_SECRET이 필요합니다.");
  }
  return { quickProductId, proProductId, webhookSecret };
}

export function createPolarCheckoutGatewayFromEnv() {
  const config = getPolarCheckoutConfiguration();
  return new PolarSdkCheckoutGateway(
    new Polar({ accessToken: config.accessToken, server: config.server }),
    { QUICK: config.quickProductId, PRO: config.proProductId },
    config.defaultPresentmentCurrency,
    config.defaultPresentmentPriceAmount,
  );
}


/**
 * Shape of the Polar configuration, with no values in it.
 *
 * A publishable key reached production with a fragment of its own variable
 * name spliced into the middle, and nothing noticed until sign-in broke. The
 * same paste can corrupt these, and a wrong token here reads as a generic
 * "결제 페이지를 만들지 못했습니다" — so the log says whether each value is
 * present and the right shape without printing anything secret.
 */
export function describePolarConfigShape() {
  const describe = (value: string | undefined, expectedPrefix?: string) => {
    if (!value) return "missing";
    const trimmed = value.trim();
    if (trimmed.length !== value.length) return `padded(len=${value.length})`;
    if (expectedPrefix && !trimmed.startsWith(expectedPrefix)) return `unexpected_prefix(starts=${trimmed.slice(0, 6)},len=${trimmed.length})`;
    return `ok(len=${trimmed.length})`;
  };

  return {
    server: process.env.POLAR_SERVER === undefined
      ? "(unset → sandbox)"
      : `raw=${JSON.stringify(process.env.POLAR_SERVER)} → ${process.env.POLAR_SERVER.trim().toLowerCase() === "production" ? "production" : "sandbox"}`,
    accessToken: describe(process.env.POLAR_ACCESS_TOKEN, "polar_"),
    quickProductId: describe(process.env.POLAR_QUICK_PRODUCT_ID),
    proProductId: describe(process.env.POLAR_PRO_PRODUCT_ID),
    webhookSecret: describe(process.env.POLAR_WEBHOOK_SECRET),
  };
}
