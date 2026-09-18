"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import styles from "./career-ai-report-history.module.css";

type Build = { id: string; scope: string; created_at: string };
const SCOPE_LABEL: Record<string, string> = { interest: "직업흥미 심층해설", work_style: "업무성향 심층해설", work_values: "직업가치 심층해설", combined: "종합 심층해설" };

/** 결제해 만든 AI 심층해설을 다시 열어 보는 목록. 아직 없으면 아무것도 그리지 않는다. */
export function CareerAiReportHistory() {
  const [builds, setBuilds] = useState<Build[]>([]);
  useEffect(() => {
    let active = true;
    void fetch("/api/career-ai-builds/history", { cache: "no-store" })
      .then(async (response) => (response.ok ? await response.json() as { builds?: Build[] } : null))
      .then((body) => { if (active && body?.builds) setBuilds(body.builds); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (!builds.length) return null;
  return <section className={styles.history}>
    <div className={styles.head}><Sparkles /><div><small>AI DEEP INTERPRETATION</small><h2>내 심층해설 기록</h2></div></div>
    <ul>{builds.map((build) => <li key={build.id}><Link href={`/career/ai/report?build=${build.id}`}><span><b>{SCOPE_LABEL[build.scope] ?? "심층해설"}</b><small>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(build.created_at))}</small></span><em>다시 보기 <ArrowRight /></em></Link></li>)}</ul>
  </section>;
}
