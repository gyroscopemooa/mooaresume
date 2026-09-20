"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Copy, Mail, Share2 } from "lucide-react";
import { useState } from "react";
import { WORK_STYLE_DIMENSION_LABELS } from "@/domain/career-assessment";
import { workStyleTypeCode, workStyleTypeImagePath } from "@/domain/work-style-type";
import type { WorkStyleTypeDefinition } from "@/domain/work-style-type-config";
import { CareerAiCtaBar } from "./career-ai-cta-bar";
// 직업가치 캐릭터 화면과 같은 틀·같은 클래스를 그대로 쓴다(스타일을 새로 만들지 않고 재사용).
import styles from "./career-values-character-result.module.css";

export function WorkStyleCharacterResult({ type, example = false }: { type: WorkStyleTypeDefinition; example?: boolean }) {
  const [copied, setCopied] = useState(false);
  const code = workStyleTypeCode(type);
  const title = `${code} · ${type.name}`;
  const resultHref = example ? "/career/ai/sample?scope=work_style" : "/career/work-style/result";
  const coreLabels = type.core.map((dimension) => WORK_STYLE_DIMENSION_LABELS[dimension]);

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
    <CareerAiCtaBar scope="work_style" />
    <header className={styles.topbar}>
      <Link href={resultHref}><ArrowLeft />결과로 돌아가기</Link>
      <span>MOOA CAREER · WORK STYLE TYPE</span>
    </header>

    <nav className={styles.resultSteps} aria-label="결과 화면 이동">
      <Link href={resultHref}><small>01</small>기본 결과</Link>
      <span className={styles.current}><small>02</small>캐릭터 해설</span>
      <Link href="/career/ai/sample?scope=work_style"><small>03</small>심층해설 예시 <ArrowRight /></Link>
    </nav>

    <section className={styles.resultCard}>
      <div className={styles.copy}>
        <small>{example ? "EXAMPLE TYPE" : "MY WORK STYLE TYPE"}</small>
        <p className={styles.code}>{code}</p>
        <h1>{type.name}</h1>
        <p className={styles.descriptor}>{type.tagline}</p>
        <div className={styles.chips}>{coreLabels.length ? coreLabels.map((label) => <span key={label}>핵심 · {label}</span>) : <span>다섯 성향의 균형</span>}</div>
      </div>
      <div className={styles.art}>
        <Image src={workStyleTypeImagePath(type)} alt={`${code} ${type.name} 업무성향 카드`} fill sizes="(max-width: 760px) 100vw, 480px" quality={100} unoptimized style={{ objectFit: "contain" }} />
      </div>
    </section>

    <section className={styles.about}>
      <div><small>HOW THIS TYPE IS CHOSEN</small><h2>30개 유형 중 가장 가까운 카드예요.</h2><p>계획·완수, 협업 지향, 상호작용 선호, 정서적 안정, 학습·새로운 방식 다섯 응답 경향을 30개 유형의 기준 패턴과 비교해 가장 비슷한 카드 하나를 보여드립니다.</p></div>
      <div><small>NOT A VERDICT</small><h2>참고용 유형이에요.</h2><p>같은 유형이어도 사람마다 강점이 드러나는 장면은 달라요. 카드 속 &lsquo;잘하는 일&rsquo;과 &lsquo;빛나는 환경&rsquo;은 내 경험과 공고를 비교하는 출발점으로만 써 주세요.</p></div>
    </section>

    <section className={styles.share}>
      <div><small>SHARE THIS RESULT</small><h2>이 유형 결과를 공유해 보세요.</h2><p>{example ? "예시 리포트 링크를 공유합니다." : "공유 전에는 결과에 개인 정보가 없는지 확인해 주세요."}</p></div>
      <div className={styles.shareButtons}>
        <button type="button" onClick={() => void share()}><Share2 />공유하기</button>
        <button type="button" onClick={() => void copyLink()}>{copied ? <Check /> : <Copy />}{copied ? "복사됨" : "링크 복사"}</button>
        <button type="button" onClick={email}><Mail />이메일</button>
      </div>
    </section>
    <p className={styles.note}>이 카드는 업무성향 응답을 바탕으로 한 자기이해·커리어 탐색 자료입니다. 직업 적합성, 능력, 채용 결과를 판단하거나 보장하지 않습니다.</p>
  </main>;
}
