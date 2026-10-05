import type { ContextResearch } from "@/domain/context-enhancement";
import styles from "./context-enhancement-option.module.css";

export function ContextResearchNotice({ research }: { research?: ContextResearch }) {
  if (!research) return null;
  const available = research.status === "available";
  return <aside className={styles.option} aria-label="기업·직무 맥락 보강 결과">
    <strong>기업·직무 맥락 보강 · BETA</strong>
    <p>{available ? "외부 참고자료를 작성·검수 단계에 전달했습니다. 제출 공고를 우선하며, 자료 확보가 모든 문항의 변경이나 사실 검증 완료를 뜻하지는 않습니다." : "외부 자료를 충분히 확인하지 못해 제출한 자료만으로 첨삭했습니다."}</p>
    <p>조회 시점: {research.checkedAt.replace("T", " ").slice(0, 16)} UTC</p>
    {available && <details><summary>참고한 출처 {research.sources.length}개</summary>
      <ul>{research.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul>
      <p>과거 자료·동명 기업 등으로 해석이 다를 수 있습니다. 제출 전 공식 자료와 대조해 주세요.</p>
    </details>}
  </aside>;
}
