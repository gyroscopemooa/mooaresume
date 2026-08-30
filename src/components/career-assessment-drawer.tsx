"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, X } from "lucide-react";
import { CareerAssessmentCatalog } from "./career-assessment-catalog";
import styles from "./career-assessment-drawer.module.css";
export function CareerAssessmentDrawer() {
  // Closed on arrival.
  //
  // The drawer is left-anchored and 50vw wide, which on this home lands on top
  // of the hero and the paste box — elementFromPoint over the textarea returned
  // the catalog, so the one thing the page exists for could not be typed into.
  // It is also aria-modal, so it opened claiming the whole screen before the
  // visitor had seen anything.
  //
  // Career exploration is a second door, not the front one. The edge tab still
  // offers it, and the header menu carries it on phones where this is hidden.
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("keydown", onKeyDown); return () => document.removeEventListener("keydown", onKeyDown); }, [open]);
  if (!open) return <button className={styles.reopen} type="button" onClick={() => setOpen(true)} aria-label="커리어 검사 목록 열기"><Compass /><span>커리어<br />검사</span><ChevronLeft /></button>;
  return <section className={styles.layer} aria-label="커리어 검사 목록"><aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="career-drawer-title"><button className={styles.edgeToggle} type="button" onClick={() => setOpen(false)} aria-label="검사 목록 접기"><ChevronRight /></button><header className={styles.drawerHead}><div><small>FREE CAREER EXPLORATION</small><b id="career-drawer-title">커리어 검사 목록</b></div><div className={styles.actions}><button type="button" onClick={() => setOpen(false)} aria-label="검사 목록 닫기"><X /></button></div></header><div className={styles.content}><CareerAssessmentCatalog /></div></aside></section>;
}