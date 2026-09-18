import { z } from "zod";
import { guestApplicationHandoffSchema } from "@/application/application-case-handoff";

export const mobileSubmissionSchema = z.object({
  locale: z.enum(["ko-KR", "en-US"]),
  market: z.enum(["KR", "US"]),
  outputLanguage: z.enum(["ko", "en"]),
  application: guestApplicationHandoffSchema,
});

export function supportsMobileAnalysis(context: { market: string; outputLanguage: string }) {
  return context.market === "KR" && context.outputLanguage === "ko";
}
