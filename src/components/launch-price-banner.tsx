"use client";

import Link from "next/link";
import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import styles from "./launch-price-banner.module.css";

const dismissKey = "mooa-launch-price-banner-dismissed-v1";

export function LaunchPriceBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return <aside className={styles.banner} aria-label="런칭 기념 특별가 안내">
    <div className={styles.inner}><div className={styles.copy}><Sparkles aria-hidden="true" /><span><b>런칭 기념 특별가</b><em>전문가 1:1 자소서 첨삭 대비 최대 10배 낮은 가격으로 시작하세요.</em></span></div><div className={styles.action}><Link href="/#plans">QUICK 5,900원 · PRO 12,900원 <strong>→</strong></Link><button type="button" aria-label="런칭 특별가 안내 닫기" onClick={() => { window.sessionStorage.setItem(dismissKey, "1"); setVisible(false); }}><X /></button></div></div><small>정식 가격 확정 또는 운영 상황에 따라 조기 종료될 수 있습니다.</small>
  </aside>;
}
