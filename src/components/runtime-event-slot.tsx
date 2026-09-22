"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { getRuntimeLink, useRuntimeEventCampaign, type RuntimeEventPlacement, type SelectedEventCampaign } from "@/lib/live-sub-runtime";
import styles from "./runtime-event-slot.module.css";

const slotTrigger: Record<RuntimeEventPlacement, "page_load" | "result_rendered"> = { home_modal: "page_load", home_banner: "page_load", result_top_banner: "result_rendered", result_bottom_cta: "result_rendered", pricing_banner: "page_load", announcement_bar: "page_load", my_page_entry: "page_load" };
function storageFor(mode: SelectedEventCampaign["campaign"]["frequency"]["mode"]): Storage | null { try { return mode === "per_session" ? window.sessionStorage : window.localStorage; } catch { return null; } }
function impressionKey(selected: SelectedEventCampaign): string {
  const { mode } = selected.campaign.frequency;
  const suffix = mode === "daily" ? new Date().toISOString().slice(0, 10) : mode === "every_3_days" ? String(Math.floor(Date.now() / (3 * 86_400_000))) : "v1";
  return `livesub.runtime.campaign-impression.${selected.campaign.id}.${selected.placement}.${suffix}`;
}
function closeKey(selected: SelectedEventCampaign) { return `livesub.runtime.campaign-closed.${selected.campaign.id}.${selected.placement}`; }
function frequencyReached(selected: SelectedEventCampaign) {
  try {
    const closedAt = Number(window.localStorage.getItem(closeKey(selected)));
    const hideMs = (selected.campaign.frequency.hideDaysAfterClose ?? 0) * 86_400_000;
    return (closedAt > 0 && Date.now() < closedAt + hideMs)
      || storageFor(selected.campaign.frequency.mode)?.getItem(impressionKey(selected)) === "1";
  } catch { return false; }
}
function recordImpression(selected: SelectedEventCampaign) { try { storageFor(selected.campaign.frequency.mode)?.setItem(impressionKey(selected), "1"); } catch {} }

function EventAction({ selected }: { selected: SelectedEventCampaign }) {
  const link = getRuntimeLink(selected.content.linkUrl, selected.campaign.linkType);
  if (!link) return null;
  const label = selected.content.buttonText ?? "이벤트 보기";
  return link.external ? <a className={styles.action} href={link.href} target="_blank" rel="noopener">{label} <span aria-hidden="true">→</span></a> : <Link className={styles.action} href={link.href}>{label} <span aria-hidden="true">→</span></Link>;
}

function EventCard({ selected, onDismiss }: { selected: SelectedEventCampaign; onDismiss: () => void }) {
  const [imageBroken, setImageBroken] = useState(false);
  const { content, config } = selected;
  return <article className={styles.card} data-layout={config.layout ?? "card"}>
    {config.showCloseButton !== false && <button type="button" className={styles.close} aria-label={`${content.title} 닫기`} onClick={onDismiss}><X aria-hidden="true" /></button>}
    {/* HQ controls HTTPS URLs at runtime, so Next's build-time image allowlist cannot optimize it safely. */}
    {content.imageUrl && !imageBroken && <img className={styles.image} src={content.imageUrl} alt={content.title} onError={() => setImageBroken(true)} /* eslint-disable-line @next/next/no-img-element */ />}
    <div className={styles.copy}>
      {content.badgeText && <small>{content.badgeText}</small>}
      <h2>{content.title}</h2>{content.body && <p>{content.body}</p>}
      <EventAction selected={selected} />
      {content.secondaryButtonText && <button type="button" onClick={onDismiss}>{content.secondaryButtonText}</button>}
    </div>
  </article>;
}

export function RuntimeEventSlot({ slot, sample = false }: { slot: RuntimeEventPlacement; sample?: boolean }) {
  const selected = useRuntimeEventCampaign(slot);
  const key = selected ? `${selected.campaign.id}:${slot}` : null;
  const [shownKey, setShownKey] = useState<string | null>(null);
  // The same render that records an impression must remain visible; the
  // stored marker blocks only a later mount/page visit.
  const frequencyBlocked = selected ? frequencyReached(selected) && shownKey !== key : true;
  const triggerSupported = selected ? !selected.config.triggerEvent || selected.config.triggerEvent === slotTrigger[slot] : false;

  useEffect(() => {
    if (!selected || !key || sample || frequencyBlocked || !triggerSupported) return;
    let delayElapsed = false;
    let displayed = false;
    const showWhenReady = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const percent = scrollable > 0 ? window.scrollY / scrollable * 100 : 100;
      if (!delayElapsed || displayed || percent < (selected.config.scrollTriggerPercent ?? 0)) return;
      displayed = true;
      recordImpression(selected);
      setShownKey(key);
    };
    const timeout = window.setTimeout(() => { delayElapsed = true; showWhenReady(); }, selected.config.delayMs ?? 0);
    window.addEventListener("scroll", showWhenReady, { passive: true });
    window.addEventListener("resize", showWhenReady);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("scroll", showWhenReady);
      window.removeEventListener("resize", showWhenReady);
    };
  }, [frequencyBlocked, key, sample, selected, triggerSupported]);

  if (!selected || sample || shownKey !== key || frequencyBlocked || !triggerSupported) return null;
  const dismiss = () => {
    try { window.localStorage.setItem(closeKey(selected), String(Date.now())); } catch {}
    setShownKey(null);
  };
  const style = selected.config.maxWidth ? ({ "--event-max-width": `${selected.config.maxWidth}px` } as CSSProperties) : undefined;
  if (slot === "home_modal") return <div className={styles.backdrop} role="presentation"><div className={styles.modal} role="dialog" aria-modal="true" aria-label={selected.content.title} style={style}><EventCard selected={selected} onDismiss={dismiss} /></div></div>;
  return <div className={`${styles.slot} ${styles[slot]}`} style={style}><EventCard selected={selected} onDismiss={dismiss} /></div>;
}
