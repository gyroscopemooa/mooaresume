import Link from "next/link";
import { z } from "zod";
import { isAdmin } from "@/server/admin/admin-session";
import styles from "../../final-test.module.css";
import { PackView } from "./pack-view";

export const dynamic = "force-dynamic";

/**
 * 테스트 팩 하나를 실제 면접 준비팩 화면으로 연다(실제 AI). 화면과 API 는 같은 코드·같은 권한 검사를 쓴다 —
 * 이 팩에 대한 모든 요청은 서버가 관리자 쿠키·로그인 세션·승인된 테스트 계정·팩 소유권을 다시 확인한다.
 */
export default async function TestPackPage({ params }: { params: Promise<{ packId: string }> }) {
  if (!(await isAdmin())) return null;
  const { packId } = await params;
  if (!z.string().uuid().safeParse(packId).success) return <p className={styles.lead}>팩을 찾을 수 없습니다.</p>;

  return <div className={styles.stack}>
    <div className={styles.crumbs}><Link href="/meensoo/final-test">← FINAL 테스트</Link> / 테스트 팩</div>
    <div className={styles.sheet}><PackView packId={packId} /></div>
  </div>;
}
