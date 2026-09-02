import { describe, expect, it } from "vitest";
import type { AnalysisRequest } from "@/application/analysis-contract";
import { letterCharacters, resolveMaxOutputTokens } from "./output-budget";

function request(product: AnalysisRequest["product"], letterLength: number, extras: number[] = []): AnalysisRequest {
  return {
    requestId: "r",
    product,
    writingMode: "POLISH",
    writingStyle: "BALANCED",
    targetLength: 700,
    documents: [
      { kind: "cover_letter", text: "가".repeat(letterLength) },
      ...extras.map((length) => ({ kind: "resume" as const, text: "나".repeat(length) })),
    ],
  } as AnalysisRequest;
}

describe("출력 토큰 상한", () => {
  it("자기소개서 길이만 따라간다", () => {
    // Reference material is input cost, not output: a 50,000자 portfolio does
    // not make the answer longer.
    expect(letterCharacters(request("PRO", 5_000, [50_000]))).toBe(5_000);
    expect(resolveMaxOutputTokens(request("PRO", 20_000))).toBe(resolveMaxOutputTokens(request("PRO", 20_000, [50_000])));
  });

  it("짧은 글에도 문서를 끝맺을 만큼은 준다", () => {
    // The model has to close valid JSON however little it was given; cutting a
    // paid result off mid-document is a worse failure than a few spare tokens.
    expect(resolveMaxOutputTokens(request("QUICK", 300))).toBe(12_000);
    expect(resolveMaxOutputTokens(request("QUICK", 0))).toBe(12_000);
  });

  it("PRO 자소서 전량에 충분하다", () => {
    // 30,000 characters is the most a PRO entitlement allows, so this is the
    // largest legitimate run and must not be truncated.
    const full = resolveMaxOutputTokens(request("PRO", 30_000));
    expect(full).toBeGreaterThan(75_000);
    expect(full).toBeLessThan(90_000);
  });

  it("FINAL은 검증 단계만큼 더 준다", () => {
    // FINAL returns everything PRO does plus red team, four viewpoints, claim
    // tracing and the X-ray.
    expect(resolveMaxOutputTokens(request("FINAL", 10_000))).toBeGreaterThan(resolveMaxOutputTokens(request("PRO", 10_000)));
  });

  it("천장은 정상 사용으로는 닿지 않는다", () => {
    // A stop for a looping prompt, not a target. The largest real run sits well
    // under it.
    expect(resolveMaxOutputTokens(request("FINAL", 500_000))).toBe(120_000);
    expect(resolveMaxOutputTokens(request("PRO", 30_000))).toBeLessThan(120_000);
  });

  it("재시도마다 상한을 올린다 — 첫 시도와 같은 상한이면 같은 자리에서 또 잘린다", () => {
    const first = resolveMaxOutputTokens(request("QUICK", 4_000));
    const second = resolveMaxOutputTokens(request("QUICK", 4_000), 2);
    const third = resolveMaxOutputTokens(request("QUICK", 4_000), 3);
    expect(second).toBeGreaterThan(first);
    expect(third).toBeGreaterThan(second);
  });

  it("attemptNo를 생략하면 첫 시도와 같다 — 기존 호출부를 바꾸지 않는다", () => {
    expect(resolveMaxOutputTokens(request("PRO", 10_000))).toBe(resolveMaxOutputTokens(request("PRO", 10_000), 1));
  });

  it("3회를 넘는 값이 와도 3회차 상한으로 취급한다", () => {
    expect(resolveMaxOutputTokens(request("QUICK", 4_000), 4)).toBe(resolveMaxOutputTokens(request("QUICK", 4_000), 3));
  });

  it("재시도로 올라간 상한도 천장은 넘지 않는다", () => {
    expect(resolveMaxOutputTokens(request("FINAL", 500_000), 3)).toBe(120_000);
  });
});
