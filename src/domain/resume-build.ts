import { z } from "zod";
import { CLASSIFIED_KIND_LABEL, classifiedKindSchema, type ClassifiedKind } from "./document-classify";
import {
  createResumeEntryId, hasContent, splitSkills,
  type ResumeCareer, type ResumeCertificate, type ResumeDraft, type ResumeEducation, type ResumeExtra,
} from "./resume-draft";

/**
 * AI 이력서 제작 — 흩어진 자료를 이력서 칸으로 옮기는 유료 기능.
 *
 * 무료 메이커는 **칸을 나눠 주는 도구**입니다. 여기서 파는 것은 그 칸을 채우는
 * 일 자체입니다: 경력증명서 PDF, 재직증명서, 예전 이력서, 그리고 "2021년 3월부터
 * 2년 반 동안 OO에서 품질관리"처럼 기억나는 대로 적은 줄글을 한꺼번에 받아
 * 경력·학력·자격 칸으로 옮깁니다. 파는 것이 글솜씨가 아니라 **옮겨 적는 30분**
 * 이므로 값도 첨삭보다 낮습니다.
 *
 * 지어내지 않는다는 선은 자소서 첨삭과 같습니다(analysis-consistency-and-rounded
 * -editing-philosophy). 자료에 없는 회사·기간·자격은 만들지 않고, 비는 칸은 비운
 * 채로 두고 무엇이 없는지를 `notes`로 말합니다. 없는 경력을 채워 주는 것은
 * 도움이 아니라 서류 위조입니다.
 */

/** 1건 정액. QUICK(5,900)보다 아래에 둡니다 — 파는 것이 판단이 아니라 정리입니다. */
export const RESUME_BUILD_PRICE_KRW = 3_900;

/** 모델에게 보내는 자료의 상한. 넘는 만큼은 보내지 않고, 무엇이 빠졌는지 말합니다. */
export const RESUME_BUILD_MAX_SOURCE_CHARS = 40_000;

/** 줄글 칸 하나가 자료 전체를 먹지 않도록. 넘으면 뒤가 잘립니다. */
export const RESUME_BUILD_MAX_NARRATIVE_CHARS = 12_000;

export const RESUME_BUILD_MAX_FILES = 10;

/**
 * 결제 전에 막는 최소치.
 *
 * 자료가 이만큼도 없으면 모델이 채울 것이 없어, 돈만 받고 빈 이력서를 돌려주게
 * 됩니다. 결제 뒤에 알게 되는 것이 최악이라 결제 단추 앞에서 셉니다.
 */
export const RESUME_BUILD_MIN_SOURCE_CHARS = 80;

export type ResumeBuildSource = {
  id: string;
  filename: string;
  extension: string;
  sizeBytes: number;
  text: string;
  kind: ClassifiedKind;
  /** 글자가 없는 스캔본. 보낼 것이 없으므로 세지도, 보내지도 않습니다. */
  unreadable?: boolean;
};

export const resumeBuildSourceSchema = z.object({
  id: z.string().min(1).max(80),
  filename: z.string().min(1).max(260),
  extension: z.string().max(16),
  sizeBytes: z.number().int().nonnegative(),
  text: z.string().max(RESUME_BUILD_MAX_SOURCE_CHARS),
  kind: classifiedKindSchema,
  unreadable: z.boolean().optional(),
});

export const resumeBuildRequestSchema = z.object({
  narrative: z.string().max(RESUME_BUILD_MAX_NARRATIVE_CHARS),
  sources: z.array(resumeBuildSourceSchema).max(RESUME_BUILD_MAX_FILES),
});
export type ResumeBuildRequest = z.infer<typeof resumeBuildRequestSchema>;

/** 글자가 있는 자료만. 스캔본은 파일 이름 말고는 보낼 것이 없습니다. */
function readableSources(sources: readonly ResumeBuildSource[]): ResumeBuildSource[] {
  return sources.filter((source) => !source.unreadable && source.text.trim().length > 0);
}

/**
 * 결제 단추를 열어도 되는지.
 *
 * 줄글과 읽힌 파일의 글자를 합쳐 셉니다. 스캔본만 잔뜩 올린 경우가 정확히 여기
 * 걸립니다 — 파일 개수는 많은데 모델이 볼 글자는 0입니다.
 */
export function countResumeBuildSourceCharacters(request: ResumeBuildRequest): number {
  const files = readableSources(request.sources).reduce((total, source) => total + source.text.trim().length, 0);
  return request.narrative.trim().length + files;
}

export function hasEnoughResumeBuildSource(request: ResumeBuildRequest): boolean {
  return countResumeBuildSourceCharacters(request) >= RESUME_BUILD_MIN_SOURCE_CHARS;
}

export type ResumeBuildPrompt = {
  /** 모델에게 보내는 글. */
  text: string;
  /** 상한에 걸려 다 보내지 못한 자료의 이름. 화면에서 그대로 말합니다. */
  truncated: string[];
};

/**
 * 자료를 모델이 읽을 한 덩이로 만듭니다.
 *
 * 자료마다 **무엇인지 이름을 붙여** 넣습니다. 경력증명서와 예전 자소서가 이름
 * 없이 이어 붙으면, 모델은 자소서의 포부를 경력으로 옮겨 적습니다 — 이 기능에서
 * 가장 크게 틀리는 방식입니다.
 *
 * 줄글을 맨 앞에 둡니다. 본인이 방금 적은 것이라 가장 최신이고, 상한에 걸려
 * 잘리면 안 되는 유일한 자료입니다.
 */
export function buildResumeBuildPrompt(request: ResumeBuildRequest): ResumeBuildPrompt {
  const blocks: string[] = [];
  const truncated: string[] = [];
  let remaining = RESUME_BUILD_MAX_SOURCE_CHARS;

  const narrative = request.narrative.trim();
  if (narrative) {
    const used = narrative.slice(0, remaining);
    if (used.length < narrative.length) truncated.push("본인이 적은 설명");
    remaining -= used.length;
    blocks.push(`[본인이 적은 설명]\n${used}`);
  }

  let index = 0;
  for (const source of readableSources(request.sources)) {
    index += 1;
    const label = `[자료 ${index} · ${CLASSIFIED_KIND_LABEL[source.kind]} · ${source.filename}]`;
    if (remaining <= 0) { truncated.push(source.filename); continue; }
    const text = source.text.trim();
    const used = text.slice(0, remaining);
    if (used.length < text.length) truncated.push(source.filename);
    remaining -= used.length;
    blocks.push(`${label}\n${used}`);
  }

  return { text: blocks.join("\n\n"), truncated };
}

/**
 * 모델이 돌려주는 모양.
 *
 * 배열 개수 제한(`maxItems`)과 문자열 길이 제한은 넣지 않습니다 — OpenAI의
 * strict 스키마가 아직 받지 않는 키워드라, 넣으면 호출 자체가 400으로 떨어집니다.
 * 개수는 받은 뒤 `normalizeResumeBuildOutput`에서 자릅니다.
 */
export const resumeBuildOutputSchema = z.object({
  contact: z.object({
    name: z.string(),
    birth: z.string(),
    phone: z.string(),
    email: z.string(),
    address: z.string(),
    headline: z.string(),
  }),
  educations: z.array(z.object({
    school: z.string(), major: z.string(), period: z.string(), status: z.string(), note: z.string(),
  })),
  careers: z.array(z.object({
    company: z.string(), role: z.string(), period: z.string(), duties: z.string(),
  })),
  certificates: z.array(z.object({
    name: z.string(), issuer: z.string(), date: z.string(),
  })),
  extras: z.array(z.object({
    title: z.string(), period: z.string(), detail: z.string(),
  })),
  skills: z.string(),
  /** 채우지 못한 칸과 확인이 필요한 것. 사람에게 그대로 보여 줍니다. */
  notes: z.array(z.string()),
});
export type ResumeBuildOutput = z.infer<typeof resumeBuildOutputSchema>;

const MAX_ROWS_PER_SECTION = 30;
const MAX_NOTES = 8;

function trimRow<T extends Record<string, string>>(row: T): T {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value.trim()])) as T;
}

/** 개수와 공백을 여기서 정리합니다. 스키마로 막을 수 없는 것들입니다. */
export function normalizeResumeBuildOutput(output: ResumeBuildOutput): ResumeBuildOutput {
  return {
    contact: trimRow(output.contact),
    educations: output.educations.map(trimRow).filter((row) => hasContent([row.school, row.major, row.period, row.note])).slice(0, MAX_ROWS_PER_SECTION),
    careers: output.careers.map(trimRow).filter((row) => hasContent([row.company, row.role, row.period, row.duties])).slice(0, MAX_ROWS_PER_SECTION),
    certificates: output.certificates.map(trimRow).filter((row) => hasContent([row.name, row.issuer, row.date])).slice(0, MAX_ROWS_PER_SECTION),
    extras: output.extras.map(trimRow).filter((row) => hasContent([row.title, row.period, row.detail])).slice(0, MAX_ROWS_PER_SECTION),
    skills: output.skills.trim(),
    notes: output.notes.map((note) => note.trim()).filter(Boolean).slice(0, MAX_NOTES),
  };
}

/** 같은 줄을 두 번 넣지 않기 위한 열쇠. 회사 이름만 같고 기간이 다르면 다른 줄입니다. */
function rowKey(values: readonly string[]): string {
  return values.map((value) => value.replace(/\s+/g, "").toLowerCase()).join("|");
}

/**
 * 결과를 지금 쓰고 있는 이력서에 얹습니다.
 *
 * 규칙은 하나입니다: **사람이 적은 것을 이기지 않습니다.**
 *
 * - 인적사항은 비어 있는 칸만 채웁니다. 본인이 적은 전화번호를 자료에서 찾은
 *   옛 번호로 덮으면, 연락이 오지 않는 이력서가 됩니다.
 * - 목록(경력·학력·자격·활동)은 사람이 적어 둔 줄을 그대로 두고 뒤에 붙입니다.
 *   같은 줄로 보이면 건너뜁니다 — 같은 회사가 두 번 적힌 이력서는 본인이 지워야
 *   하고, 그러면 채워 준 값이 사라집니다.
 * - 빈 줄(아무것도 안 적은 기본 줄)은 자리를 내줍니다.
 * - 사진은 손대지 않습니다. 자료에서 나올 수 있는 값이 아닙니다.
 */
export function applyResumeBuildOutput(current: ResumeDraft, output: ResumeBuildOutput): ResumeDraft {
  const filled = normalizeResumeBuildOutput(output);
  const fill = (mine: string, theirs: string) => (mine.trim() ? mine : theirs);

  const keptEducations = current.educations.filter((row) => hasContent([row.school, row.major, row.period, row.note]));
  const keptCareers = current.careers.filter((row) => hasContent([row.company, row.role, row.period, row.duties]));
  const keptCertificates = current.certificates.filter((row) => hasContent([row.name, row.issuer, row.date]));
  const keptExtras = current.extras.filter((row) => hasContent([row.title, row.period, row.detail]));

  const educationKeys = new Set(keptEducations.map((row) => rowKey([row.school, row.period])));
  const careerKeys = new Set(keptCareers.map((row) => rowKey([row.company, row.period])));
  const certificateKeys = new Set(keptCertificates.map((row) => rowKey([row.name])));
  const extraKeys = new Set(keptExtras.map((row) => rowKey([row.title, row.period])));

  const addedEducations: ResumeEducation[] = filled.educations
    .filter((row) => !educationKeys.has(rowKey([row.school, row.period])))
    .map((row) => ({ id: createResumeEntryId(), school: row.school, major: row.major, period: row.period, status: row.status || "졸업", note: row.note }));
  const addedCareers: ResumeCareer[] = filled.careers
    .filter((row) => !careerKeys.has(rowKey([row.company, row.period])))
    .map((row) => ({ id: createResumeEntryId(), company: row.company, role: row.role, period: row.period, duties: row.duties }));
  const addedCertificates: ResumeCertificate[] = filled.certificates
    .filter((row) => !certificateKeys.has(rowKey([row.name])))
    .map((row) => ({ id: createResumeEntryId(), name: row.name, issuer: row.issuer, date: row.date }));
  const addedExtras: ResumeExtra[] = filled.extras
    .filter((row) => !extraKeys.has(rowKey([row.title, row.period])))
    .map((row) => ({ id: createResumeEntryId(), title: row.title, period: row.period, detail: row.detail }));

  const mergedSkills = [...splitSkills(current.skills), ...splitSkills(filled.skills)];
  const seenSkills = new Set<string>();
  const skills = mergedSkills.filter((skill) => {
    const key = skill.replace(/\s+/g, "").toLowerCase();
    if (seenSkills.has(key)) return false;
    seenSkills.add(key);
    return true;
  });

  const educations = [...keptEducations, ...addedEducations];
  const careers = [...keptCareers, ...addedCareers];

  return {
    contact: {
      name: fill(current.contact.name, filled.contact.name),
      birth: fill(current.contact.birth, filled.contact.birth),
      phone: fill(current.contact.phone, filled.contact.phone),
      email: fill(current.contact.email, filled.contact.email),
      address: fill(current.contact.address, filled.contact.address),
      headline: fill(current.contact.headline, filled.contact.headline),
    },
    photo: current.photo,
    // 목록이 통째로 비면 편집 화면에 칸이 하나도 없습니다. 빈 줄 하나는 남깁니다.
    educations: educations.length ? educations : current.educations,
    careers: careers.length ? careers : current.careers,
    certificates: [...keptCertificates, ...addedCertificates],
    extras: [...keptExtras, ...addedExtras],
    skills: skills.join(", "),
  };
}

/** 무엇이 채워졌는지 한 줄로. 결과를 얹은 뒤 화면이 그대로 읽어 줍니다. */
export function describeResumeBuildResult(output: ResumeBuildOutput): string {
  const filled = normalizeResumeBuildOutput(output);
  const parts = [
    filled.careers.length ? `경력 ${filled.careers.length}건` : "",
    filled.educations.length ? `학력 ${filled.educations.length}건` : "",
    filled.certificates.length ? `자격 ${filled.certificates.length}건` : "",
    filled.extras.length ? `활동 ${filled.extras.length}건` : "",
  ].filter(Boolean);
  return parts.length ? `${parts.join(" · ")}을 찾았습니다.` : "자료에서 옮겨 적을 항목을 찾지 못했습니다.";
}
