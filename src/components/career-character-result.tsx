"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, ImageOff, Mail, Share2 } from "lucide-react";
import { useState } from "react";
import type { RiasecCharacterProfile } from "@/domain/career-interest";
import styles from "./career-character-result.module.css";

export function CareerCharacterResult({ profile, example = false }: { profile: RiasecCharacterProfile; example?: boolean }) {
  const [imageMissing, setImageMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const title = `${profile.code} · ${profile.descriptor}`;
  const resultHref = example ? "/career/ai/sample?scope=interest" : "/career/interest/result";
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
      await navigator.share({ title, text: `${profile.code} ${profile.baseName} · MOOA Career`, url: window.location.href });
      return;
    }
    await copyLink();
  };
  const email = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n${window.location.href}`)}`;
  };

  return <main className={styles.page}>
    <header className={styles.topbar}>
      <Link href={resultHref}><ArrowLeft />결과로 돌아가기</Link>
      <span>MOOA CAREER · CHARACTER RESULT</span>
    </header>

    <nav className={styles.resultSteps} aria-label="결과 화면 이동">
      <Link href={resultHref}><small>01</small>기본 결과</Link>
      <span className={styles.current}><small>02</small>캐릭터 해설</span>
      <Link href="/career/ai/sample?scope=interest"><small>03</small>심층해설 예시 <ArrowRight /></Link>
    </nav>

    <section className={styles.resultCard}>
      <div className={styles.copy}>
        <small>{example ? "EXAMPLE CHARACTER" : "MY RIASEC CHARACTER"}</small>
        <p className={styles.code}>{profile.code}</p>
        <h1>{profile.baseName}</h1>
        <p className={styles.descriptor}>{profile.descriptor}</p>
        <div className={styles.ranks}>{profile.rankings.map((axis) => <span key={axis.code}><b>{axis.rank}</b>{axis.label} {axis.code}</span>)}</div>
        <div className={styles.support}><small>SUPPORT AXIS · {profile.supportLabel}</small><p>{profile.supportDescription}</p></div>
      </div>
      <div className={styles.art}>
        {imageMissing ? <div className={styles.placeholder}><ImageOff /><b>{profile.baseCode}</b><span>이 기본 카드 이미지는 준비 중이에요.</span><small>30개 이미지를 받으면 해당 카드가 자동으로 연결됩니다.</small></div> : <Image src={profile.imagePath} alt={`${profile.baseCode} ${profile.baseName} 캐릭터 카드`} fill sizes="(max-width: 760px) 100vw, 580px" quality={100} unoptimized onError={() => setImageMissing(true)} />}
      </div>
    </section>

    <section className={styles.about}>
      <div><small>BASE CARD</small><h2>{profile.baseCode} 카드가 중심입니다.</h2><p>앞 두 글자의 순서가 기본 유형명과 카드 이미지를 결정합니다. <b>IS와 SI는 다른 카드·다른 이름</b>입니다.</p></div>
      <div><small>THIRD AXIS</small><h2>{profile.code.slice(2)}는 보조 해설입니다.</h2><p>세 번째 글자는 기본 카드를 바꾸지 않고, 결과를 읽는 관점과 살펴볼 활동 단서를 더합니다.</p></div>
    </section>

    <section className={styles.interpretation}>
      <header><small>HOW TO READ THIS RESULT</small><h2>세 가지 활동 축을 한 흐름으로 읽습니다.</h2><p>{profile.focusSummary}</p></header>
      <div className={styles.axisGrid}>{profile.rankings.map((axis) => <article key={axis.code}><small>0{axis.rank} · {axis.code}</small><h3>{axis.label}</h3><b>{axis.subtitle}</b><p>{axis.description}</p></article>)}</div>
    </section>

    <section className={styles.application}>
      <article><small>STRENGTHS TO EVIDENCE</small><h2>경험에서 확인해 볼 강점</h2><ul>{profile.strengths.map((strength) => <li key={strength}>{strength}</li>)}</ul></article>
      <article><small>EXPLORE, NOT A VERDICT</small><h2>살펴볼 환경과 역할</h2><p>{profile.watchOut}에서는 흥미가 잘 드러나지 않을 수 있어요. 공고의 실제 업무와 내가 해 본 경험을 비교해 보세요.</p><div className={styles.roleTags}>{profile.roleAreas.map((area) => <span key={area}>{area}</span>)}</div></article>
    </section>

    <section className={styles.share}>
      <div><small>SHARE THIS RESULT</small><h2>이 캐릭터 결과를 공유해 보세요.</h2><p>{example ? "예시 리포트 링크를 공유합니다." : "공유 전에는 결과에 개인 정보가 없는지 확인해 주세요."}</p></div>
      <div className={styles.shareButtons}><button type="button" onClick={() => void share()}><Share2 />공유하기</button><button type="button" onClick={() => void copyLink()}>{copied ? <Check /> : <Copy />}{copied ? "복사됨" : "링크 복사"}</button><button type="button" onClick={email}><Mail />이메일</button></div>
    </section>
    <p className={styles.note}>이 카드는 직업흥미 응답을 바탕으로 한 자기이해·커리어 탐색 자료입니다. 직업 적합성, 능력, 채용 결과를 판단하거나 보장하지 않습니다.</p>
  </main>;
}