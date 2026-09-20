import { scoreCareerInterest, getInterestProfile, getRiasecCharacterProfile, type InterestAnswer } from "@/domain/career-interest";
import { scoreWorkStyle, type WorkStyleAnswer } from "@/domain/career-assessment";
import { classifyWorkStyleType, workStyleTypeCode, workStyleTypeImagePath } from "@/domain/work-style-type";
import { scoreWorkValues, getWorkValueProfile, getWorkValueCharacterProfile, type WorkValueAnswer } from "@/domain/career-work-values";

export const CAREER_AI_REPORT_STORAGE_PREFIX = "mooa.career-ai-report.v1:";

export type ReportHero = { code: string; title: string; descriptor: string; imagePath: string; badge: string };

/**
 * 결제 후 리포트 상단의 캐릭터 카드. 캐릭터 카드 체계가 있는 검사(직업흥미·직업가치·
 * 업무성향)만 만들고, 종합은 항상 null이다. 이 탭에 검사 응답이 없어도 null(카드만 생략).
 */
export function computeReportHero(scope: string, interestRaw: string | null, valuesRaw: string | null, workStyleRaw: string | null = null): ReportHero | null {
  try {
    if (scope === "interest" && interestRaw) {
      const profile = getInterestProfile(scoreCareerInterest(JSON.parse(interestRaw) as Record<string, InterestAnswer>));
      const character = getRiasecCharacterProfile(profile.code);
      return { code: character.code, title: character.cardTitle, descriptor: character.descriptor, imagePath: character.imagePath, badge: "RIASEC 캐릭터" };
    }
    if (scope === "work_values" && valuesRaw) {
      const profile = getWorkValueProfile(scoreWorkValues(JSON.parse(valuesRaw) as Record<string, WorkValueAnswer>));
      const character = getWorkValueCharacterProfile(profile.code);
      return { code: character.code, title: character.title, descriptor: character.descriptor, imagePath: character.imagePath, badge: "WORK VALUES 캐릭터" };
    }
    if (scope === "work_style" && workStyleRaw) {
      const { primary } = classifyWorkStyleType(scoreWorkStyle(JSON.parse(workStyleRaw) as Record<string, WorkStyleAnswer>));
      return { code: workStyleTypeCode(primary), title: primary.name, descriptor: primary.tagline, imagePath: workStyleTypeImagePath(primary), badge: "업무성향 유형" };
    }
  } catch {
    return null;
  }
  return null;
}
