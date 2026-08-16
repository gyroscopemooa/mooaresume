import { z } from "zod";

export const experienceCategorySchema = z.enum([
  "CAREER_INTERNSHIP", "PART_TIME", "PROJECT", "SCHOOL_MAJOR", "CLUB_STUDENT_COUNCIL",
  "AWARD", "EDUCATION_BOOTCAMP", "INTERNATIONAL", "VOLUNTEER", "MILITARY",
  "PERSONAL_PROJECT", "FREELANCE", "RESEARCH_PAPER", "HOBBY", "OTHER",
]);
export type ExperienceCategory = z.infer<typeof experienceCategorySchema>;

export const candidateExperienceInputSchema = z.object({
  id: z.string().min(1),
  category: experienceCategorySchema,
  title: z.string().max(120),
  summary: z.string().max(3000),
  period: z.string().max(100),
  situation: z.string().max(3000),
  action: z.string().max(3000),
  result: z.string().max(3000),
  emphasis: z.string().max(500),
});
export type CandidateExperienceInput = z.infer<typeof candidateExperienceInputSchema>;

export const profileEntryCategorySchema = z.enum([
  "EDUCATION", "GRADE", "CERTIFICATION", "SKILL", "LANGUAGE", "TRAINING", "AWARD", "OTHER",
]);
export type ProfileEntryCategory = z.infer<typeof profileEntryCategorySchema>;

export const candidateProfileEntrySchema = z.object({
  id: z.string().min(1),
  category: profileEntryCategorySchema,
  name: z.string().max(150),
  valueOrStatus: z.string().max(150),
  date: z.string().max(30),
  institution: z.string().max(150),
  applicationNote: z.string().max(2000),
});
export type CandidateProfileEntry = z.infer<typeof candidateProfileEntrySchema>;

export const candidateFreeformAttachmentSchema = z.object({
  filename: z.string().min(1).max(255),
  extension: z.string().max(20),
  sizeBytes: z.number().int().nonnegative(),
  text: z.string().min(1).max(50000),
});
export type CandidateFreeformAttachment = z.infer<typeof candidateFreeformAttachmentSchema>;

export const candidateMaterialDraftSchema = z.object({
  schemaVersion: z.literal("1.0"),
  freeformNotes: z.string().max(12000).default(""),
  experiences: z.array(candidateExperienceInputSchema).max(30),
  freeformAttachments: z.array(candidateFreeformAttachmentSchema).max(10).default([]),
  profileEntries: z.array(candidateProfileEntrySchema).max(50).default([]),
});
export type CandidateMaterialDraft = z.infer<typeof candidateMaterialDraftSchema>;

export function createCandidateExperience(category: ExperienceCategory): CandidateExperienceInput {
  return {
    id: crypto.randomUUID(),
    category,
    title: "",
    summary: "",
    period: "",
    situation: "",
    action: "",
    result: "",
    emphasis: "",
  };
}

export function createCandidateProfileEntry(category: ProfileEntryCategory): CandidateProfileEntry {
  return { id: crypto.randomUUID(), category, name: "", valueOrStatus: "", date: "", institution: "", applicationNote: "" };
}
