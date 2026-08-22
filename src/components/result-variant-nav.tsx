import Link from "next/link";
import styles from "./result-variant-nav.module.css";

type Props = {
  active: "current" | "complete" | "codex" | "claude" | "claude-restored" | "codex-restored";
  analysisRunId?: string;
};

function href(pathname: string, analysisRunId?: string) {
  return analysisRunId ? `${pathname}?analysisRunId=${encodeURIComponent(analysisRunId)}` : pathname;
}

/**
 * Compares the six result renderings side by side — built for choosing which
 * one becomes canonical, never meant for a paying applicant to land on. It
 * used to render unconditionally on every /result/* route, including /result
 * itself, so a real customer's dashboard carried links labelled "Codex 빨간펜
 * 미러" and "Claude 복원판" — internal engineering names with no meaning to
 * them. Gated on environment rather than removed from each page: the compare
 * pages and this tool stay intact for continued dev use, they just stop
 * rendering once deployed.
 */
export function ResultVariantNav({ active, analysisRunId }: Props) {
  if (process.env.NODE_ENV === "production") return null;

  return <nav className={styles.nav} aria-label="결과 화면 버전 비교">
    <span>결과 버전 비교</span>
    <Link href={href("/result", analysisRunId)} data-active={active === "complete"}>완성본 <small>기본</small></Link>
    <Link href={href("/result/v2", analysisRunId)} data-active={active === "current"}>이전 버전</Link>
    <Link href={href("/result/codex", analysisRunId)} data-active={active === "codex"}>Codex 빨간펜 미러</Link>
    <Link href={href("/result/claude", analysisRunId)} data-active={active === "claude"}>Claude 제출본 미러</Link>
    <Link href={href("/result/claude-restored", analysisRunId)} data-active={active === "claude-restored"}>Claude 복원판(전체)</Link>
    <Link href={href("/result/codex-restored", analysisRunId)} data-active={active === "codex-restored"}>Codex 복원판(전체)</Link>
    <small>각 버전은 서로 덮어쓰지 않습니다.</small>
  </nav>;
}
