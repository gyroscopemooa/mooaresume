"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Menu, ReceiptText, X } from "lucide-react";
import styles from "./mobile-site-menu.module.css";
export function MobileSiteMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, [open]);
  return <div className={styles.root}><button className={styles.trigger} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-site-menu" aria-label={open ? "메뉴 닫기" : "메뉴 열기"}>{open ? <X /> : <Menu />}</button>{open ? <div id="mobile-site-menu" className={styles.panel}><div className={styles.top}><span>MOOA MENU</span><b>무엇을 도와드릴까요?</b></div><nav aria-label="모바일 주요 메뉴"><Link href="/career" onClick={() => setOpen(false)}><span><Compass />커리어 검사</span><ArrowRight /></Link><Link href="/#how" onClick={() => setOpen(false)}><span><BookOpen />이용 방법</span><ArrowRight /></Link><Link href="/#plans" onClick={() => setOpen(false)}><span><ReceiptText />요금 안내</span><ArrowRight /></Link></nav><Link href="/analyze" className={styles.cta} onClick={() => setOpen(false)}>무료로 지원서 진단하기 <ArrowRight /></Link></div> : null}</div>;
}