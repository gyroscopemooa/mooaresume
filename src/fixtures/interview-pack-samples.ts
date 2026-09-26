import type { MaterialDoc, PackDocKind } from "@/domain/interview-pack";
import { COMPLETE_TEXT, CONFLICTING_TEXT, INSUFFICIENT_TEXT } from "./interview-pack-sample-texts";

/**
 * 관리자 FINAL 테스트가 쓰는 가상 지원 건 세 개.
 *
 * 여기에는 자료(입력)만 있다. "이렇게 나와야 한다"는 기대 동작은
 * interview-pack-expectations.ts 에 따로 두어, 정답 설명이 지원자 자료로
 * 모델에 들어가지 않게 한다.
 */

export type PackSampleId = "complete" | "insufficient" | "conflicting";

export type PackSample = {
  id: PackSampleId;
  title: string;
  /** 관리자 화면 설명(모델에 보내지 않는다). */
  summary: string;
  /** "FINAL 전체 흐름 테스트"에서 사람이 입력 화면에 채울 회사·직무. */
  company: string;
  role: string;
  /** 가상 FINAL 스냅샷(면접팩만 실제 AI 테스트)에 들어가는 문서들. */
  docs: MaterialDoc[];
  /** 원본 업로드 경로 확인용 TXT 파일(첨부 이름과 내용). */
  filename: string;
  fullText: string;
};

const SECTION_HEADER = /^\[(.+?)\s*\/\s*([A-Z]+-\d+)\]\s*$/;
const NOTE_HEADER = /^\[(제공하지 않은 자료)\]\s*$/;

const KIND_BY_PREFIX: Record<string, PackDocKind> = {
  PROFILE: "note",
  JOB: "job_posting",
  RESUME: "resume",
  EXPERIENCE: "experience",
  MOTIVATION: "note",
  TRAIT: "note",
  GOAL: "note",
  MEMO: "note",
  COVER: "cover_letter",
};

/**
 * 테스트 TXT를 `[제목 / 코드]` 구간별 문서로 나눈다.
 * 파일 맨 위의 "가상자료입니다" 안내 줄은 문서로 만들지 않는다(모델이 읽을 자료가 아니다).
 */
export function splitSampleSections(fullText: string, idPrefix = "D"): MaterialDoc[] {
  const docs: MaterialDoc[] = [];
  let current: { title: string; kind: PackDocKind; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const text = current.lines.join("\n").trim();
    if (text) {
      docs.push({
        id: `${idPrefix}${docs.length + 1}`,
        kind: current.kind,
        title: current.title,
        text,
        documentId: null,
        documentVersionId: null,
        filename: null,
      });
    }
    current = null;
  };

  for (const line of fullText.replace(/\r\n/g, "\n").split("\n")) {
    const header = SECTION_HEADER.exec(line.trim());
    const note = NOTE_HEADER.exec(line.trim());
    if (header) {
      flush();
      const code = header[2];
      current = { title: `${header[1]} (${code})`, kind: KIND_BY_PREFIX[code.split("-")[0]] ?? "other", lines: [] };
    } else if (note) {
      flush();
      current = { title: "지원자가 제공하지 않은 자료", kind: "note", lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return docs;
}

export const PACK_SAMPLES: readonly PackSample[] = [
  {
    id: "complete",
    title: "A. 자료 충분",
    summary: "가상 자동차 부품 품질 지원자. 역할·행동·수치·지원 이유·포부·약점·협업 경험이 서로 일치합니다.",
    company: "샘플모빌리티 주식회사(가상기업)",
    role: "자동차 부품 품질관리",
    docs: splitSampleSections(COMPLETE_TEXT),
    filename: "01_complete_materials.txt",
    fullText: COMPLETE_TEXT,
  },
  {
    id: "insufficient",
    title: "B. 자료 부족",
    summary: "직무와 \"성실하다\"는 설명만 있고 구체 경험·회사 정보·지원 이유가 없는 자료입니다.",
    company: "",
    role: "생산관리",
    docs: splitSampleSections(INSUFFICIENT_TEXT),
    filename: "02_insufficient_materials.txt",
    fullText: INSUFFICIENT_TEXT,
  },
  {
    id: "conflicting",
    title: "C. 자료 충돌",
    summary: "재직기간·역할·같은 개선 사례의 수치가 이력서와 자기소개서에서 서로 다릅니다.",
    company: "샘플모빌리티 주식회사(가상기업)",
    role: "품질관리",
    docs: splitSampleSections(CONFLICTING_TEXT),
    filename: "03_conflicting_materials.txt",
    fullText: CONFLICTING_TEXT,
  },
];

export function getPackSample(id: string): PackSample | null {
  return PACK_SAMPLES.find((sample) => sample.id === id) ?? null;
}
