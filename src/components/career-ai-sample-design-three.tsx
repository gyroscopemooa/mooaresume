"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, BriefcaseBusiness, CheckCircle2, ClipboardList, Download, FlaskConical, Link2, LockKeyhole, Share2, Target, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { getCareerAiSample, type CareerAiSampleScope } from "@/domain/career-ai-sample";
import { getRiasecCharacterProfile } from "@/domain/career-interest";
import { getWorkValueCharacterProfile } from "@/domain/career-work-values";
import { WORK_STYLE_DIMENSION_LABELS } from "@/domain/career-assessment";
import { getWorkStyleTypeById, workStyleTypeCode, workStyleTypeImagePath } from "@/domain/work-style-type";
import { CareerAiCtaBar } from "./career-ai-cta-bar";
import styles from "./career-ai-sample-design-three.module.css";

type HeroCharacter = { code: string; topLabel: string; subHeading: string; descriptor: string; imagePath: string; badge: string; comboSummary: string; supportLine?: string; focusSummary: string; backHref: string; isSpecialTheme?: boolean };

/**
 * 2026-09-18: 이 히어로 카드는 원래 scope와 상관없이 항상 RIASEC(직업흥미)
 * 캐릭터 카드를 그렸다 — 직업가치·업무성향 예시에서도 흥미 이미지·"RIASEC"
 * 배지가 나오는 버그였다(민수오빠가 스샷으로 지적). scope별로 실제 캐릭터
 * 카드 체계가 있는 검사만 히어로 카드를 그리고, 캐릭터 체계가 없는 검사는
 * 카드 없이 문구만 보여준다.
 *
 * 뒤로가기(backHref)도 항상 "/career/ai?scope=interest"로 고정돼 있던 버그를
 * 함께 고쳤다. 캐릭터 카드가 있는 scope는 예시 캐릭터 페이지로, 없는 scope는
 * 심층해설 선택 화면으로 돌아간다(민수오빠 지시: "심층해설 선택이 아니라
 * 캐릭터 해설로 이동해야지").
 */
function getHeroCharacter(scope: CareerAiSampleScope, sampleCode: string): HeroCharacter | null {
  if (scope === "interest") {
    const profile = getRiasecCharacterProfile(sampleCode);
    return {
      code: profile.code, topLabel: profile.baseName, subHeading: `${profile.baseCode} · ${profile.cardTitle}`, descriptor: profile.descriptor, imagePath: profile.imagePath,
      badge: "RIASEC 3개 조합형", comboSummary: profile.rankings.map((axis) => `${axis.label}(${axis.code})`).join(" + "),
      supportLine: `${profile.rankings[2].code} 보조 성향 · ${profile.descriptor}`, focusSummary: profile.focusSummary,
      backHref: `/career/character?code=${profile.code}&example=1`, isSpecialTheme: profile.baseCode === "IS",
    };
  }
  if (scope === "work_values") {
    const profile = getWorkValueCharacterProfile(sampleCode);
    return {
      code: profile.code, topLabel: profile.title, subHeading: profile.descriptor, descriptor: profile.descriptor, imagePath: profile.imagePath,
      badge: "WORK VALUES 2개 조합형", comboSummary: (profile.rankings ?? []).map((axis) => `${axis.label}(${axis.code})`).join(" + "),
      focusSummary: profile.focusSummary ?? profile.descriptor,
      backHref: `/career/values/character?code=${profile.code}&example=1`,
    };
  }
  if (scope === "work_style") {
    const type = getWorkStyleTypeById(sampleCode);
    return {
      code: workStyleTypeCode(type), topLabel: type.name, subHeading: `TYPE ${workStyleTypeCode(type)}`, descriptor: type.tagline, imagePath: workStyleTypeImagePath(type),
      badge: "업무성향 30개 유형", comboSummary: type.core.length ? type.core.map((dimension) => WORK_STYLE_DIMENSION_LABELS[dimension]).join(" + ") : "다섯 성향의 균형",
      focusSummary: type.tagline, backHref: `/career/work-style/character?type=${type.id}&example=1`,
    };
  }
  return null;
}

const SAMPLE_COPY: Record<CareerAiSampleScope, { personalityKeywords: string[]; workStrengths: string[]; growth: string[]; environments: string[]; coreValue: string; decisionStyle: string; communication: string; teamSynergy: string; coaching: { title: string; text: string }[]; coachingDetail: { title: string; cards: string[]; texts: string[] }[] }> = {
  interest: {
    personalityKeywords: ["문제의 본질과 원인을 파고들기", "복잡한 내용을 이해하기 쉽게 정리하기", "새로운 관점으로 개선안을 설계하기", "근거를 바탕으로 협업 방향 제안하기", "배운 내용을 다음 실행으로 연결하기"],
    workStrengths: ["자료와 정보를 구조화해 핵심을 찾기", "사용자·동료의 질문을 이해하기 쉽게 풀기", "서로 다른 관점을 하나의 실행안으로 묶기", "기존 방식의 불편을 찾아 개선안 만들기", "조사 결과를 다음 의사결정으로 연결하기"],
    growth: ["분석을 끝내는 기준과 실행 속도 균형 잡기", "완성 전에도 피드백을 받아 관점 넓히기", "설명할 때 결론과 근거의 순서를 더 선명하게 하기", "관심 분야의 실제 산업·고객 맥락 쌓기", "혼자 깊이 파는 시간과 협업 시간을 구분하기"],
    environments: ["문제를 깊게 이해할 시간이 있는 환경", "의견과 근거가 의사결정에 반영되는 팀", "새로운 방식을 시험하고 개선할 여지가 있는 일", "전문성을 공유하고 함께 배우는 조직", "업무의 의미와 기대 결과가 명확한 환경"],
    coreValue: "문제의 원인을 이해하고, 사람에게 도움이 되는 방향으로 더 나은 방식을 만드는 데 의미를 둡니다.",
    decisionStyle: "충분한 근거를 살핀 뒤, 관계자에게 설명 가능한 선택인지 함께 확인하는 편입니다.",
    communication: "복잡한 내용을 핵심부터 정리하고, 상대의 질문과 피드백을 반영해 전달 방식을 다듬습니다.",
    teamSynergy: "조사·분석과 설명·조율 사이를 연결해 팀이 다음 행동을 정하도록 돕는 역할에서 강점이 드러납니다.",
    coaching: [
      { title: "취업 코칭", text: "공고의 실제 문제와 필요한 협업 방식을 먼저 읽고, 그에 맞는 경험을 자소서·면접 답변으로 연결합니다." },
      { title: "진로 코칭", text: "흥미가 높은 활동을 기준으로 직무 후보를 넓힌 뒤, 업무 내용과 성장 경로를 비교하는 질문을 만듭니다." },
      { title: "커리어 코칭", text: "분석·설명·개선 경험을 성과로 증명할 수 있도록 포트폴리오와 업무 기록의 구조를 정리합니다." },
    ],
    coachingDetail: [
      { title: "취업 코칭", cards: ["포트폴리오 전략", "면접 전술", "강점 어필"], texts: ["문제를 어떻게 파고들고 정리했는지 과정과 결과를 함께 보여주세요.", "근거를 찾아 선택했고, 사람과 어떻게 조율했는지 한 장면으로 설명해 보세요.", "분석력이라는 단어 대신 실제 개선·설명·협업 행동으로 강점을 증명하세요."] },
      { title: "진로 코칭", cards: ["장기 성장 로드맵", "전문화 방향", "비전 정렬"], texts: ["관심 분야에서 조사·기획·실행 중 어떤 역할을 더 깊게 맡고 싶은지 확인합니다.", "도메인 지식과 분석·커뮤니케이션 경험을 함께 쌓을 수 있는 산업을 살펴봅니다.", "일의 의미·성장·협업 기준이 실제 조직 문화와 맞는지 면접 질문으로 확인합니다."] },
      { title: "커리어 코칭", cards: ["네트워킹 전략", "성과 관리", "업무 균형"], texts: ["배운 내용을 공유하고 질문을 주고받는 실무 커뮤니티에서 전문성을 넓혀 보세요.", "분석 결과가 다음 행동이나 개선으로 이어진 사례를 기록해 성과 근거를 만듭니다.", "깊이 파는 시간과 협업·실행 시간을 나누어 과도한 완벽주의를 조절합니다."] },
    ],
  },
  work_style: {
    personalityKeywords: ["낯선 문제도 일단 정리하고 시작하기", "기준과 순서를 세워 흐트러진 일을 잡기", "협업 중 조율과 배려를 먼저 챙기기", "완료 기준을 명확히 하고 끝까지 다듬기", "새로운 방법을 시도해보되 검증하고 채택하기"],
    workStrengths: ["여러 일정과 이해관계자를 기준에 맞춰 정리하기", "반복되는 업무에서 안정적인 절차 만들기", "피드백을 모아 다음 행동으로 바꾸기", "일의 우선순위를 상황에 맞게 재배열하기", "협업 중 생기는 이견을 기준으로 조율하기"],
    growth: ["완벽하게 마무리하려는 기준과 속도 사이 균형 잡기", "변화가 클 때도 유연하게 대응하는 연습", "의사결정 전 확인 절차를 상황에 맞게 줄이기", "새로운 방식을 더 빠르게 시도해보는 연습", "협업 초반 기준을 먼저 맞추는 습관 들이기"],
    environments: ["업무 우선순위와 완료 기준이 명확한 조직", "개선 제안을 실제로 실행할 수 있는 통로가 있는 곳", "협업과 피드백 주기가 예측 가능한 팀", "변화가 있어도 이유와 맥락을 설명해주는 환경", "혼자 정리할 시간과 협업 시간이 구분된 업무"],
    coreValue: "정해진 기준과 절차 안에서 흐트러진 일을 정리하고, 예측 가능하게 완성도를 높이는 데 의미를 둡니다.",
    decisionStyle: "필요한 정보를 확인한 뒤, 기준과 절차에 맞춰 순서대로 결정하는 편입니다.",
    communication: "협업 초반에 기준과 역할을 먼저 맞추고, 진행 중에는 조율과 배려를 우선하는 편입니다.",
    teamSynergy: "흐트러진 일을 기준으로 정리하는 역할과, 새로운 시도를 하는 역할이 만나면 속도와 완성도를 함께 챙길 수 있습니다.",
    coaching: [
      { title: "취업 코칭", text: "공고의 업무 우선순위·협업 방식을 먼저 확인하고, 기준을 세워 일을 정리한 경험을 자소서·면접에 연결합니다." },
      { title: "진로 코칭", text: "안정적인 운영이 필요한 조직인지, 빠른 변화가 잦은 조직인지 먼저 비교한 뒤 후보를 좁힙니다." },
      { title: "커리어 코칭", text: "반복 업무를 개선한 경험을 수치와 함께 기록해, 포트폴리오와 성과 근거로 정리합니다." },
    ],
    coachingDetail: [
      { title: "취업 코칭", cards: ["업무 프로세스 정리", "면접 질문 대비", "강점 어필"], texts: ["기준 없던 업무를 어떻게 정리했는지 전후 과정을 구체적으로 준비해 보세요.", "의사결정 방식·피드백 주기를 확인할 질문을 미리 만들어 보세요.", "‘꼼꼼합니다’ 대신 실제로 무엇을 정리하고 개선했는지 사례로 보여주세요."] },
      { title: "진로 코칭", cards: ["조직 문화 비교", "역할 범위 확인", "성장 속도 점검"], texts: ["조직마다 기준·절차가 얼마나 명확한지 채용 공고와 면접에서 비교해 보세요.", "내가 개선을 제안할 수 있는 권한이 있는 역할인지 확인해 보세요.", "너무 안정적이거나 너무 급격한 변화가 나에게 맞는지 점검해 보세요."] },
      { title: "커리어 코칭", cards: ["성과 기록", "프로세스 개선 사례", "업무 균형"], texts: ["개선한 절차나 기준을 만들 때마다 전후 비교를 기록해 두세요.", "반복 업무를 자동화하거나 줄인 사례를 구체적인 수치로 남기세요.", "완벽하게 다듬는 시간과 다음 일로 넘어가는 시간을 미리 정해 두세요."] },
    ],
  },
  work_values: {
    personalityKeywords: ["중요한 조건을 먼저 확인하고 시작하기", "스스로 우선순위를 정리해 결정하기", "배움과 안정 사이에서 균형을 찾기", "의미 있는 일에 자연히 몰입하기", "성과와 보상 기준을 분명히 확인하기"],
    workStrengths: ["일을 시작하기 전 조건과 기준을 먼저 확인하는 편", "우선순위가 흔들릴 때도 원칙을 지키는 편", "배울 점이 있는 환경인지 빠르게 판단하는 편", "성과와 보상의 연결고리를 스스로 점검하는 편", "의미 없는 반복 업무에서도 개선점을 찾아내는 편"],
    growth: ["중요한 조건을 미리 말하되 유연하게 조율하는 연습", "작은 불확실성도 성장 기회로 받아들이는 연습", "성과를 수치·기록으로 남겨 보상 근거를 만들기", "의미를 찾기 어려운 업무에서도 배울 점 찾기", "단기 조건과 장기 성장 사이 균형 잡기"],
    environments: ["중요하게 보는 조건을 솔직하게 말할 수 있는 조직", "성과와 보상의 기준이 투명한 팀", "배움과 안정이 함께 보장되는 환경", "일의 의미를 구성원과 자주 확인하는 문화", "무리한 초과 근무를 요구하지 않는 근무 방식"],
    coreValue: "일에서 무엇을 포기하기 어려운지 먼저 확인하고, 그 조건이 채워지는 환경에서 오래 몰입하는 데 의미를 둡니다.",
    decisionStyle: "중요한 조건 몇 가지를 기준으로 먼저 거른 뒤, 남은 선택지를 비교해 결정하는 편입니다.",
    communication: "필요한 조건과 기준을 먼저 분명히 말하고, 그 위에서 협의와 조율을 이어가는 편입니다.",
    teamSynergy: "각자 중요하게 보는 조건을 먼저 확인하면, 역할 배분과 협업 방식을 더 오래 지속 가능하게 맞출 수 있습니다.",
    coaching: [
      { title: "취업 코칭", text: "공고에 나온 근무 조건·보상 체계를 먼저 확인하고, 내가 중요하게 보는 기준과 맞는지 비교해 지원 우선순위를 정합니다." },
      { title: "진로 코칭", text: "중요하게 보는 조건을 기준으로 후보 직무를 좁힌 뒤, 실제 업무 내용과 성장 경로를 비교하는 질문을 만듭니다." },
      { title: "커리어 코칭", text: "조건이 채워지지 않는 환경에서도 배울 점을 기록해, 다음 이직·이동에서 협상할 근거로 남깁니다." },
    ],
    coachingDetail: [
      { title: "취업 코칭", cards: ["채용공고 조건 대조", "면접 질문 준비", "우선순위 어필"], texts: ["공고의 근무 형태·보상·성장 지원 항목을 내 우선순위와 하나씩 비교해 보세요.", "면접에서 조직 문화와 의사결정 방식을 확인할 질문을 미리 준비해 보세요.", "모든 조건을 다 말하기보다 가장 중요한 1~2가지를 명확히 전달하세요."] },
      { title: "진로 코칭", cards: ["장기 조건 로드맵", "산업별 비교", "타협 가능 범위"], texts: ["5년 뒤에도 지키고 싶은 조건과, 지금은 타협 가능한 조건을 나눠 정리해 보세요.", "같은 직무라도 산업·조직 규모에 따라 조건 충족도가 다른지 비교해 보세요.", "모든 조건을 동시에 만족하는 곳은 드뭅니다. 우선순위 순서를 미리 정해 두세요."] },
      { title: "커리어 코칭", cards: ["성과 기록", "조건 재협상", "번아웃 예방"], texts: ["보상·인정과 관련된 성과는 그때그때 기록해 다음 협상의 근거로 남기세요.", "입사 후에도 조건이 바뀌면 근거를 갖고 다시 이야기할 수 있습니다.", "여유·의미처럼 눈에 안 보이는 조건이 흔들리면 번아웃 신호일 수 있습니다."] },
    ],
  },
  combined: {
    personalityKeywords: ["관심 있는 문제를 충분히 파고들기", "일의 기준과 전달 방식을 다듬기", "배움과 판단 여지를 함께 찾기", "세 결과가 겹치는 지점을 확인하기", "충돌하는 조건은 실제 경험으로 검증하기"],
    workStrengths: ["문제의 맥락을 이해한 뒤 실행 기준으로 바꾸기", "서로 다른 결과 신호를 하나의 방향으로 정리하기", "협업 중 기준과 조건을 함께 확인하기", "장점뿐 아니라 충돌 지점도 먼저 짚기", "세 검사 결과를 지원서 사례 선택에 활용하기"],
    growth: ["세 결과가 같은 방향일 때도 실제 경험으로 재확인하기", "충돌하는 결과는 우선순위를 정해 조율하기", "관심·성향·조건을 한 문장으로 정리해보는 연습", "지원할 공고마다 세 기준을 다시 대조해보기", "결과를 참고자료로만 쓰고 과신하지 않기"],
    environments: ["문제 정의부터 실행까지 관여할 수 있는 환경", "의견과 조사 결과가 의사결정에 반영되는 팀", "성장 경로와 협업 기준이 함께 명확한 조직", "중요하게 보는 조건을 솔직히 말할 수 있는 문화", "업무 방식과 성향이 자주 부딪히지 않는 팀 구조"],
    coreValue: "세 검사 결과가 겹치는 지점을 찾아, 실제 경험으로 확인 가능한 강점과 조건으로 좁히는 데 의미를 둡니다.",
    decisionStyle: "세 결과를 나란히 놓고, 겹치는 신호와 충돌하는 신호를 구분한 뒤 결정하는 편입니다.",
    communication: "결과를 그대로 전달하기보다, 겹치는 지점과 확인이 필요한 지점을 나눠 설명하는 편입니다.",
    teamSynergy: "관심·업무 방식·중요 조건이 서로 다른 사람과 만나면, 겹치지 않는 부분에서 역할을 나눌 단서를 얻습니다.",
    coaching: [
      { title: "취업 코칭", text: "세 결과가 겹치는 지점을 공고의 실제 업무·조건과 비교해, 자소서·면접에 쓸 사례를 고릅니다." },
      { title: "진로 코칭", text: "흥미·업무 방식·중요 조건이 함께 맞는 직무 후보를 좁힌 뒤, 충돌하는 지점을 질문으로 확인합니다." },
      { title: "커리어 코칭", text: "세 결과 중 무엇이 흔들렸을 때 만족도가 가장 크게 떨어지는지 기록해, 다음 선택의 기준으로 삼습니다." },
    ],
    coachingDetail: [
      { title: "취업 코칭", cards: ["결과 겹침 확인", "충돌 지점 질문", "사례 선택"], texts: ["세 결과 중 두 개 이상이 같은 방향을 가리키는 지점을 먼저 찾아보세요.", "결과끼리 충돌하는 지점은 실제 경험으로 어느 쪽이 맞는지 확인해 보세요.", "지원서에는 세 결과가 함께 뒷받침하는 경험 한두 개를 골라 쓰세요."] },
      { title: "진로 코칭", cards: ["직무 후보 좁히기", "산업 비교", "충돌 조율"], texts: ["관심·업무 방식·조건이 모두 맞는 직무를 먼저 후보로 넓혀 보세요.", "같은 직무도 산업에 따라 충돌 지점이 달라지는지 비교해 보세요.", "완벽히 일치하지 않아도, 가장 중요한 결과 하나를 기준으로 우선순위를 정하세요."] },
      { title: "커리어 코칭", cards: ["선택 기준 기록", "재점검 주기", "장기 방향"], texts: ["중요한 선택을 할 때 세 결과 중 무엇을 우선했는지 기록해 두세요.", "1~2년마다 세 검사를 다시 해 보며 우선순위가 바뀌었는지 확인하세요.", "세 결과의 교집합이 곧 직업은 아니지만, 방향을 좁히는 단서로 계속 참고하세요."] },
    ],
  },
};

/** 로컬 개발 서버(next dev)에서만 결제 전 흐림을 풀어 전체 예시를 검토할 수 있게 한다. 프로덕션 빌드에서는 항상 false. */
const unlockedForLocalDev = process.env.NODE_ENV === "development";

export function CareerAiSampleDesignThree({ scope }: { scope: CareerAiSampleScope }) {
  const router = useRouter();
  const sample = getCareerAiSample(scope);
  const hero = getHeroCharacter(scope, sample.code);
  const copy = SAMPLE_COPY[scope];
  const [copied, setCopied] = useState(false);
  const copyResultLink = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { window.prompt("이 링크를 복사해 주세요.", window.location.href); }
  };
  const shareResult = async () => {
    if (!hero) { await copyResultLink(); return; }
    const shareData = { title: `${hero.code} · ${hero.topLabel}`, text: sample.headline, url: window.location.href };
    try {
      const response = await fetch(hero.imagePath);
      const blob = await response.blob();
      // 카드가 WebP로 바뀌었습니다. 이름만 .png로 붙여 보내면 받는 쪽이 열지
      // 못하는 파일이 되므로 확장자와 타입을 실제 파일에 맞춥니다.
      const cardFile = new File([blob], `${hero.code}-career-card.webp`, { type: blob.type || "image/webp" });
      if (navigator.canShare?.({ files: [cardFile] })) {
        await navigator.share({ ...shareData, files: [cardFile] });
        return;
      }
    } catch {
      // File sharing is optional. Browsers without it fall back to link sharing.
    }
    if (navigator.share) { await navigator.share(shareData); return; }
    await copyResultLink();
  };
  // 진짜 브라우저 "뒤로가기"입니다. 캐릭터 해설에서 여기로 왔으면 캐릭터
  // 해설로, 기본 결과의 "심층해설 예시" 링크로 왔으면 그쪽으로 돌아갑니다.
  // 예전엔 항상 정해진 페이지로 보내서(예: 항상 캐릭터 해설), 거기서 다시
  // 이 페이지로 돌아오는 화면들끼리 핑퐁이 생겼습니다(민수오빠 지적).
  const fallbackBackHref = hero?.backHref ?? `/career/ai?scope=${scope}`;
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) { router.back(); return; }
    router.push(fallbackBackHref);
  };

  return <main className={`${styles.page} ${hero?.isSpecialTheme ? styles.isTheme : ""}`}>
    <header className={styles.topbar}><button type="button" className={styles.backButton} onClick={goBack}><ArrowLeft />뒤로가기</button><h1>Career Insight</h1><button type="button" onClick={() => void shareResult()} aria-label="결과 공유"><Share2 /></button></header>
    {(scope === "interest" || scope === "work_values" || scope === "work_style") && <CareerAiCtaBar scope={scope} top={75} />}
    <main className={styles.container}>
      <section className={styles.heroCard}>
        <div className={styles.heroCopy}>
          {hero ? <>
            <span className={styles.badge}>{hero.badge}</span>
            <div><p className={styles.code}>{hero.code}<span>· {hero.topLabel}</span></p><h2>{hero.subHeading}</h2>{hero.supportLine && <strong>{hero.supportLine}</strong>}<p className={styles.axisSummary}>{hero.comboSummary} 조합</p><p className={styles.intro}>{sample.intro}</p></div>
          </> : <>
            <span className={styles.badge}>{sample.badge}</span>
            <div><p className={styles.code}>{sample.code}</p><h2>{sample.typeName}</h2><strong>{sample.headline}</strong><p className={styles.intro}>{sample.intro}</p></div>
          </>}
          <div className={styles.quickFacts}>
            <div><i><Target /></i><span><small>핵심 강점</small><b>{sample.strengths}</b></span></div>
            <div><i><FlaskConical /></i><span><small>살펴볼 분야</small><b>{sample.roles.join(" / ")}</b></span></div>
            <div><i><BriefcaseBusiness /></i><span><small>직무 예시</small><b>{sample.roleDetails.map((role) => role.title).join(" / ")}</b></span></div>
          </div>
        </div>
        {hero && <div className={styles.visualColumn}><div className={styles.visual}><Image src={hero.imagePath} alt={`${hero.code} · ${hero.topLabel} 캐릭터 카드`} fill sizes="(max-width: 760px) 100vw, 560px" quality={100} unoptimized /></div><button type="button" className={styles.download} onClick={() => void shareResult()}><Share2 />카드 이미지 저장 및 공유</button></div>}
      </section>

      <section className={styles.insightGrid}>
        <InsightCard icon={<Brain />} tone="primary" title="성격 키워드" items={copy.personalityKeywords} />
        <InsightCard icon={<BriefcaseBusiness />} tone="secondary" title="일할 때 강점" items={copy.workStrengths} />
        <InsightCard icon={<TrendingUp />} tone="tertiary" title="성장 방향" items={copy.growth} />
      </section>

      {/* 여기부터 결제 영역입니다. 예시 화면이라 전문을 다 보여주면 실제 해설을 살 이유가 없어져
          흐림 처리로 앞부분만 남깁니다. 흐림은 화면 효과라 개발자도구로 벗길 수 있습니다.
          실제 사용자 해설을 붙일 때는 결제 전에는 서버가 본문을 아예 내려보내지 않아야 합니다. */}
      <div className={styles.lockedZone}>
      <div className={unlockedForLocalDev ? undefined : styles.lockedContent} aria-hidden={unlockedForLocalDev ? undefined : "true"}>
      <section className={styles.deepCard}>
        <div className={styles.sectionHeading}><Brain /><h2>AI 심층 해설</h2></div>
        <div className={styles.deepCopy}><h3>{hero?.code ?? sample.code} · {hero?.topLabel ?? sample.typeName}의 해석</h3><p>{hero?.focusSummary ?? sample.headline} {sample.strengthGuide} 이 결과는 특정 직업을 확정하는 답이 아니라, 내가 해 본 경험과 지원할 환경을 더 정확하게 비교하기 위한 단서입니다.</p></div>
        <div className={styles.deepGrid}>
          <InfoBlock tone="primary" title="핵심 가치" text={copy.coreValue} />
          <InfoBlock tone="secondary" title="의사결정 스타일" text={copy.decisionStyle} />
          <InfoBlock tone="tertiary" title="커뮤니케이션 패턴" text={copy.communication} />
          <InfoBlock tone="primary" title="팀 시너지" text={copy.teamSynergy} />
        </div>
      </section>

      <section className={styles.coaching}><h2>맞춤형 커리어 코칭</h2><div className={styles.coachingGrid}>
        {copy.coaching.map((card, index) => <CoachingCard key={card.title} icon={index === 0 ? <BriefcaseBusiness /> : index === 1 ? <Target /> : <TrendingUp />} tone={index === 0 ? "primary" : index === 1 ? "secondary" : "tertiary"} title={card.title} text={card.text} />)}
      </div></section>

      <section className={styles.coachingDetail}>
        {copy.coachingDetail.map((section, index) => <CoachingDetail key={section.title} tone={index === 0 ? "primary" : index === 1 ? "secondary" : "tertiary"} title={section.title} cards={section.cards} texts={section.texts} />)}
      </section>

      <section className={styles.environment}><h2>나에게 맞는 업무 환경</h2><div>{copy.environments.map((environment, index) => <article key={environment}><i>{index === 0 ? <ClipboardList /> : index === 1 ? <Users /> : index === 2 ? <FlaskConical /> : index === 3 ? <Users /> : <TrendingUp />}</i><p>{environment}</p></article>)}</div></section>
      </div>
      {!unlockedForLocalDev && <div className={styles.lockedOverlay}>
        <div className={styles.lockedCard}>
          <i><LockKeyhole /></i>
          <b>여기부터는 결제 후에 열립니다.</b>
          <p>지금 보시는 건 예시 화면입니다. 실제 심층해설은 내 검사 결과와 내가 올린 자소서·공고를 함께 읽고 씁니다.</p>
          <span>결제 준비 중</span>
        </div>
      </div>}
      </div>

      {hero && <section className={styles.shareCard}><h2>나의 진로 캐릭터를 공유해 보세요.</h2><p>지원되는 기기에서는 카드 이미지 파일을 바로 공유하고, 그 외에는 결과 링크를 공유합니다.</p><div><a href={hero.imagePath} download={`${hero.code}-career-card.webp`}><Download />카드 이미지 저장</a><button type="button" onClick={() => void shareResult()}><Share2 />카드 이미지 공유</button><button type="button" onClick={() => void copyResultLink()}><Link2 />{copied ? "링크 복사됨" : "링크 복사"}</button></div></section>}
      <p className={styles.disclaimer}>이 결과는 자기이해와 커리어 탐색을 위한 자료입니다. 직업 적합성, 채용 결과, 합격 가능성을 판단하거나 보장하지 않습니다.</p>
    </main>
  </main>;
}

function InsightCard({ icon, tone, title, items }: { icon: React.ReactNode; tone: "primary" | "secondary" | "tertiary"; title: string; items: string[] }) {
  return <article className={`${styles.insightCard} ${styles[tone]}`}><div className={styles.sectionHeading}>{icon}<h2>{title}</h2></div><ul>{items.map((item) => <li key={item}><CheckCircle2 />{item}</li>)}</ul></article>;
}
function InfoBlock({ tone, title, text }: { tone: "primary" | "secondary" | "tertiary"; title: string; text: string }) { return <article className={`${styles.infoBlock} ${styles[tone]}`}><h3>{title}</h3><p>{text}</p></article>; }
function CoachingCard({ icon, tone, title, text }: { icon: React.ReactNode; tone: "primary" | "secondary" | "tertiary"; title: string; text: string }) { return <article className={`${styles.coachingCard} ${styles[tone]}`}><div>{icon}<h3>{title}</h3></div><p>{text}</p></article>; }
function CoachingDetail({ tone, title, cards, texts }: { tone: "primary" | "secondary" | "tertiary"; title: string; cards: string[]; texts: string[] }) { return <article className={`${styles.coachingSection} ${styles[tone]}`}><h2>{title}</h2><div>{cards.map((card, index) => <section key={card}><h3>{card}</h3><p>{texts[index]}</p></section>)}</div></article>; }
