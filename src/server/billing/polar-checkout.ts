import "server-only";

import { Polar } from "@polar-sh/sdk";
import type { CheckoutQuote, QuickCheckoutMetadata } from "@/domain/usage-entitlement";
import { PresentmentCurrency, type PresentmentCurrency as PresentmentCurrencyType } from "@polar-sh/sdk/models/components/presentmentcurrency.js";

export type CreatePolarCheckoutInput = {
  quote: CheckoutQuote;
  metadata: QuickCheckoutMetadata;
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
    private readonly quickProductId: string,
    private readonly defaultPresentmentCurrency: PresentmentCurrencyType = "krw",
    private readonly defaultPresentmentPriceAmount: number | undefined = undefined,
  ) {}

  async createCheckout(input: CreatePolarCheckoutInput): Promise<PolarCheckoutSession> {
    const checkout = await this.client.checkouts.create({
      products: [this.quickProductId],
      prices: {
        [this.quickProductId]: [
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
  const server = process.env.POLAR_SERVER === "production" ? "production" : "sandbox";
  const defaultPresentmentCurrency = (process.env.POLAR_DEFAULT_PRESENTMENT_CURRENCY ?? "krw").trim().toLowerCase();
  const defaultPriceRaw = process.env.POLAR_DEFAULT_PRESENTMENT_PRICE_AMOUNT?.trim();
  const defaultPresentmentPriceAmount = defaultPriceRaw ? Number(defaultPriceRaw) : undefined;
  if (!Object.values(PresentmentCurrency).includes(defaultPresentmentCurrency as PresentmentCurrencyType) || (defaultPresentmentPriceAmount !== undefined && (!Number.isInteger(defaultPresentmentPriceAmount) || defaultPresentmentPriceAmount < 0))) {
    throw new Error("POLAR_DEFAULT_PRESENTMENT_CURRENCY must be a 3-letter currency and POLAR_DEFAULT_PRESENTMENT_PRICE_AMOUNT must be an integer");
  }

  if (!accessToken || !quickProductId) {
    throw new Error("POLAR_ACCESS_TOKEN과 POLAR_QUICK_PRODUCT_ID가 필요합니다.");
  }
  return { accessToken, quickProductId, server, defaultPresentmentCurrency: defaultPresentmentCurrency as PresentmentCurrencyType, defaultPresentmentPriceAmount } as const;
}

export function getPolarWebhookConfiguration() {
  const { quickProductId } = getPolarCheckoutConfiguration();
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("POLAR_WEBHOOK_SECRET이 필요합니다.");
  }
  return { quickProductId, webhookSecret };
}

export function createPolarCheckoutGatewayFromEnv() {
  const config = getPolarCheckoutConfiguration();
  return new PolarSdkCheckoutGateway(
    new Polar({ accessToken: config.accessToken, server: config.server }),
    config.quickProductId,
    config.defaultPresentmentCurrency,
    config.defaultPresentmentPriceAmount,
  );
}

