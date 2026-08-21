import Link from "next/link";
import type { ResultDocument } from "@/domain/result-document";
import { buildCodexRedpenMirror } from "@/domain/codex-redpen-mirror";
import styles from "./result-workspace-codex.module.css";

export function ResultWorkspaceCodex({ result }: { result: ResultDocument }) {
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/" className={styles.brand}><span>M</span>MOOA Resume</Link>
      <em>CODEX MIRROR · 비교용</em>
    </header>
    <div className={styles.container}>
      <Link href="/result" className={styles.back}>← 현재 결과 화면으로</Link>
      <section className={styles.hero}>
        <div><small>DETERMINISTIC RED PEN</small><h1>무엇이 빠지고 더해졌는지<br/><em>원문 위에서 확인합니다.</em></h1><p>{result.company} · {result.role} · {result.product} 결과를 별도 미러에서 보여줍니다.</p></div>
        <aside className={styles.principle}><b>Codex 버전의 기준</b><p>새 평가를 만들어내지 않습니다. 저장된 첨삭 전·후 문장의 실제 차이와 기존 수정 이유만 표시합니다.</p></aside>
      </section>
      <div className={styles.legend}><span><i/>빨간 표시: 첨삭본에서 삭제·교체된 원문</span><span><i/>초록 표시: 첨삭본에 추가·구체화된 표현</span></div>
      {result.questions.map((question) => {
        const mirror = buildCodexRedpenMirror(question.originalAnswer, question.revisedAnswer);
        return <article className={styles.question} key={question.id}>
          <header><div><span>문항 {question.order}</span><h2>{question.title}</h2></div><small>{question.prompt}</small></header>
          <div className={styles.compare}>
            <section className={styles.copy}><small>제출한 원문 · 빨간펜</small><p className={styles.text}>{mirror.original.map((part, index) => part.type === "removed" ? <mark className={styles.removed} key={index}>{part.value}</mark> : <span key={index}>{part.value}</span>)}</p></section>
            <section className={styles.copy}><small>현재 첨삭본 · 추가 표현</small><p className={styles.text}>{mirror.revised.map((part, index) => part.type === "added" ? <mark className={styles.added} key={index}>{part.value}</mark> : <span key={index}>{part.value}</span>)}</p></section>
          </div>
          <div className={styles.notes}>
            <section><b>저장된 수정 이유</b><ul>{question.revisionReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{question.verificationNote && <p>확인 필요: {question.verificationNote}</p>}</section>
            <section><b>기존 분석이 강조한 첨삭 문구</b>{question.highlightedPhrases.length ? <div className={styles.phrases}>{question.highlightedPhrases.map((phrase) => <span key={phrase}>{phrase}</span>)}</div> : <p className={styles.empty}>별도로 저장된 강조 문구가 없습니다.</p>}</section>
          </div>
        </article>;
      })}
      <p className={styles.footer}>이 화면은 현재 결과를 덮어쓰지 않는 Codex 비교용 미러입니다. 원본 결과 데이터와 사용자가 직접 수정한 내용은 변경하지 않습니다.</p>
    </div>
  </main>;
}
