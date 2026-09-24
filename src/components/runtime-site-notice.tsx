"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getRuntimeLink, useRuntimeFlag, useRuntimeMaintenance, useRuntimeNotices } from "@/lib/live-sub-runtime";
import { resolveMaintenance } from "@/lib/live-sub-runtime/maintenance";
import styles from "./runtime-site-notice.module.css";

const hiddenPathPrefixes = ["/analysis", "/analyze", "/quick", "/pro", "/final", "/result", "/feedback", "/begin", "/entry", "/start", "/app", "/meensoo"];
const dismissedKey = (id: string) => `livesub.runtime.notice-dismissed.v1.${id}`;
const seenKey = (id: string) => `livesub.runtime.notice-seen.v1.${id}`;

function isDismissed(id: string, showOnce: boolean): boolean {
  try {
    return window.localStorage.getItem(dismissedKey(id)) === "1" || (showOnce && window.localStorage.getItem(seenKey(id)) === "1");
  } catch {
    return false;
  }
}

export function RuntimeSiteNotice() {
  const pathname = usePathname();
  const enabled = useRuntimeFlag("siteNotice", true);
  const notices = useRuntimeNotices();
  const maintenance = useRuntimeMaintenance();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const isExcluded = hiddenPathPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const maintenanceActive = resolveMaintenance(maintenance, { pathname })?.mode === "full";
  const notice = !maintenanceActive && enabled ? notices.find((candidate) => candidate.id !== dismissed && !isDismissed(candidate.id, candidate.showOnce)) : null;

  useEffect(() => {
    if (!notice?.showOnce) return;
    try { window.localStorage.setItem(seenKey(notice.id), "1"); } catch {}
  }, [notice?.id, notice?.showOnce]);

  if (isExcluded || (!maintenanceActive && !notice)) return null;
  const activeNotice = notice!;
  const content = maintenanceActive ? { id: "maintenance", title: "서비스 안내", body: maintenance.message, dismissible: false, ctaLabel: undefined, link: null } : {
    id: activeNotice.id,
    title: activeNotice.title,
    body: activeNotice.body,
    dismissible: activeNotice.dismissible,
    ctaLabel: activeNotice.ctaLabel,
    link: getRuntimeLink(activeNotice.targetUrl, activeNotice.linkType),
  };
  const close = () => {
    try { window.localStorage.setItem(dismissedKey(content.id), "1"); } catch {}
    setDismissed(content.id);
  };

  return <aside className={styles.notice} aria-label="사이트 공지"><div className={styles.inner}><p><b>{content.title}</b><span>{content.body}</span></p>{content.link && (content.link.external ? <a href={content.link.href} target="_blank" rel="noopener">{content.ctaLabel ?? "자세히 보기"}</a> : <Link href={content.link.href}>{content.ctaLabel ?? "자세히 보기"}</Link>)}{content.dismissible && <button type="button" aria-label="공지 닫기" onClick={close}><X aria-hidden="true" /></button>}</div></aside>;
}
