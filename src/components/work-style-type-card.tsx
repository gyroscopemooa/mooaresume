import Image from "next/image";
import type { WorkStyleScore } from "@/domain/career-assessment";
import { classifyWorkStyleType, workStyleTypeImagePath } from "@/domain/work-style-type";
import styles from "./work-style-type-card.module.css";

/** 5개 성향 점수에서 정해진 대표 업무성향 카드. 점수 영역과 별개로 아래에 추가된다. */
export function WorkStyleTypeCard({ scores }: { scores: WorkStyleScore[] }) {
  const { primary, nearType } = classifyWorkStyleType(scores);
  return <section className={styles.typeSection} aria-labelledby="work-style-type-heading">
    <span className={styles.kicker}>MY WORK STYLE TYPE</span>
    <h2 id="work-style-type-heading">대표 업무성향</h2>
    <figure className={styles.card}>
      <Image src={workStyleTypeImagePath(primary)} alt={`${primary.name} — ${primary.tagline}`} width={primary.image.width} height={primary.image.height} sizes="(max-width: 760px) 100vw, 420px" quality={100} unoptimized />
    </figure>
    {nearType ? <p className={styles.near}>가까운 업무성향: <b>{nearType.name}</b></p> : null}
    <p className={styles.note}>5가지 응답 경향이 가장 비슷한 유형을 참고용으로 보여드려요. 능력이나 직무 적합성을 판단하는 결과가 아니니, 실제 경험과 함께 살펴보세요.</p>
  </section>;
}
