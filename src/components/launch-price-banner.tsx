"use client";

import Link from "next/link";
import { getRuntimeLink, useRuntimeBanner, useRuntimeFlag } from "@/lib/live-sub-runtime";
import styles from "./launch-price-banner.module.css";

export function LaunchPriceBanner() {
  const enabled = useRuntimeFlag("launchPriceBanner", true);
  const banner = useRuntimeBanner("home_launch_price");
  const eyebrow = banner?.eyebrow ?? "11월 30일까지";
  const description = [banner?.title, banner?.description].filter(Boolean).join(" · ")
    || "11월 30일까지, 최대 10배 낮아진 가격으로 만나보세요.";
  const link = banner ? getRuntimeLink(banner.targetUrl, banner.linkType) : { href: "/#plans", external: false };

  const offer = <>
    <span className={styles.message}>{description}</span>
    <span className={styles.prices} aria-label="QUICK 9,900원, PRO 12,900원, FINAL 45,000원">
      <span><small>QUICK</small><b>9,900원</b></span><i aria-hidden="true" />
      <span><small>PRO</small><b>12,900원</b></span><i aria-hidden="true" />
      <span><small>FINAL</small><b>45,000원</b></span>
    </span>
  </>;

  if (!enabled) return null;
  return <aside className={styles.banner} aria-label="11월 30일까지 진행하는 특별 가격 안내">
    <div className={styles.inner}>
      <span className={styles.deadline}>{eyebrow}</span>
      <div className={styles.offer}>
        {link ? (link.external
          ? <a href={link.href} target="_blank" rel="noopener">{offer}<strong aria-hidden="true">→</strong></a>
          : <Link href={link.href}>{offer}<strong aria-hidden="true">→</strong></Link>)
          : <span className={styles.disabledAction}>{offer}</span>}
      </div>
    </div>
  </aside>;
}
