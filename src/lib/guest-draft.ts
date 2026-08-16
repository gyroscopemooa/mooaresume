import { z } from "zod";
import { coverLetterQuestionSchema } from "@/domain/cover-letter-question";
import { writingStyleSchema } from "@/domain/writing-style";

const STORAGE_KEY = "mooa:guest-draft:v1";

export const guestDraftSchema = z.object({
  draftText: z.string(),
  questionDrafts: z.array(z.string()).optional(),
  questions: z.array(coverLetterQuestionSchema).optional(),
  targetLength: z.number().int().min(100).max(3000),
  sourceFilename: z.string().optional(),
  sourceFileExtension: z.string().optional(),
  sourceFileSizeBytes: z.number().int().nonnegative().optional(),
  temporaryWritingMode: z.enum(["CREATE", "BUILD", "POLISH"]).optional(),
  writingStyle: writingStyleSchema.default("BALANCED"),
  selectedProduct: z.enum(["QUICK", "PRO"]).optional(),
  savedAt: z.string().datetime(),
});
export type GuestDraft = z.infer<typeof guestDraftSchema>;
type GuestDraftInput = Omit<z.input<typeof guestDraftSchema>, "savedAt">;

export function saveGuestDraft(input: GuestDraftInput) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...input, savedAt: new Date().toISOString() }));
}

export function loadGuestDraft(): GuestDraft | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = guestDraftSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function clearGuestDraft() {
  if (typeof window !== "undefined") sessionStorage.removeItem(STORAGE_KEY);
}
