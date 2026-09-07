import "server-only";

import type { ReadingPagePrices, ReadingPolicy, ReadingProvider } from "@/domain/document-reading";

/**
 * 읽기 엔진 정책을 환경변수에서 만듭니다.
 *
 * 갈아타는 스위치가 여기 하나입니다. `READING_PROVIDER=OPENAI`로 두면 Upstage를
 * 쓰지 않고, 키가 없으면 설정과 무관하게 OpenAI로 내려갑니다 — 키를 아직 안
 * 넣었다는 이유로 서비스가 멈추면 그건 안전장치가 아니라 고장입니다.
 *
 * 단가는 코드에 박지 않습니다(`analysis-cost.ts`와 같은 규칙). 벤더 값은
 * 바뀌고, 틀린 단가는 없는 것보다 나쁩니다. 값을 안 넣으면 원가를 세지 않되
 * 차단기가 서비스를 막지도 않습니다.
 */

function readPrice(name: string): number | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

function readPrices(): ReadingPagePrices {
  const prices: ReadingPagePrices = {};
  const ocr = readPrice("READING_PRICE_UPSTAGE_OCR_KRW");
  const standard = readPrice("READING_PRICE_UPSTAGE_PARSE_STANDARD_KRW");
  const enhanced = readPrice("READING_PRICE_UPSTAGE_PARSE_ENHANCED_KRW");
  const vision = readPrice("READING_PRICE_OPENAI_VISION_KRW");
  if (ocr !== undefined) prices.UPSTAGE_OCR = ocr;
  if (standard !== undefined) prices.UPSTAGE_PARSE_STANDARD = standard;
  if (enhanced !== undefined) prices.UPSTAGE_PARSE_ENHANCED = enhanced;
  if (vision !== undefined) prices.OPENAI_VISION = vision;
  return prices;
}

export function readReadingPolicyFromEnv(): ReadingPolicy {
  const configured = process.env.READING_PROVIDER?.trim().toUpperCase();
  const provider: ReadingProvider = configured === "OPENAI" ? "OPENAI" : "UPSTAGE";
  return {
    provider,
    upstageAvailable: Boolean(process.env.UPSTAGE_API_KEY?.trim()),
    // 가장 비싼 단계는 기본으로 닫아 둡니다. 자동으로 무제한 쓰이면 큰 사건
    // 하나가 판매가를 넘깁니다.
    allowEnhanced: process.env.READING_ALLOW_ENHANCED?.trim() === "true",
    prices: readPrices(),
  };
}
