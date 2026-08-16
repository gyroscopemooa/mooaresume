"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, PencilLine, ShieldCheck, UserRound, X } from "lucide-react";
import type { ResultCandidateProfile } from "@/domain/result-document";
import styles from "./candidate-profile-card.module.css";

type Props = {
  caseId: string;
  profile: ResultCandidateProfile;
  isSample: boolean;
};

export function CandidateProfileCard({ caseId, profile, isSample }: Props) {
  const storageKey = `mooa:candidate-profile-review:${caseId}:v1`;
  const [open, setOpen] = useState(false);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
        if (Array.isArray(saved) && saved.every((item) => typeof item === "string")) setExcludedIds(saved);
      } catch {
        sessionStorage.removeItem(storageKey);
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [storageKey]);

  useEffect(() => {
    if (ready) sessionStorage.setItem(storageKey, JSON.stringify(excludedIds));
  }, [excludedIds, ready, storageKey]);

  const visibleItems = profile.items.filter((item) => !excludedIds.includes(item.id));

  return <section className={styles.card}>
    <header>
      <div className={styles.icon}><UserRound /></div>
      <div><span>지원자료에서 확인</span><h2>분석에 사용된 내 정보</h2><p>{visibleItems.length}개 항목 · 지원 당시 Snapshot</p></div>
      <button type="button" onClick={() => setOpen((current) => !current)}>{open ? "접기" : "자세히"}<ChevronDown data-open={open}/></button>
    </header>
    <div className={styles.summary}>{visibleItems.slice(0, 4).map((item) => <div key={item.id}><span>{item.label}</span><b>{item.value}</b></div>)}</div>
    {open && <div className={styles.details}>
      {profile.items.map((item) => {
        const excluded = excludedIds.includes(item.id);
        return <article key={item.id} data-excluded={excluded}>
          <div><span>{item.label}</span><b>{item.value}</b>{item.detail && <small>{item.detail}</small>}</div>
          {excluded
            ? <button type="button" onClick={() => setExcludedIds((current) => current.filter((id) => id !== item.id))}><Check/> 다시 포함</button>
            : <button type="button" onClick={() => setExcludedIds((current) => [...current, item.id])}><X/> 사실 아님</button>}
        </article>;
      })}
      <button type="button" className={styles.edit} disabled><PencilLine/> 정보 수정·추가 <small>로그인 연결 후</small></button>
      <p><ShieldCheck/> {isSample ? "샘플에서 변경한 내용은 이 브라우저 세션에만 저장됩니다." : "확인한 정보는 이 지원 건의 Snapshot으로 보관됩니다."}</p>
    </div>}
  </section>;
}

