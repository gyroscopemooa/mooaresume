import Link from "next/link";
import { ArrowLeft, ArrowRight, Info, LockKeyhole } from "lucide-react";
import { CAREER_ASSESSMENT_LABEL, type CareerAssessmentKey } from "@/domain/career-assessment-openness";
import styles from "./career-assessment-closed.module.css";

/**
 * 아직 열지 않은 검사에 들어왔을 때의 화면.
 *
 * 404로 돌려보내지 않는 이유: 이 주소는 검색과 예전 링크에 이미 남아 있고,
 * 없는 페이지라고 하면 검사가 사라진 줄 압니다. 지금 상태를 말해 주고 지금
 * 할 수 있는 검사로 안내하는 편이 정확합니다.
 */
export function CareerAssessmentClosed({ assessment }: { assessment: CareerAssessmentKey }) {
  const label = CAREER_ASSESSMENT_LABEL[assessment];
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span>M</span><b>MOOA</b> Resume</Link>
        <Link href="/career" className={styles.back}><ArrowLeft />커리어 홈</Link>
      </header>

      <main className={styles.body}>
        <div className={styles.lock}><LockKeyhole /></div>
        <span className={styles.kicker}>COMING SOON</span>
        <h1>{label}은<br />아직 준비 중입니다.</h1>
        <p>
          문항은 완성했지만 결과지와 해설을 다듬고 있습니다. 설명 없는 점수만
          보여드리면 오히려 잘못 읽히기 쉬워서, 해설이 끝난 뒤에 함께 엽니다.
        </p>

        <div className={styles.actions}>
          <Link href="/career/interest">지금 할 수 있는 직업흥미 탐색 <ArrowRight /></Link>
          <Link href="/career/assessments">전체 검사 목록 보기 <ArrowRight /></Link>
        </div>

        <div className={styles.note}>
          <Info />
          <p>
            이미 이 검사를 끝내 두셨다면 응답은 브라우저에 그대로 남아 있습니다.
            공개하면 다시 풀지 않고 결과부터 보실 수 있습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
