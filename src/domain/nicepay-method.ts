import { z } from "zod";

export const nicepayBrandSchema = z.enum(["KAKAO", "NAVER", "TOSS", "SAMSUNG", "APPLE", "PAYCO"]);
export type NicepayBrand = z.infer<typeof nicepayBrandSchema>;
export type NicepayAction = NicepayBrand | "CARD";
export const nicepayConsentSchema = z.object({ version: z.literal("2026-11-13"), financial: z.literal(true), collection: z.literal(true), sharing: z.literal(true), naverMethod: z.enum(["CARD", "POINT"]).optional() }).strict();
export type NicepayConsent = z.infer<typeof nicepayConsentSchema>;
export const nicepayBrandNames: Record<NicepayBrand, string> = {
  KAKAO: "카카오페이", NAVER: "네이버페이", TOSS: "토스페이", SAMSUNG: "삼성페이", APPLE: "Apple Pay", PAYCO: "PAYCO",
};
