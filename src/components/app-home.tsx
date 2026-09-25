"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ListOrdered, LockKeyhole } from "lucide-react";
import { isFinalEnabled } from "@/domain/final-availability";
import { FINAL_BASE_PRICE_KRW, PRO_BASE_PRICE_KRW, QUICK_BASE_PRICE_KRW, type ProductTier } from "@/domain/usage-entitlement";
import { loadAppSelection, saveAppSelection } from "@/lib/app-intake-draft";
import { isInstalledAppContext } from "@/lib/app-context";
import { ProInputPage } from "./pro-input-page";
import { QuickInputPage } from "./quick-input-page";
import styles from "./app-home.module.css";

/**
 * 앱을 켜면 처음 보이는 화면 = 첨삭 입력.
 *
 * 홍보 홈과 입력 화면을 나누지 않습니다. 앱을 여는 이유가 자소서를 넣는
 * 것이고, 그 앞에 소개 화면을 세우면 매번 한 번 더 눌러야 합니다.
 *
 * 상품(QUICK/PRO/FINAL)과 작성 유형만 위에서 고르고, 입력 자체는 웹에서 팔고
 * 있는 화면을 그대로 씁니다 — 분류·문항 구분·글자 수·저장·결제 경계를 앱용으로
 * 다시 구현하면 두 벌이 서로 어긋나기 시작합니다. 이 파일이 하는 일은 고르는
 * 자리와 좁은 화면용 배치뿐입니다.
 */

type WritingType = "CREATE" | "BUILD" | "POLISH";

const PRODUCT_LABEL: Record<ProductTier, string> = { QUICK: "QUICK", PRO: "PRO", FINAL: "FINAL" };
const PRODUCT_PRICE: Record<ProductTier, number> = {
  QUICK: QUICK_BASE_PRICE_KRW,
  PRO: PRO_BASE_PRICE_KRW,
  FINAL: FINAL_BASE_PRICE_KRW,
};
// QUICK은 공고·자료를 보지 않으므로 '처음부터 작성'이 없습니다 — 기존 웹의
// 상품 범위와 같습니다.
const WRITING_TYPES: Record<ProductTier, Array<{ id: WritingType; label: string; hint: string }>> = {
  QUICK: [
    { id: "POLISH", label: "최종 첨삭", hint: "쓴 글을 문장·논리·글자 수까지 고칩니다." },
    { id: "BUILD", label: "내용 보완", hint: "지금 글 안에서 근거와 구체성을 채웁니다." },
  ],
  PRO: [
    { id: "POLISH", label: "최종 첨삭", hint: "공고·이력서와 함께 읽고 제출본을 만듭니다." },
    { id: "BUILD", label: "내용 보완", hint: "공고 요구와 자료에서 빠진 근거를 채웁니다." },
    { id: "CREATE", label: "처음부터", hint: "쓸 내용이 없을 때 문답으로 만듭니다." },
  ],
  FINAL: [
    { id: "POLISH", label: "최종 첨삭", hint: "제출 직전 교차검증까지 함께 봅니다." },
    { id: "BUILD", label: "내용 보완", hint: "부족한 문항을 채우고 문항 간 충돌을 봅니다." },
    { id: "CREATE", label: "처음부터", hint: "문답으로 초안을 만들고 최종 점검까지." },
  ],
};

export function AppHome() {
  const finalOpen = isFinalEnabled();
  const [product, setProduct] = useState<ProductTier>("PRO");
  const [writingType, setWritingType] = useState<WritingType>("POLISH");
  const [installedApp, setInstalledApp] = useState(false);
  // 고른 값은 이 탭에 기억해 둡니다. 결과를 보고 돌아왔을 때 다시 고르게 하면
  // 매번 같은 두 번을 누릅니다.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    // 한 틱 뒤에 넣습니다: 효과 본문에서 바로 setState를 부르면 렌더가 연쇄로
    // 돌고, 이 저장소의 lint 규칙도 그것을 막습니다.
    const timeout = window.setTimeout(() => {
      const saved = loadAppSelection();
      if (saved && (saved.product !== "FINAL" || finalOpen)) {
        setProduct(saved.product);
        if (WRITING_TYPES[saved.product].some((type) => type.id === saved.mode)) setWritingType(saved.mode);
      }
      setRestored(true);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [finalOpen]);

  useEffect(() => {
    // The actual TWA starts with `source=twa` (or its Android referrer). Its
    // wider work canvas is deliberately app-only; normal mobile web keeps the
    // shared web width and no app navigation.
    const timeout = window.setTimeout(() => setInstalledApp(isInstalledAppContext()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (restored) saveAppSelection({ product, mode: writingType });
  }, [restored, product, writingType]);

  function chooseProduct(next: ProductTier) {
    setProduct(next);
    // 새 상품에 없는 유형(QUICK의 '처음부터')은 그 상품의 첫 유형으로.
    if (!WRITING_TYPES[next].some((type) => type.id === writingType)) setWritingType(WRITING_TYPES[next][0].id);
  }

  const types = WRITING_TYPES[product];
  const activeType = types.find((type) => type.id === writingType) ?? types[0];

  return <div className={installedApp ? `${styles.shell} ${styles.shellInstalled}` : styles.shell}>
    <header className={styles.top}>
      <div className={styles.brandRow}>
        {/* 설치 앱에서만 TWA 표시를 붙입니다. 일반 웹 손님에게 붙으면 앱으로 오인돼 Polar 결제가 막힙니다. */}
        <Link href={installedApp ? "/?source=twa" : "/"} className={styles.brand} aria-label="MOOA Resume 홈으로"><b>MOOA</b> Resume</Link>
        <Link href="/guide" className={styles.help}>이용 안내</Link>
      </div>
      <div className={styles.products} role="tablist" aria-label="상품 선택">
        {(["QUICK", "PRO", "FINAL"] as ProductTier[]).map((tier) => {
          const locked = tier === "FINAL" && !finalOpen;
          return <button
            key={tier}
            type="button"
            role="tab"
            aria-selected={product === tier}
            aria-disabled={locked}
            className={product === tier ? styles.productOn : styles.product}
            onClick={() => { if (!locked) chooseProduct(tier); }}
          >
            <b>{PRODUCT_LABEL[tier]}</b>
            <small>{locked ? "준비 중" : `${PRODUCT_PRICE[tier].toLocaleString()}원`}</small>
          </button>;
        })}
      </div>
      <div className={`${styles.types} ${types.length === 2 ? styles.typesTwo : ""}`} role="tablist" aria-label="작성 유형 선택">
        {types.map((type) => <button
          key={type.id}
          type="button"
          role="tab"
          aria-selected={writingType === type.id}
          className={writingType === type.id ? styles.typeOn : styles.type}
          onClick={() => setWritingType(type.id)}
        >{type.label}</button>)}
      </div>
      {/* 상품 설명과 유형 설명을 나란히 쓰면 같은 말이 두 번 나옵니다("공고·
          이력서까지 함께 읽고 첨삭 · 공고·이력서와 함께 읽고..."). 유형 설명이
          이미 상품별로 다르므로 그것만 둡니다. */}
      <p className={styles.summary}>{activeType.hint}</p>
    </header>

    <div className={styles.body}>
      {product === "QUICK" && <QuickInputPage variant="app"/>}
      {product !== "QUICK" && writingType !== "CREATE" && <ProInputPage mode={writingType} product={product} variant="app"/>}
      {product !== "QUICK" && writingType === "CREATE" && <div className={styles.createCard}>
        <ListOrdered/>
        <div>
          <b>쓸 내용이 아직 없을 때</b>
          <p>공고·자료·경험을 순서대로 하나씩 물어보고 초안을 만듭니다. 중간에 나가도 다시 이어서 할 수 있습니다.</p>
        </div>
        <Link href={product === "FINAL" ? "/final/create" : "/pro/create"} className={styles.createGo}>
          문답으로 시작하기 <ArrowRight/>
        </Link>
      </div>}
    </div>

    <p className={styles.privacy}>
      <LockKeyhole/>
      <span>입력한 내용은 저장·결제 화면에서 확인한 뒤에만 서버로 보냅니다. 화면을 옮겨도 이 기기에 남아 있습니다.</span>
    </p>
  </div>;
}
