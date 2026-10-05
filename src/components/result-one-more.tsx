import { ArrowRight } from "lucide-react";
import styles from "./result-one-more.module.css";

/**
 * "한 장 더" 탭. 기존 ResultEncouragement(어두운 히어로·영문 eyebrow)는
 * 지우지 않고 남겨 두고, 탭이 이 담백한 변형을 띄웁니다.
 * 랜덤 격언(one-more-lines.ts)은 읽는 사람에 따라 불편할 수 있어 쓰지 않고
 * 한 문장만 둡니다(운영자 결정 2026-10-05). 문장 목록 파일은 보존합니다.
 */
export function ResultOneMore({ onReview, onFinal }: { onReview: () => void; onFinal: () => void }) {
  return <section className={styles.root} aria-label="한 장 더">
    <p className={styles.line}>합격을 기원합니다.</p>

    <hr className={styles.rule} />

    <h3 className={styles.heading}>이어서 해볼 만한 것</h3>
    <ul className={styles.list}>
      <li><button onClick={onReview}><span><b>왜 고쳤는지 다시 보기</b><small>문항별 첨삭에서 수정·유지 이유와 확인할 사실을 봅니다.</small></span><ArrowRight size={16} aria-hidden="true" /></button></li>
      <li><button onClick={onFinal}><span><b>제출 전에 한 번 더</b><small>최종 첨삭본에서 회사명·글자 수를 확인하고 복사합니다.</small></span><ArrowRight size={16} aria-hidden="true" /></button></li>
      <li className={styles.soon}><span><b>현직자·재직자 이야기 듣기</b><small>그 일을 먼저 해 본 사람과 연결하는 기능을 준비하고 있어요. 지금은 신청이나 결제를 받지 않습니다.</small></span><em>준비 중</em></li>
    </ul>

    <p className={styles.note}>첨삭은 합격을 보장하지 않으며, 채용 결과는 지원 요건·경험·경쟁 상황에 따라 달라집니다.</p>
  </section>;
}
