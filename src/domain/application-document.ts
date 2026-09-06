/**
 * 이 사이트에서 다루는 서류 목록.
 *
 * 지금까지 다룬 것은 자기소개서 하나였습니다. 이름이 MOOA Resume인데 이력서를
 * 못 만든다는 것이 이 목록을 만든 이유입니다.
 *
 * 법률 서면·논문도 여기 둡니다. 한때는 손님이 다르니 별도 브랜드로 빼자고
 * 적었지만, 도메인을 하나 더 감당할 여력이 없다면 그것은 선택지가 아닙니다.
 * 대신 **묶음을 나눕니다** — 입사지원 서류와 그 밖의 서류를 목록에서부터 갈라
 * 두면, 자소서를 보러 온 사람이 준비서면 사이에서 길을 잃지 않습니다.
 */
export type ApplicationDocumentStatus = "available" | "coming-soon";

/** 목록에서 갈라 놓는 묶음. 한 화면에 있어도 서로 다른 일로 보여야 합니다. */
export type ApplicationDocumentGroup = "application" | "other";

export const APPLICATION_DOCUMENT_GROUP_LABEL: Record<ApplicationDocumentGroup, string> = {
  application: "입사지원 서류",
  other: "그 밖의 서류",
};

export type ApplicationDocument = {
  id: string;
  /** 드로어 목록에 보이는 이름. 검색해서 오는 말과 같아야 합니다. */
  label: string;
  /** 한 줄 설명. 무엇을 하는 물건인지 고르기 전에 알 수 있어야 합니다. */
  summary: string;
  /** 목록에서 오른쪽에 붙는 짧은 꼬리표. 무료인지 준비 중인지. */
  badge: string;
  status: ApplicationDocumentStatus;
  group: ApplicationDocumentGroup;
  /** 준비 중이면 없습니다 — 눌리지 않는 항목에는 주소를 두지 않습니다. */
  href?: string;
};

export const applicationDocuments: readonly ApplicationDocument[] = [
  {
    id: "resume",
    label: "이력서",
    summary: "경력·학력·자격을 칸에 채우면 제출용 한 장으로 정리됩니다.",
    badge: "무료",
    status: "available",
    group: "application",
    href: "/resume",
  },
  {
    id: "cover-letter",
    label: "자기소개서",
    summary: "공고와 지원자료를 함께 읽고 문항별로 첨삭합니다.",
    badge: "이용 중",
    status: "available",
    group: "application",
    href: "/analyze",
  },
  {
    id: "career-description",
    label: "경력기술서",
    summary: "이력서·자소서·자격증을 올리면 회사별 경력으로 정리합니다.",
    badge: "유료",
    status: "available",
    group: "application",
    href: "/career-description",
  },
  {
    id: "portfolio-note",
    label: "포트폴리오 설명글",
    summary: "프로젝트를 적으면 문제·실행·성과 설명과 목차를 만듭니다.",
    badge: "유료",
    status: "available",
    group: "application",
    href: "/portfolio",
  },
  {
    id: "study-plan",
    label: "학업·연구계획서",
    summary: "대학원 진학용 계획서의 연구 질문과 실현 가능성을 봅니다.",
    badge: "준비 중",
    status: "coming-soon",
    group: "application",
  },
  {
    // 법률은 문서 하나가 아니라 사건 하나로 들어갑니다. 목록에 여덟 줄을
    // 늘어놓으면 지금 자기에게 필요한 것이 무엇인지 고를 수 없습니다 —
    // 내용증명을 쓰러 온 사람도, 소장을 받은 사람도 같은 문으로 들어가
    // 안에서 고르게 합니다.
    id: "legal-case",
    label: "법률 서면 (내 사건)",
    summary: "쟁점 정리부터 내용증명·소장·답변서·준비서면·항소이유서까지.",
    badge: "유료",
    status: "available",
    group: "other",
    href: "/legal",
  },
  {
    id: "academic",
    label: "논문 · 연구 글",
    summary: "논지의 흐름과 문단 구조, 읽히는 문장을 봅니다.",
    badge: "준비 중",
    status: "coming-soon",
    group: "other",
  },
];
