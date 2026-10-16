import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import { INTERVIEW_MARKETING_DRAFT as copy } from "@/domain/interview-marketing-draft";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "면접 PRO 홍보 초안", robots: { index: false, follow: false } };
export default function InterviewMarketingPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <main className={styles.page}>
    <header><a href="/dev/interview-pro-v2">MOOA Resume · 면접 PRO</a><span>로컬 홍보 초안</span></header>
    <aside>출시 전 미리보기입니다. 아래 예정 기능은 현재 제공되지 않으며 구매를 받지 않습니다.</aside>
    <section className={styles.hero}><p>INTERVIEW PRO</p><h1>{copy.headline}</h1><p>{copy.description}</p><a href="/dev/interview-pro-v2">현재 개발 시안 보기 →</a></section>
    <section className={styles.grid}>{copy.sections.map((section) => <article key={section.id}><small>{section.status}</small><h2>{section.title}</h2><p>{section.body}</p></article>)}</section>
    <section className={styles.perspectives}><small>10가지 관점 · 구성 초안</small><h2>무난함만이 정답은 아니니까.</h2><p>관점별 강점과 의견 차이를 함께 보여주는 것이 목표입니다. AI 관점의 수가 평가 정확도나 독립성을 보장하지는 않습니다.</p><ul>{copy.perspectives.map((perspective) => <li key={perspective}>{perspective}</li>)}</ul></section>
    <footer>현재 로컬 시안: 카메라·마이크 녹화, 문항별 연습, 고정 질문 자동 진행, 시간 복기. AI 라이브·다중 관점·입퇴장 분석은 미연결입니다.</footer>
  </main>;
}
