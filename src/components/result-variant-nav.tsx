import Link from "next/link";
import styles from "./result-variant-nav.module.css";

type Props = {
  active: "current" | "complete" | "codex" | "claude" | "claude-restored" | "codex-restored";
  analysisRunId?: string;
};

function href(pathname: string, analysisRunId?: string) {
  return analysisRunId ? `${pathname}?analysisRunId=${encodeURIComponent(analysisRunId)}` : pathname;
}

export function ResultVariantNav({ active, analysisRunId }: Props) {
  return <nav className={styles.nav} aria-label="결과 화면 버전 비교">
    <span>결과 버전 비교</span>
    <Link href={href("/result", analysisRunId)} data-active={active === "current"}>현재 버전</Link>
    <Link href={href("/result/complete", analysisRunId)} data-active={active === "complete"}>완성본</Link>
    <Link href={href("/result/codex", analysisRunId)} data-active={active === "codex"}>Codex 빨간펜 미러</Link>
    <Link href={href("/result/claude", analysisRunId)} data-active={active === "claude"}>Claude 제출본 미러</Link>
    <Link href={href("/result/claude-restored", analysisRunId)} data-active={active === "claude-restored"}>Claude 복원판(전체)</Link>
    <Link href={href("/result/codex-restored", analysisRunId)} data-active={active === "codex-restored"}>Codex 복원판(전체)</Link>
    <small>각 버전은 서로 덮어쓰지 않습니다.</small>
  </nav>;
}
