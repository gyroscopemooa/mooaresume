import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingConsistency } from "@/components/landing-consistency";
import { LandingConsistencyB } from "@/components/landing-consistency-b";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "첨삭 철학 A·B 비교", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function LandingConsistencyPreview({ searchParams }: { searchParams: Promise<{ variant?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { variant } = await searchParams;
  const isA = variant === "a";
  return <main className={styles.page}>
    <header className={styles.toolbar}>
      <div><span>개발 전용 · 운영 미반영</span><h1>첨삭 철학 비교안</h1><p>A 원본은 그대로 보존했습니다. 선택 전에는 운영 홈을 바꾸지 않습니다.</p></div>
      <nav aria-label="비교안 선택">
        <Link href="?variant=a" aria-current={isA ? "page" : undefined}>A · 클로드 원본</Link>
        <Link href="?variant=b" aria-current={!isA ? "page" : undefined}>B · 코덱스 제안</Link>
      </nav>
    </header>
    {isA ? <LandingConsistency/> : <LandingConsistencyB/>}
  </main>;
}
