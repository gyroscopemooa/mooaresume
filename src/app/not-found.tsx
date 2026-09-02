import type { Metadata } from "next";
import Link from "next/link";
import styles from "./not-found.module.css";

/**
 * 없는 경로.
 *
 * 이게 없으면 Next.js 기본 404가 뜹니다 — 흰 화면에 작은 글자 몇 줄뿐이라
 * 사이트가 아니라 서버가 고장 난 것처럼 보입니다. 링크 하나(오탈자, 지운
 * 페이지 북마크, 잘못 복사된 주소)로 여기 온 사람에게 "이 사이트는 정상"
 * 이라는 것과 "어디로 가면 되는지"를 같이 말해 줍니다.
 */
export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.mark}>M</div>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>주소가 바뀌었거나 삭제된 페이지입니다.</p>
      <Link href="/">무아레쥬메 홈으로</Link>
    </main>
  );
}
