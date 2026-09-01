import { listFeedback, markFeedbackRead } from "@/server/admin/admin-repository";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 분석 후기.
 *
 * 별점만 세지 않습니다. 평균 4.2는 무엇을 고칠지 알려주지 않지만, "더
 * 있었으면 하는 것"에 같은 말이 세 번 나오면 그것이 다음에 만들 것입니다.
 * 그래서 글이 있는 응답을 위로 끌어올리지 않고 **시간순 그대로** 둡니다 —
 * 골라 읽기 시작하면 조용한 다수가 통계에서 사라집니다.
 */
export default async function FeedbackPage() {
  const rows = await listFeedback();
  // 열어 본 순간 읽음으로 넘깁니다. 한 건씩 누르게 하면 아무도 누르지 않고,
  // 배지가 줄지 않으면 곧 무시하는 숫자가 됩니다.
  await markFeedbackRead();

  const withRating = rows.filter((row) => row.rating > 0);
  const average = withRating.length
    ? (withRating.reduce((sum, row) => sum + row.rating, 0) / withRating.length).toFixed(1)
    : "—";
  const wishes = rows.filter((row) => row.wishText).length;

  return (
    <>
      <div className={styles.head}>
        <div>
          <h1>분석 후기</h1>
          <p>
            완료 메일의 <b>30초 후기</b> 버튼으로 들어옵니다. 별점만 누르고 가는 응답이
            대부분이고, 그것도 응답입니다 — 글이 달린 것만 세면 만족한 사람이 통계에서 사라집니다.
          </p>
        </div>
      </div>

      <div className={styles.cards}>
        <div className={styles.card}>
          <span>평균 별점</span>
          <strong>{average}<i>/ 5</i></strong>
          <small>응답 {rows.length}건</small>
        </div>
        <div className={styles.card}>
          <span>낮은 별점 (1~2점)</span>
          <strong>{rows.filter((row) => row.rating <= 2).length}<i>건</i></strong>
          <small>들어오는 즉시 메일로도 알립니다</small>
        </div>
        <div className={styles.card}>
          <span>요청이 적힌 응답</span>
          <strong>{wishes}<i>건</i></strong>
          <small>다음에 만들 것의 목록</small>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h2>받은 후기</h2>
          <small>최근 200건</small>
        </div>
        {rows.length === 0 ? (
          <div className={styles.waiting}>
            <div className={styles.waitingTop}>
              <span className={styles.waitingDot} />
              <b>아직 받은 후기가 없습니다</b>
            </div>
            <ul className={styles.waitingList}>
              <li><em>1</em><span>분석이 끝나면 완료 메일이 나갑니다.</span></li>
              <li><em>2</em><span>그 메일의 <b>30초 후기 남기기</b> 버튼이 이 목록으로 이어집니다.</span></li>
              <li><em>3</em><span>1~2점이 들어오면 답장 주소로 메일이 함께 갑니다.</span></li>
            </ul>
            <p className={styles.waitingNote}>
              후기 링크는 분석 하나당 한 번만 받습니다. 같은 사람이 여러 번 보내면
              별점 평균이 그 사람의 기분이 되기 때문입니다.
            </p>
          </div>
        ) : (
          <div className={styles.scroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>별점</th>
                  <th>도움이 된 점</th>
                  <th>더 있었으면 하는 것</th>
                  <th>받은 때</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={`${styles.pill} ${row.rating <= 2 ? styles.pillBad : row.rating >= 4 ? styles.pillOk : styles.pillWarn}`}>
                        {"★".repeat(row.rating)}{"☆".repeat(Math.max(0, 5 - row.rating))}
                      </span>
                    </td>
                    <td className={styles.wrap}>{row.helpfulText ?? <span className={styles.mono}>—</span>}</td>
                    <td className={styles.wrap}>{row.wishText ?? <span className={styles.mono}>—</span>}</td>
                    <td className={styles.mono}>{row.createdAt.slice(0, 16).replace("T", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
