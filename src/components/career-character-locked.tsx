import Link from "next/link";
import { ArrowRight, Info, LockKeyhole } from "lucide-react";
import styles from "./career-assessment-closed.module.css";

/**
 * 캐릭터 해설(유료)에 결제 없이 들어왔을 때의 화면.
 *
 * 이 해설은 유료로 열 상품인데 결제(Polar)가 아직 커리어 검사 쪽에 연결되지
 * 않았습니다. 그동안 주소만 알면 누구나 전문을 볼 수 있었기 때문에, 연동 전까지는
 * 잠급니다. 404 대신 상태를 말해 주는 이유는 `career-assessment-closed`와 같습니다.
 * 화면 뼈대와 스타일도 그 화면을 그대로 씁니다.
 */
export function CareerCharacterLocked() {
  return (
    <div className={styles.shell}>
      {/* 이 화면은 /career 레이아웃 안에 있어 상단 브랜드 바가 이미 있습니다. 헤더를 또 그리면 두 줄이 됩니다. */}
      <main className={styles.body}>
        <div className={styles.lock}><LockKeyhole /></div>
        <span className={styles.kicker}>COMING SOON</span>
        <h1>캐릭터 해설은<br />결제 준비 중입니다.</h1>
        <p>
          이 해설은 기본 결과와 달리 유료로 열 예정입니다. 아직 결제를 연결하지
          않아 잠시 닫아 두었습니다. 어떤 내용이 나오는지는 심층해설 예시에서
          미리 보실 수 있습니다.
        </p>

        <div className={styles.actions}>
          <Link href="/career/interest/result">기본 결과로 돌아가기 <ArrowRight /></Link>
          <Link href="/career/ai/sample?scope=interest">심층해설 예시 보기 <ArrowRight /></Link>
        </div>

        <div className={styles.note}>
          <Info />
          <p>
            이미 마친 검사 결과는 그대로 남아 있습니다. 결제를 열면 다시 풀지 않고
            바로 캐릭터 해설을 보실 수 있습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
