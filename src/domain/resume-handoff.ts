import { candidateMaterialDraftSchema, type CandidateMaterialDraft } from "./candidate-material";

/**
 * 이력서 메이커에서 만든 이력서를 자소서 첨삭의 "지원자료"로 넘깁니다.
 *
 * 자유 메모(`freeformNotes`)가 아니라 `materialAttachments`에 `RESUME`로 넣는
 * 것이 핵심입니다. 첨삭 프롬프트는 자료마다 이름을 붙여 모델에게 넘기는데,
 * 이력서가 이름 없는 첨부로 들어가면 포트폴리오로 읽힙니다. 그리고 PRO·FINAL이
 * 파는 것이 **이력서 × 자소서 교차검증**이라, 이 자리에 놓여야 "이력서 있음"
 * 판정이 켜지고 대조가 실제로 일어납니다(analysis-preparation.tsx의
 * `hasResumeMaterial`).
 */
export const RESUME_HANDOFF_FILENAME = "MOOA에서 만든 이력서.txt";
export const GUEST_CANDIDATE_MATERIALS_KEY = "mooa:guest-candidate-materials:v1";

/** 첨부 하나의 글자 상한(candidateFreeformAttachmentSchema). */
const ATTACHMENT_TEXT_LIMIT = 50_000;

function emptyMaterials(): CandidateMaterialDraft {
  return { schemaVersion: "1.0", freeformNotes: "", experiences: [], freeformAttachments: [], profileEntries: [], materialAttachments: [] };
}

function byteLength(text: string): number {
  return typeof TextEncoder === "undefined" ? text.length : new TextEncoder().encode(text).length;
}

/**
 * 이미 담아 둔 지원자료에 이력서를 얹습니다.
 *
 * 두 가지를 지킵니다. ① 손님이 따로 올린 파일·경험·자격은 건드리지 않습니다 —
 * 이어가기 한 번이 그동안 모아 둔 자료를 지우면 안 됩니다. ② 같은 이름의
 * 이력서는 갈아 끼웁니다. 이력서를 고치고 다시 눌렀을 때 옛 판과 새 판이 함께
 * 남으면, 모델은 서로 어긋나는 이력서 두 장을 대조하게 됩니다.
 *
 * 저장된 값이 깨져 있으면 빈 자료에서 시작합니다. 여기서 던지면 이어가기가
 * 통째로 막히는데, 잃는 것은 파싱되지 않는 옛 초안뿐입니다.
 */
export function mergeResumeIntoMaterials(rawExisting: string | null, resumeText: string): CandidateMaterialDraft {
  let base = emptyMaterials();
  if (rawExisting) {
    try {
      const parsed = candidateMaterialDraftSchema.safeParse(JSON.parse(rawExisting));
      if (parsed.success) base = parsed.data;
    } catch {
      // 옛 초안이 깨졌습니다. 빈 자료로 시작합니다.
    }
  }

  const text = resumeText.slice(0, ATTACHMENT_TEXT_LIMIT);
  const kept = base.materialAttachments.filter((attachment) => attachment.filename !== RESUME_HANDOFF_FILENAME);

  return {
    ...base,
    materialAttachments: [
      ...kept,
      { filename: RESUME_HANDOFF_FILENAME, extension: "txt", sizeBytes: byteLength(text), text, kind: "RESUME" as const },
    ],
  };
}
