import { afterEach, describe, expect, it, vi } from "vitest";
import { createCheckoutQuote, createQuickCheckoutQuote, toCheckoutMetadata, toQuickCheckoutMetadata } from "@/domain/usage-entitlement";
import { classifyPolarFailure, getPolarCheckoutConfiguration, PolarSdkCheckoutGateway } from "./polar-checkout";

describe("Polar SDK checkout gateway", () => {
  it("creates a KRW inclusive checkout with server-owned price and metadata", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "checkout-1",
      url: "https://sandbox.polar.sh/checkout/checkout-1",
      expiresAt: new Date("2026-08-17T01:00:00.000Z"),
    });
    const quote = createQuickCheckoutQuote(13_000);
    const metadata = toQuickCheckoutMetadata(
      quote,
      "11111111-1111-4111-8111-111111111111",
    );
    const gateway = new PolarSdkCheckoutGateway(
      { checkouts: { create } } as never,
      { QUICK: "product-quick", PRO: "product-pro" },
    );

    const result = await gateway.createCheckout({
      quote,
      metadata,
      successUrl: "https://example.com/analysis/prepare?checkout=success",
      returnUrl: "https://example.com/analysis/prepare",
      externalCustomerId: "user-1",
      customerEmail: "user@example.com",
      customerIpAddress: "203.0.113.10",
    });

    expect(result).toEqual({
      checkoutId: "checkout-1",
      checkoutUrl: "https://sandbox.polar.sh/checkout/checkout-1",
      expiresAt: "2026-08-17T01:00:00.000Z",
    });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      products: ["product-quick"],
      prices: {
        "product-quick": [{
          amountType: "fixed",
          priceCurrency: "krw",
          priceAmount: quote.totalPriceKrw,
          taxBehavior: "inclusive",
        }],
      },
      metadata: expect.objectContaining({
        applicationCaseId: metadata.applicationCaseId,
        allowedCharacters: quote.allowedCharacters,
      }),
      externalCustomerId: "user-1",
      allowDiscountCodes: true,
      allowTrial: false,
      currency: "krw",
      locale: "ko-KR",
    }), { timeoutMs: 10_000 });
  });

  it("selects the PRO product id and fixed 12,900 KRW price for a PRO checkout", async () => {
    const create = vi.fn().mockResolvedValue({
      id: "checkout-2",
      url: "https://sandbox.polar.sh/checkout/checkout-2",
      expiresAt: new Date("2026-08-17T01:00:00.000Z"),
    });
    const quote = createCheckoutQuote("PRO", 20_000);
    const metadata = toCheckoutMetadata(
      quote,
      "11111111-1111-4111-8111-111111111111",
    );
    const gateway = new PolarSdkCheckoutGateway(
      { checkouts: { create } } as never,
      { QUICK: "product-quick", PRO: "product-pro" },
    );

    await gateway.createCheckout({
      quote,
      metadata,
      successUrl: "https://example.com/analysis/prepare?checkout=success",
      returnUrl: "https://example.com/analysis/prepare",
      externalCustomerId: "user-1",
      customerEmail: "user@example.com",
      customerIpAddress: "203.0.113.10",
    });

    expect(quote.totalPriceKrw).toBe(12_900);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      products: ["product-pro"],
      prices: {
        "product-pro": [{
          amountType: "fixed",
          priceCurrency: "krw",
          priceAmount: 12_900,
          taxBehavior: "inclusive",
        }],
      },
      metadata: expect.objectContaining({ tier: "PRO" }),
    }), { timeoutMs: 10_000 });
  });
});

describe("POLAR_SERVER 해석", () => {
  const original = process.env.POLAR_SERVER;
  afterEach(() => { process.env.POLAR_SERVER = original; });

  function serverFor(value: string | undefined) {
    if (value === undefined) delete process.env.POLAR_SERVER;
    else process.env.POLAR_SERVER = value;
    process.env.POLAR_ACCESS_TOKEN = "polar_test";
    process.env.POLAR_QUICK_PRODUCT_ID = "quick";
    process.env.POLAR_PRO_PRODUCT_ID = "pro";
    return getPolarCheckoutConfiguration().server;
  }

  it("대소문자와 공백이 달라도 production으로 읽는다", () => {
    // 정확히 "production"만 인정하던 비교 때문에 " Production "이 조용히
    // 샌드박스로 떨어졌고, 프로덕션 상품 ID가 그 환경에 없어 결제 페이지
    // 생성이 실패했다. 증상은 "결제 페이지를 만들지 못했습니다" 한 줄뿐이다.
    for (const value of ["production", "Production", "PRODUCTION", " production "]) {
      expect(serverFor(value)).toBe("production");
    }
  });

  it("설정이 없으면 샌드박스로 둔다", () => {
    expect(serverFor(undefined)).toBe("sandbox");
  });

  it("알 수 없는 값이면 조용히 넘어가지 않고 거절한다", () => {
    // 오타를 샌드박스로 해석하면 실수가 결제 실패로만 드러난다.
    expect(() => serverFor("prod")).toThrow(/production 또는 sandbox/);
  });
});

describe("Polar 실패 분류", () => {
  // 502 한 줄로는 토큰 문제인지 상품 ID 문제인지 구분이 안 된다. 분류만
  // 돌려주면 브라우저 Network 탭에서 바로 보이고, 값은 하나도 나가지 않는다.
  it("설정 누락을 알아본다", () => {
    expect(classifyPolarFailure(new Error("POLAR_ACCESS_TOKEN, POLAR_QUICK_PRODUCT_ID, POLAR_PRO_PRODUCT_ID가 필요합니다.")))
      .toBe("POLAR_CONFIG_MISSING");
  });

  it("인증 거부를 알아본다", () => {
    for (const message of ["Request failed with status 401", "Unauthorized", "invalid access token"]) {
      expect(classifyPolarFailure(new Error(message))).toBe("POLAR_AUTH_REJECTED");
    }
  });

  it("상품을 찾지 못한 경우를 알아본다", () => {
    // 샌드박스 ID를 프로덕션에 쓰면(반대도) 이 형태로 온다 — 환경을 바꾼
    // 직후 가장 흔한 원인이다.
    for (const message of ["status 404", "ResourceNotFound: product"]) {
      expect(classifyPolarFailure(new Error(message))).toBe("POLAR_PRODUCT_NOT_FOUND");
    }
  });

  it("POLAR_SERVER 오타를 따로 구분한다", () => {
    expect(classifyPolarFailure(new Error('POLAR_SERVER는 production 또는 sandbox여야 합니다. 현재 값: "prod"')))
      .toBe("POLAR_SERVER_INVALID");
  });

  it("모르는 오류는 뭉뚱그리되 분류는 남긴다", () => {
    expect(classifyPolarFailure(new Error("something else entirely"))).toBe("POLAR_UNKNOWN");
  });
});
