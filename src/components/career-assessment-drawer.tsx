"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Compass, X } from "lucide-react";
import { CareerAssessmentCatalog } from "./career-assessment-catalog";
import styles from "./career-assessment-drawer.module.css";
export function CareerAssessmentDrawer() {
  const [open, setOpen] = useState(true);
  // 화면 왼쪽 가장자리를 입사지원 서류 드로어와 함께 씁니다
  // (application-docs-drawer.tsx). 둘이 동시에 펼쳐지면 앞의 것이 뒤의 것을
  // 통째로 덮으므로, 그쪽이 열렸다고 알리면 이쪽은 접습니다.
  useEffect(() => { const onOtherDrawerOpen = (event: Event) => { if ((event as CustomEvent<string>).detail !== "career-assessment") setOpen(false); }; window.addEventListener("mooa:drawer-open", onOtherDrawerOpen); return () => window.removeEventListener("mooa:drawer-open", onOtherDrawerOpen); }, []);
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("keydown", onKeyDown); return () => document.removeEventListener("keydown", onKeyDown); }, [open]);
  if (!open) return <button className={styles.reopen} type="button" onClick={() => setOpen(true)} aria-label="커리어 검사 목록 열기"><Compass /><span>커리어<br />검사</span><ChevronLeft /></button>;
  return <section className={styles.layer} aria-label="커리어 검사 목록"><aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby="career-drawer-title"><button className={styles.edgeToggle} type="button" onClick={() => setOpen(false)} aria-label="검사 목록 접기"><ChevronRight /></button><header className={styles.drawerHead}><div><small>FREE CAREER EXPLORATION</small><b id="career-drawer-title">커리어 검사 목록</b></div><div className={styles.actions}><button type="button" onClick={() => setOpen(false)} aria-label="검사 목록 닫기"><X /></button></div></header><div className={styles.content}><CareerAssessmentCatalog variant="drawer" /></div></aside></section>;
}