import Link from "next/link";
import { getPackSample } from "@/fixtures/interview-pack-samples";
import { SAMPLE_EXPECTATIONS } from "@/fixtures/interview-pack-expectations";
import { isAdmin } from "@/server/admin/admin-session";
import styles from "../../final-test.module.css";
import { SampleView } from "./sample-view";

export const dynamic = "force-dynamic";

/**
 * "화면만 보기": 고정 가상 자료와 미리 써 둔 응답으로 실제 면접 준비팩 화면을 점검한다.
 * 결제·AI·외부 유료 API 를 부르는 코드가 이 경로에는 없다(브라우저 안의 메모리에서만 돈다).
 */
export default async function SamplePreviewPage({ params }: { params: Promise<{ sampleId: string }> }) {
  if (!(await isAdmin())) return null;
  const { sampleId } = await params;
  const sample = getPackSample(sampleId);
  if (!sample) return <p className={styles.lead}>샘플을 찾을 수 없습니다.</p>;
  const expectation = SAMPLE_EXPECTATIONS[sample.id];

  return <div className={styles.stack}>
    <div className={styles.crumbs}><Link href="/meensoo/final-test">← FINAL 테스트</Link> / 화면만 보기 / {sample.title}</div>
    <div className={styles.banner} role="note">
      <b>{expectation.title} — 눈으로 확인할 것</b>
      <ul>{expectation.watch.map((line) => <li key={line}>{line}</li>)}</ul>
      이 확인 목록은 관리자 화면에만 있고, 자료나 AI 요청에는 들어가지 않습니다.
    </div>
    <div className={styles.sheet}><SampleView sampleId={sample.id} /></div>
  </div>;
}
