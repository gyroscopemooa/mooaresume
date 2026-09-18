"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, ImageOff, Mail, Share2 } from "lucide-react";
import { useState } from "react";
import type { WorkValueCharacterProfile } from "@/domain/career-work-values";
import { CareerAiCtaBar } from "./career-ai-cta-bar";
import styles from "./career-values-character-result.module.css";

/**
 * 직업흥미의 `career-character-result.tsx`와 같은 구조로 맞췄다(2026-09-18,
 * "캐릭터검사 심층해설까지 직업흥미랑 같게" 지시). 다른 점은 구조가 아니라
 * 숫자다 — 직업흥미는 상위 3개 기준(2개 조합 + 보조축 1개)을 쓰지만
 * 직업가치는 응답 자체가 상위 2개 조합까지만 계산하므로 보조축 섹션이 없다.
 */
export function CareerValuesCharacterResult({ profile, example = false }: { profile: WorkValueCharacterProfile; example?: boolean }) {
  const [imageMissing, setImageMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const title = `${profile.code} · ${profile.title}`;
  const resultHref = example ? "/career/ai/sample?scope=work_values" : "/career/values/result";
  const rankings = profile.rankings ?? [];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("이 링크를 복사해 주세요.", window.location.href);
    }
  };
  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title, text: `${title} · MOOA Career`, url: window.location.href });
      return;
    }
    await copyLink();
  };
  const email = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n${window.location.href}`)}`;
  };

  return <main className={styles.page}>
    <CareerAiCtaBar scope="work_values" />
    <header className={styles.topbar}>
      <Link href={resultHref}><ArrowLeft />결과로 돌아가기</Link>
      <span>MOOA CAREER · WORK VALUE CHARACTER</span>
    </header>

    <nav className={styles.resultSteps} aria-label="결과 화면 이동">
      <Link href={resultHref}><small>01</small>기본 결과</Link>
      <span className={styles.current}><small>02</small>캐릭터 해설</span>
      <Link href="/career/ai/sample?scope=work_values"><small>03</small>심층해설 예시 <ArrowRight /></Link>
    </nav>

    <section className={styles.resultCard}>
      <div className={styles.copy}>
        <small>{example ? "EXAMPLE CHARACTER" : "MY WORK VALUE CHARACTER"}</small>
        <p className={styles.code}>{profile.code}</p>
        <h1>{profile.title}</h1>
        <p className={styles.descriptor}>{profile.descriptor}</p>
        <div className={styles.ranks}>{rankings.map((axis) => <span key={axis.code}><b>{axis.rank}</b>{axis.label} {axis.code}</span>)}</div>
        <div className={styles.chips}>{profile.chips.map((chip) => <span key={chip}>{chip}</span>)}</div>
      </div>
      <div className={styles.art}>
        {imageMissing
          ? <div className={styles.placeholder}><ImageOff /><b>{profile.code}</b><span>이 카드 이미지는 준비 중이에요.</span><small>이미지를 받으면 해당 카드가 자동으로 연결됩니다.</small></div>
          : <Image src={profile.imagePath} alt={`${profile.code} ${profile.title} 직업가치 캐릭터 카드`} fill sizes="(max-width: 760px) 100vw, 480px" quality={100} unoptimized onError={() => setImageMissing(true)} />}
      </div>
    </section>

    <section className={styles.about}>
      <div><small>BASE CARD</small><h2>{profile.code} 카드가 중심입니다.</h2><p>두 글자의 순서가 캐릭터 이름과 카드 이미지를 결정합니다. <b>AI와 IA는 다른 카드·다른 이름</b>입니다.</p></div>
      <div><small>TWO-AXIS MODEL</small><h2>두 기준의 조합만 봅니다.</h2><p>직업흥미와 달리 세 번째 보조축은 쓰지 않고, 가장 중요하다고 응답한 두 기준만으로 캐릭터를 정합니다.</p></div>
    </section>

    {rankings.length === 2 && <section className={styles.interpretation}>
      <header><small>HOW TO READ THIS RESULT</small><h2>두 가지 기준을 한 흐름으로 읽습니다.</h2><p>{profile.focusSummary}</p></header>
      <div className={styles.axisGrid}>{rankings.map((axis) => <article key={axis.code}><small>0{axis.rank} · {axis.code}</small><h3>{axis.label}</h3><b>{axis.subtitle}</b><p>{axis.description}</p></article>)}</div>
    </section>}

    {profile.strengths && <section className={styles.application}>
      <article><small>STRENGTHS TO EVIDENCE</small><h2>경험에서 확인해 볼 강점</h2><ul>{profile.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul></article>
      <article><small>EXPLORE, NOT A VERDICT</small><h2>살펴볼 환경과 역할</h2><p>{profile.watchOut}에서는 이 가치가 잘 드러나지 않을 수 있어요. 공고의 실제 조건과 조직 문화를 비교해 보세요.</p><div className={styles.roleTags}>{(profile.roleAreas ?? []).map((area) => <span key={area}>{area}</span>)}</div></article>
    </section>}

    <section className={styles.share}>
      <div><small>SHARE THIS RESULT</small><h2>이 캐릭터 결과를 공유해 보세요.</h2><p>{example ? "예시 리포트 링크를 공유합니다." : "공유 전에는 결과에 개인 정보가 없는지 확인해 주세요."}</p></div>
      <div className={styles.shareButtons}>
        <button type="button" onClick={() => void share()}><Share2 />공유하기</button>
        <button type="button" onClick={() => void copyLink()}>{copied ? <Check /> : <Copy />}{copied ? "복사됨" : "링크 복사"}</button>
        <button type="button" onClick={email}><Mail />이메일</button>
      </div>
    </section>
    <p className={styles.note}>이 카드는 직업가치 응답을 바탕으로 한 자기이해·커리어 탐색 자료입니다. 직업 적합성, 능력, 채용 결과를 판단하거나 보장하지 않습니다.</p>
  </main>;
}
