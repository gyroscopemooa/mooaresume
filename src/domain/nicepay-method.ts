import { z } from "zod";

export const nicepayBrandSchema = z.enum(["KAKAO", "NAVER", "SAMSUNG"]);
export type NicepayBrand = z.infer<typeof nicepayBrandSchema>;
export type NicepayAction = NicepayBrand | "CARD";
export const nicepayBrandNames: Record<NicepayBrand, string> = {
  KAKAO: "카카오페이", NAVER: "네이버페이", SAMSUNG: "삼성페이",
};
