"use client";

import Link from "next/link";
import { Tag, X } from "lucide-react";
import { useState } from "react";
import { getRuntimeLink, useRuntimeBanner, useRuntimeFlag } from "@/lib/live-sub-runtime";
import styles from "./launch-price-banner.module.css";

const dismissKey = "mooa-launch-price-banner-dismissed-v1";

export function LaunchPriceBanner() {
  const [visible, setVisible] = useState(true);
  const enabled = useRuntimeFlag("launchPriceBanner", true);
  const banner = useRuntimeBanner("home_launch_price");
  const defaultCopy = {
    eyebrow: "런칭 기념 특별가",
    description: "전문가 1:1 자소서 첨삭 대비 최대 10배 낮은 가격으로 시작하세요.",
    ctaLabel: "QUICK 5,900원 · PRO 12,900원",
  };
  const eyebrow = banner?.eyebrow ?? defaultCopy.eyebrow;
  const description = [banner?.title, banner?.description].filter(Boolean).join(" · ") || defaultCopy.description;
  const ctaLabel = banner?.ctaLabel ?? defaultCopy.ctaLabel;
  const link = banner ? getRuntimeLink(banner.targetUrl, banner.linkType) : { href: "/#plans", external: false };

  if (!visible || !enabled) return null;
  return <aside className={styles.banner} aria-label="런칭 기념 특별가 안내">
    <div className={styles.inner}><div className={styles.copy}><Tag aria-hidden="true" /><span><b>{eyebrow}</b><em>{description}</em></span></div><div className={styles.action}>{link ? (link.external ? <a href={link.href} target="_blank" rel="noopener">{ctaLabel} <strong>→</strong></a> : <Link href={link.href}>{ctaLabel} <strong>→</strong></Link>) : <span className={styles.disabledAction}>{ctaLabel}</span>}<button type="button" aria-label="런칭 특별가 안내 닫기" onClick={() => { window.sessionStorage.setItem(dismissKey, "1"); setVisible(false); }}><X /></button></div></div><small>정식 가격 확정 또는 운영 상황에 따라 조기 종료될 수 있습니다.</small>
  </aside>;
}
