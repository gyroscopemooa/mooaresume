"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { useMemo, useState } from "react";
import { RIASEC_PAIR_PROFILES, type RiasecCharacterProfile } from "@/domain/career-interest";
import styles from "./career-ai-sample-card-review.module.css";

const pairs = Object.keys(RIASEC_PAIR_PROFILES);
const axes = ["R", "I", "A", "S", "E", "C"];

function validThird(pair: string, preferred: string) {
  return !pair.includes(preferred) && axes.includes(preferred) ? preferred : axes.find((axis) => !pair.includes(axis)) ?? "R";
}

export function CareerAiSampleCardReview({ profile }: { profile: RiasecCharacterProfile }) {
  const [imageMissing, setImageMissing] = useState(false);
  const pair = profile.baseCode;
  const index = pairs.indexOf(pair);
  const previous = pairs[(index - 1 + pairs.length) % pairs.length];
  const next = pairs[(index + 1) % pairs.length];
  const third = profile.code.slice(2);
  const core = useMemo(() => RIASEC_PAIR_PROFILES[pair], [pair]);
  const hrefFor = (nextPair: string) => `/career/ai/sample?scope=interest&design=1&pair=${nextPair}&third=${validThird(nextPair, third)}`;

  return <main className={styles.page}>
    <header className={styles.topbar}><Link href="/career/ai/sample?scope=interest"><ArrowLeft />심층해설 결과로</Link><span>RIASEC CARD REVIEW · {String(index + 1).padStart(2, "0")} / 30</span></header>
    <section className={styles.intro}><small>RIASEC BASE CARD LIBRARY</small><h1>3글자 결과는 유지하고,<br /><em>카드는 앞 2글자</em>로 읽습니다.</h1><p><b>{profile.code}</b>는 실제 결과 코드입니다. 카드와 기본 유형명은 <b>{pair}</b> 기준이며, 마지막 <b>{third}</b>는 보조 성향 해설에만 반영됩니다.</p></section>
    <section className={styles.cardStage}>
      <Link className={styles.arrow} href={hrefFor(previous)} aria-label="이전 기본 카드"><ChevronLeft /></Link>
      <article className={styles.card}>
        <div className={styles.cardCopy}><small>ACTUAL RESULT CODE</small><p className={styles.resultCode}>{profile.code}</p><span className={styles.pairCode}>{pair} · {core.name}</span><h2>{core.name}</h2><p className={styles.core}>{core.coreDescription}</p><div className={styles.support}><small>{third} · {profile.supportLabel}</small><p>{profile.supportDescription}</p></div></div>
        <div className={styles.imagePanel}>{imageMissing ? <div className={styles.placeholder}><ImageOff /><b>{pair}</b><span>이 기본 카드 이미지는 준비 중입니다.</span><small>현재 제공된 카드 파일만 실제 이미지로 표시합니다.</small></div> : <Image src={core.imagePath} alt={`${pair} ${core.name} 캐릭터 카드`} fill sizes="(max-width: 760px) 100vw, 680px" quality={100} unoptimized onError={() => setImageMissing(true)} />}</div>
        <section className={styles.combined}><small>{profile.code} 종합 해석</small><p>{profile.focusSummary}</p></section>
      </article>
      <Link className={styles.arrow} href={hrefFor(next)} aria-label="다음 기본 카드"><ChevronRight /></Link>
    </section>
    <nav className={styles.pairPicker} aria-label="30개 기본 카드 선택"><div><small>30 BASE CARDS</small><b>기본 카드 선택</b></div><div className={styles.pairGrid}>{pairs.map((item) => <Link className={item === pair ? styles.activePair : undefined} key={item} href={hrefFor(item)}><b>{item}</b><span>{RIASEC_PAIR_PROFILES[item].name}</span></Link>)}</div></nav>
    <p className={styles.note}>카드 검수 화면입니다. 기본 카드 30개는 앞 두 글자 순서로만 정해지며, 세 번째 축은 카드 이미지를 바꾸지 않습니다.</p>
  </main>;
}