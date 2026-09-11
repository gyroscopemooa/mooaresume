import { afterEach, describe, expect, it } from "vitest";
import {
  classifyGooglePlayFailure,
  describeGooglePlayConfigShape,
  getGooglePlayConfiguration,
} from "./google-play-checkout";

const ENV_KEYS = [
  "GOOGLE_PLAY_PACKAGE_NAME",
  "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON",
  "GOOGLE_PLAY_QUICK_PRODUCT_ID",
  "GOOGLE_PLAY_QUICK_EXTRA_1_PRODUCT_ID",
  "GOOGLE_PLAY_QUICK_EXTRA_2_PRODUCT_ID",
  "GOOGLE_PLAY_QUICK_EXTRA_3_PRODUCT_ID",
  "GOOGLE_PLAY_PRO_PRODUCT_ID",
  "GOOGLE_PLAY_PRO_EXTRA_1_PRODUCT_ID",
  "GOOGLE_PLAY_PRO_EXTRA_2_PRODUCT_ID",
  "GOOGLE_PLAY_PRO_EXTRA_3_PRODUCT_ID",
  "GOOGLE_PLAY_FINAL_PRODUCT_ID",
  "GOOGLE_PLAY_FINAL_EXTRA_1_PRODUCT_ID",
  "GOOGLE_PLAY_FINAL_EXTRA_2_PRODUCT_ID",
  "GOOGLE_PLAY_FINAL_EXTRA_3_PRODUCT_ID",
] as const;

describe("Google Play 결제 설정", () => {
  const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });

  const validServiceAccountJson = JSON.stringify({
    client_email: "svc@mooaresume-play.iam.gserviceaccount.com",
    private_key: "-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n",
  });

  function setValidEnv() {
    process.env.GOOGLE_PLAY_PACKAGE_NAME = "com.mooaresume.app";
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = validServiceAccountJson;
    process.env.GOOGLE_PLAY_QUICK_PRODUCT_ID = "quick_1";
    process.env.GOOGLE_PLAY_PRO_PRODUCT_ID = "pro_1";
    delete process.env.GOOGLE_PLAY_FINAL_PRODUCT_ID;
  }

  it("완전한 설정을 읽고, 설정 안 한 추가 블록·FINAL 자리는 빈 문자열로 둔다", () => {
    setValidEnv();
    process.env.GOOGLE_PLAY_QUICK_EXTRA_1_PRODUCT_ID = "quick_extra_1";
    const config = getGooglePlayConfiguration();
    expect(config).toMatchObject({
      packageName: "com.mooaresume.app",
      serviceAccountEmail: "svc@mooaresume-play.iam.gserviceaccount.com",
      productIds: {
        QUICK: ["quick_1", "quick_extra_1", "", ""],
        PRO: ["pro_1", "", "", ""],
        FINAL: ["", "", "", ""],
      },
    });
  });

  it("필수 값이 없으면 거절한다", () => {
    delete process.env.GOOGLE_PLAY_PACKAGE_NAME;
    delete process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_PLAY_QUICK_PRODUCT_ID;
    delete process.env.GOOGLE_PLAY_PRO_PRODUCT_ID;
    expect(() => getGooglePlayConfiguration()).toThrow(/GOOGLE_PLAY_PACKAGE_NAME/);
  });

  it("서비스 계정 JSON이 깨졌거나 필드가 없으면 거절한다", () => {
    setValidEnv();
    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = "not-json";
    expect(() => getGooglePlayConfiguration()).toThrow(/올바른 JSON/);

    process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON = JSON.stringify({ client_email: "only@example.com" });
    expect(() => getGooglePlayConfiguration()).toThrow(/client_email\/private_key/);
  });

  it("설정 요약에는 비밀값이 하나도 찍히지 않는다", () => {
    setValidEnv();
    const shape = describeGooglePlayConfigShape();
    const serialized = JSON.stringify(shape);
    expect(serialized).not.toContain("fake");
    expect(serialized).not.toContain("svc@mooaresume-play.iam.gserviceaccount.com");
    expect(shape.serviceAccountJson).toBe("ok(parsed)");
    expect(shape.packageName).toMatch(/^ok\(len=/);
    expect(shape.quickProductIds[0]).toMatch(/^ok\(len=/);
    expect(shape.quickProductIds[1]).toBe("missing");
    expect(shape.proProductIds[0]).toMatch(/^ok\(len=/);
    expect(shape.finalProductIds[0]).toBe("missing");
  });
});

describe("Google Play 실패 분류", () => {
  it("설정 누락을 알아본다", () => {
    expect(classifyGooglePlayFailure(new Error(
      "GOOGLE_PLAY_PACKAGE_NAME, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON, GOOGLE_PLAY_QUICK_PRODUCT_ID, GOOGLE_PLAY_PRO_PRODUCT_ID가 필요합니다.",
    ))).toBe("GOOGLE_PLAY_CONFIG_MISSING");
  });

  it("인증 거부를 알아본다", () => {
    for (const message of ["Request failed with status 401", "Unauthorized", "invalid_grant"]) {
      expect(classifyGooglePlayFailure(new Error(message))).toBe("GOOGLE_PLAY_AUTH_REJECTED");
    }
  });

  it("구매 토큰을 찾지 못한 경우를 알아본다", () => {
    expect(classifyGooglePlayFailure(new Error("status 404 Not Found"))).toBe("GOOGLE_PLAY_PURCHASE_NOT_FOUND");
  });

  it("모르는 오류는 뭉뚱그리되 분류는 남긴다", () => {
    expect(classifyGooglePlayFailure(new Error("something else entirely"))).toBe("GOOGLE_PLAY_UNKNOWN");
  });
});
