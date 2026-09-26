import type { PracticeMeasurement } from "@/domain/interview-pack-text";

/**
 * 사용자가 직접 잰 연습 시간의 기록. 이 기기의 브라우저에만 저장한다(서버·AI 는 이 값을 모른다).
 *
 * "사용자가 측정한 연습 시간"이지 자동으로 분석한 실제 발화 시간이 아니다.
 * 저장소가 막혀 있거나 값이 깨져 있어도 화면은 기록 없이 그대로 동작한다.
 */

export type PracticeRecord = PracticeMeasurement & { at: string };

const MAX_RECORDS = 5;
const key = (packId: string, slot: string) => `mooa:pack-practice:${packId}:${slot}`;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readPracticeRecords(packId: string, slot: string): PracticeRecord[] {
  try {
    const raw = storage()?.getItem(key(packId, slot));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is PracticeRecord =>
        Boolean(entry) && typeof entry === "object"
        && Number.isFinite((entry as PracticeRecord).seconds) && Number.isFinite((entry as PracticeRecord).chars)
        && typeof (entry as PracticeRecord).at === "string")
      .slice(-MAX_RECORDS);
  } catch {
    return [];
  }
}

export function appendPracticeRecord(packId: string, slot: string, record: PracticeRecord): PracticeRecord[] {
  const next = [...readPracticeRecords(packId, slot), record].slice(-MAX_RECORDS);
  try {
    storage()?.setItem(key(packId, slot), JSON.stringify(next));
  } catch {
    // 저장이 막힌 브라우저. 이번 화면에서만 보이고 사라진다.
  }
  return next;
}

export function clearPracticeRecords(packId: string, slot: string): void {
  try {
    storage()?.removeItem(key(packId, slot));
  } catch {
    // 위와 같음.
  }
}
