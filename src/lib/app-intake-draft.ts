import { z } from "zod";
import { classifiedKindSchema } from "@/domain/document-classify";
import { coverLetterQuestionSchema } from "@/domain/cover-letter-question";
import { candidateMaterialDraftSchema } from "@/domain/candidate-material";
import { productTierSchema } from "@/domain/usage-entitlement";

/**
 * 앱 화면에서 치고 있던 입력을 탭 이동·결과 왕복 사이에 붙들어 두는 자리.
 *
 * 웹에서는 입력 화면이 한 장이고, 다음 화면으로 넘어갈 때 `guest-draft`에
 * 저장됩니다. 앱은 하단 탭으로 이력서·커리어·내 정보를 오가므로 입력 화면이
 * 수시로 사라집니다 — 넘어갈 때만 저장하면, 이력서 탭을 한 번 눌러 본 사람은
 * 붙여넣은 자소서와 첨부를 잃습니다.
 *
 * 그래서 치는 동안에도 같은 탭의 `sessionStorage`에 담아 둡니다. 웹의 기존
 * 게스트 초안과 같은 보관 범위입니다(서버로 보내지 않고, 탭을 닫으면 사라짐).
 * 저장되는 것은 사용자가 직접 넣은 글과 첨부에서 뽑은 글자이며, 분석 실행은
 * 지금까지와 똑같이 저장·결제 화면에서만 시작됩니다.
 */

const simpleIntakeFileSchema = z.object({
  id: z.string().min(1),
  filename: z.string(),
  extension: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  text: z.string(),
  kind: classifiedKindSchema,
  basis: z.enum(["filename", "content", "conflict", "fallback"]),
  unreadable: z.boolean().optional(),
});

export const appIntakeDraftSchema = z.object({
  version: z.literal(1),
  inputMode: z.enum(["SIMPLE", "DETAILED"]),
  simpleDraft: z.string(),
  simpleDraftRole: z.enum(["LETTER", "NOTE"]),
  simpleFiles: z.array(simpleIntakeFileSchema).max(20),
  simpleTargetLength: z.string(),
  /** 문항 순번 → 목표 글자 수. JSON을 거치면 키가 문자열이 됩니다. */
  simpleTargets: z.record(z.string(), z.number().int()),
  simpleFacts: z.string(),
  simpleDirection: z.string(),
  questions: z.array(coverLetterQuestionSchema).max(20),
  posting: z.string(),
  postingUrl: z.string(),
  postingFilenames: z.array(z.string()).max(10),
  companyName: z.string(),
  roleName: z.string(),
  materials: candidateMaterialDraftSchema.optional(),
  savedAt: z.string(),
});
export type AppIntakeDraft = z.infer<typeof appIntakeDraftSchema>;

export const appSelectionSchema = z.object({
  product: productTierSchema,
  mode: z.enum(["CREATE", "BUILD", "POLISH"]),
});
export type AppSelection = z.infer<typeof appSelectionSchema>;

const DRAFT_KEY = "mooa:app-intake:v1";
const SELECTION_KEY = "mooa:app-selection:v1";

function session(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * 저장하고, 저장이 됐는지 알려줍니다.
 *
 * 첨부에서 뽑은 글자가 많으면 `sessionStorage` 한도를 넘습니다. 그 때 조용히
 * 실패하면 탭을 옮긴 사람이 "사라졌다"만 보게 되므로, 화면이 미리 말할 수
 * 있도록 결과를 돌려줍니다.
 */
export function saveAppIntakeDraft(draft: Omit<AppIntakeDraft, "version" | "savedAt">): boolean {
  const storage = session();
  if (!storage) return false;
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, version: 1, savedAt: new Date().toISOString() }));
    return true;
  } catch {
    return false;
  }
}

export function loadAppIntakeDraft(): AppIntakeDraft | null {
  const storage = session();
  if (!storage) return null;
  try {
    const raw = storage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = appIntakeDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearAppIntakeDraft() {
  try {
    session()?.removeItem(DRAFT_KEY);
  } catch {
    // 지울 수 없으면 그대로 둡니다 — 다음 저장이 덮어씁니다.
  }
}

/**
 * "시작" 메뉴에서 단계 확인용으로 붙여넣은 글을 첨삭 입력으로 옮깁니다.
 *
 * 같은 글을 두 번 치게 하지 않으려는 것뿐입니다. 이미 입력 중인 글이 있으면
 * 건드리지 않습니다 — 확인용으로 붙여넣은 조각이 쓰고 있던 지원서를 덮어쓰면
 * 잃는 쪽이 훨씬 큽니다.
 */
export function carryDraftTextIntoAppIntake(text: string): boolean {
  if (!text.trim()) return false;
  const current = loadAppIntakeDraft();
  if (current?.simpleDraft.trim()) return false;
  return saveAppIntakeDraft({
    inputMode: current?.inputMode ?? "SIMPLE",
    simpleDraft: text,
    simpleDraftRole: current?.simpleDraftRole ?? "LETTER",
    simpleFiles: current?.simpleFiles ?? [],
    simpleTargetLength: current?.simpleTargetLength ?? "700",
    simpleTargets: current?.simpleTargets ?? {},
    simpleFacts: current?.simpleFacts ?? "",
    simpleDirection: current?.simpleDirection ?? "",
    questions: current?.questions ?? [],
    posting: current?.posting ?? "",
    postingUrl: current?.postingUrl ?? "",
    postingFilenames: current?.postingFilenames ?? [],
    companyName: current?.companyName ?? "",
    roleName: current?.roleName ?? "",
    materials: current?.materials,
  });
}

export function saveAppSelection(selection: AppSelection) {
  try {
    session()?.setItem(SELECTION_KEY, JSON.stringify(selection));
  } catch {
    // 선택을 기억하지 못해도 기본값으로 동작합니다.
  }
}

export function loadAppSelection(): AppSelection | null {
  const storage = session();
  if (!storage) return null;
  try {
    const raw = storage.getItem(SELECTION_KEY);
    if (!raw) return null;
    const parsed = appSelectionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
