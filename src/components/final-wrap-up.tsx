import type { ResultDocument } from "@/domain/result-document";
import {
  buildFinalWrapUp,
  describeWrapUpStatus,
  WRAP_UP_LABEL,
  WRAP_UP_NOTE,
  type WrapUpAction,
} from "@/domain/final-wrap-up";
import styles from "./final-wrap-up.module.css";

/**
 * 제출 전 마무리.
 *
 * FINAL의 다른 화면들은 전부 "무엇이 문제인가"를 말합니다. 아홉 개를 다 읽고
 * 나면 남는 질문이 하나입니다 — 그래서 지금 뭘 하지.
 *
 * 이 화면은 분석을 하나도 더 하지 않습니다. 이미 나온 결과를 **누가 할 수 있는
 * 일인가**로 다시 세울 뿐입니다. 그래서 새 AI 호출도, 첨삭본 수정도 없습니다.
 *
 * "제출해도 좋습니다" 같은 말은 쓰지 않습니다. 붙을지 떨어질지는 우리가 알 수
 * 없고, 권했다가 떨어지면 그 한 줄이 책임을 집니다. 남은 일이 있는지만
 * 말합니다.
 */

const SEVERITY_LABEL = { high: "높음", medium: "보통", low: "낮음" } as const;
const SEVERITY_CLASS = { high: styles.sevHigh, medium: styles.sevMedium, low: styles.sevLow } as const;
const GROUP_ORDER: WrapUpAction[] = ["NEEDS_APPLICANT", "INTERVIEW", "DONE", "KEPT"];

export function FinalWrapUp({ result }: { result: ResultDocument }) {
  const wrapUp = buildFinalWrapUp(result);

  if (wrapUp.items.length === 0) {
    return (
      <div className={styles.wrap}>
        <section className={styles.head}>
          <span>BEFORE YOU SUBMIT</span>
          <h2>제출 전 마무리</h2>
          <p>이번 분석에서는 따로 정리할 것이 나오지 않았습니다. 위 항목들을 한 번 훑어보시고 제출하시면 됩니다.</p>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <section className={styles.head}>
        <span>BEFORE YOU SUBMIT</span>
        <h2>제출 전 마무리</h2>
        <p>{describeWrapUpStatus(wrapUp)} 위 분석에서 나온 지적을 <b>누가 할 수 있는 일인지</b>로 다시 세웠습니다. 새로 분석하거나 첨삭본을 고치지 않습니다.</p>

        <div className={styles.counts}>
          {GROUP_ORDER.map((action) => (
            <div key={action} className={styles.count} data-action={action}>
              <strong>{wrapUp.counts[action]}</strong>
              <span>{WRAP_UP_LABEL[action]}</span>
            </div>
          ))}
        </div>

        {/* 같은 수치 하나가 탈락요인·이력서 대조·면접관 시선에 각각 잡히면 위에서는
            셋으로 보입니다. 여기서 하나로 묶었다는 사실을 말해 두지 않으면
            손님은 숫자가 줄어든 것을 오류로 읽습니다. */}
        {wrapUp.rawFindingCount > wrapUp.items.length && (
          <p className={styles.merged}>
            위 분석에서 {wrapUp.rawFindingCount}번 지적된 것을, 같은 문장을 가리키는 것끼리 묶어 {wrapUp.items.length}가지로 정리했습니다.
          </p>
        )}
      </section>

      {GROUP_ORDER.map((action) => {
        const items = wrapUp.items.filter((item) => item.action === action);
        if (items.length === 0) return null;
        return (
          <section key={action} className={styles.group} data-action={action}>
            <div className={styles.groupHead}>
              <h3>{WRAP_UP_LABEL[action]}</h3>
              <b>{items.length}</b>
              <p>{WRAP_UP_NOTE[action]}</p>
            </div>

            <ul className={styles.items}>
              {items.map((item) => (
                <li key={item.id} className={styles.item}>
                  <div className={styles.itemTop}>
                    <span className={`${styles.sev} ${SEVERITY_CLASS[item.severity]}`}>{SEVERITY_LABEL[item.severity]}</span>
                    <span className={styles.from}>{item.sources.join(" · ")}</span>
                  </div>
                  <b>{item.headline}</b>
                  {item.quote && <p className={styles.quote}>{item.quote}</p>}
                  <p className={styles.todo}>{item.todo}</p>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <p className={styles.footnote}>
        이 화면은 위 분석을 <b>다시 계산한 것이 아닙니다.</b> 같은 결과를 손이 가는 순서로 세운 것이고,
        첨삭본은 한 글자도 바뀌지 않았습니다.
      </p>
    </div>
  );
}
