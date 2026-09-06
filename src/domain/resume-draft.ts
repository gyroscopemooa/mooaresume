/**
 * 이력서 메이커가 다루는 값.
 *
 * 서버로 보내지 않습니다. 무료로 열어 두는 도구라 로그인도 받지 않고,
 * 손님이 적은 것은 그 브라우저의 localStorage에만 남습니다. 이름·연락처·
 * 생년월일이 들어오는 자리이므로, 보내지 않는 편이 지키기도 쉽습니다.
 *
 * 그래서 모든 값이 문자열입니다. 날짜를 Date로 받으면 "2021.03"처럼 월까지만
 * 적는 한국 이력서 표기를 담지 못하고, 담으려면 없는 일자를 지어내야 합니다.
 */
export type ResumeEntryId = string;

export type ResumeContact = {
  name: string;
  birth: string;
  phone: string;
  email: string;
  address: string;
  /** 이름 아래 한 줄. "품질관리 3년 · 반도체 공정" 같은 것. */
  headline: string;
};

export type ResumeEducation = { id: ResumeEntryId; school: string; major: string; period: string; status: string; note: string };
export type ResumeCareer = { id: ResumeEntryId; company: string; role: string; period: string; duties: string };
export type ResumeCertificate = { id: ResumeEntryId; name: string; issuer: string; date: string };
export type ResumeExtra = { id: ResumeEntryId; title: string; period: string; detail: string };

/**
 * 증명사진.
 *
 * 한국 이력서에는 흔히 붙지만 요구하지 않는 곳도 많아졌습니다(공공기관은
 * 블라인드 채용에서 아예 받지 않습니다). 그래서 켜고 끄는 값입니다 — 끄면
 * 종이에서 자리까지 사라지고, 다시 켜면 넣어 둔 사진이 그대로 돌아옵니다.
 *
 * 저장 전에 폭 240px로 줄여 JPEG로 다시 굽습니다. localStorage는 5MB 남짓이라
 * 요즘 휴대폰 사진 한 장(3~8MB)을 그대로 넣으면 저장이 통째로 실패하고, 그러면
 * 사진뿐 아니라 이력서 전체가 저장되지 않습니다.
 */
export type ResumePhoto = { enabled: boolean; dataUrl: string };

export const RESUME_PHOTO_MAX_WIDTH = 240;

export type ResumeDraft = {
  contact: ResumeContact;
  photo: ResumePhoto;
  educations: ResumeEducation[];
  careers: ResumeCareer[];
  certificates: ResumeCertificate[];
  extras: ResumeExtra[];
  /** 쉼표로 나눠 적는 기술·역량. 태그 입력을 따로 만들지 않은 이유는 3절 참고. */
  skills: string;
};

export const RESUME_DRAFT_STORAGE_KEY = "mooa.resume-maker.v1";

/**
 * `crypto.randomUUID`는 안전한 컨텍스트(https/localhost)에서만 있습니다.
 * 이력서 한 장의 항목 구분에 쓸 값이라, 없으면 시각+난수로 충분합니다.
 */
export function createResumeEntryId(): ResumeEntryId {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyEducation(): ResumeEducation {
  return { id: createResumeEntryId(), school: "", major: "", period: "", status: "졸업", note: "" };
}
export function emptyCareer(): ResumeCareer {
  return { id: createResumeEntryId(), company: "", role: "", period: "", duties: "" };
}
export function emptyCertificate(): ResumeCertificate {
  return { id: createResumeEntryId(), name: "", issuer: "", date: "" };
}
export function emptyExtra(): ResumeExtra {
  return { id: createResumeEntryId(), title: "", period: "", detail: "" };
}

export function emptyResumeDraft(): ResumeDraft {
  return {
    contact: { name: "", birth: "", phone: "", email: "", address: "", headline: "" },
    photo: { enabled: false, dataUrl: "" },
    educations: [emptyEducation()],
    careers: [emptyCareer()],
    certificates: [],
    extras: [],
    skills: "",
  };
}

/**
 * 저장된 값을 읽습니다.
 *
 * 저장 형식이 나중에 바뀌어도 옛 값 때문에 화면이 깨지면 안 되므로, 모양이
 * 맞지 않는 값은 조용히 버리고 빈 이력서로 시작합니다. 여기서 던지면 손님은
 * 흰 화면을 봅니다 — 잃는 것은 임시 저장본 하나뿐이고, 얻는 것은 열리는
 * 화면입니다.
 */
export function parseResumeDraft(raw: string | null): ResumeDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ResumeDraft>;
    if (!value || typeof value !== "object" || !value.contact) return null;
    const base = emptyResumeDraft();
    return {
      contact: { ...base.contact, ...value.contact },
      photo: { ...base.photo, ...(value.photo ?? {}) },
      educations: Array.isArray(value.educations) && value.educations.length ? value.educations : base.educations,
      careers: Array.isArray(value.careers) && value.careers.length ? value.careers : base.careers,
      certificates: Array.isArray(value.certificates) ? value.certificates : [],
      extras: Array.isArray(value.extras) ? value.extras : [],
      skills: typeof value.skills === "string" ? value.skills : "",
    };
  } catch {
    return null;
  }
}

/** 미리보기에서 빈 항목을 지웁니다 — 아무것도 안 적은 줄이 종이에 남으면 안 됩니다. */
export function hasContent(values: readonly string[]): boolean {
  return values.some((value) => value.trim().length > 0);
}

export function splitSkills(skills: string): string[] {
  return skills
    .split(/[,·\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * 이력서를 자소서 첨삭으로 넘기기 위한 글자로 만듭니다.
 *
 * 첨삭 엔진은 이력서를 **근거**로 씁니다 — 자소서에 적은 경력·자격이 이력서와
 * 맞는지 대조하고, 어긋나면 짚어 줍니다. 그래서 이 글에는 사람이 읽기 좋은
 * 꾸밈보다 **사실이 빠짐없이** 들어가는 편이 낫습니다.
 *
 * 사진과 주소는 넣지 않습니다. 대조에 쓸 수 없는 값이고, 굳이 모델에게 보낼
 * 이유도 없습니다.
 */
export function resumeDraftToText(draft: ResumeDraft): string {
  const lines: string[] = [];
  const { contact } = draft;

  lines.push(`이름: ${contact.name.trim() || "(미기재)"}`);
  if (contact.headline.trim()) lines.push(`한 줄 소개: ${contact.headline.trim()}`);
  if (contact.birth.trim()) lines.push(`생년월일: ${contact.birth.trim()}`);

  const careers = draft.careers.filter((item) => hasContent([item.company, item.role, item.period, item.duties]));
  if (careers.length) {
    lines.push("", "[경력]");
    for (const career of careers) {
      lines.push(`- ${[career.company.trim(), career.role.trim(), career.period.trim()].filter(Boolean).join(" · ")}`);
      for (const duty of career.duties.split("\n").map((value) => value.trim()).filter(Boolean)) lines.push(`  ${duty}`);
    }
  }

  const educations = draft.educations.filter((item) => hasContent([item.school, item.major, item.period, item.note]));
  if (educations.length) {
    lines.push("", "[학력]");
    for (const education of educations) {
      lines.push(`- ${[education.school.trim(), education.major.trim(), education.status.trim(), education.period.trim()].filter(Boolean).join(" · ")}`);
      if (education.note.trim()) lines.push(`  ${education.note.trim()}`);
    }
  }

  const certificates = draft.certificates.filter((item) => hasContent([item.name, item.issuer, item.date]));
  if (certificates.length) {
    lines.push("", "[자격 · 어학]");
    for (const certificate of certificates) {
      lines.push(`- ${[certificate.name.trim(), certificate.issuer.trim(), certificate.date.trim()].filter(Boolean).join(" · ")}`);
    }
  }

  const skills = splitSkills(draft.skills);
  if (skills.length) lines.push("", "[기술 · 역량]", skills.join(", "));

  const extras = draft.extras.filter((item) => hasContent([item.title, item.period, item.detail]));
  if (extras.length) {
    lines.push("", "[그 밖의 활동]");
    for (const extra of extras) {
      lines.push(`- ${[extra.title.trim(), extra.period.trim()].filter(Boolean).join(" · ")}`);
      if (extra.detail.trim()) lines.push(`  ${extra.detail.trim()}`);
    }
  }

  return lines.join("\n");
}

/** 이어가기 단추를 띄울지 정합니다 — 이름만 적힌 이력서를 넘겨도 대조할 것이 없습니다. */
export function isResumeWorthCarrying(draft: ResumeDraft): boolean {
  return draft.careers.some((item) => hasContent([item.company, item.duties]))
    || draft.educations.some((item) => hasContent([item.school]))
    || draft.certificates.some((item) => hasContent([item.name]))
    || draft.extras.some((item) => hasContent([item.title]))
    || splitSkills(draft.skills).length > 0;
}
