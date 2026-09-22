"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Pause, Play, FileText, BriefcaseBusiness, FolderOpen, GraduationCap, Scale, BookOpen, Compass, MessagesSquare, type LucideIcon } from "lucide-react";
import { applicationDocuments } from "@/domain/application-document";
import styles from "./service-showcase.module.css";

const icons: Record<string, LucideIcon> = {
  resume: FileText, "cover-letter": FileText, "career-description": BriefcaseBusiness,
  "portfolio-note": FolderOpen, "study-plan": GraduationCap, "legal-case": Scale, academic: BookOpen,
};

const services = [
  ...applicationDocuments.map((document) => ({
    id: document.id,
    title: document.id === "legal-case" ? "나홀로소송" : document.label,
    description: document.summary,
    badge: document.status === "preview" ? "베타 준비 중" : document.status === "coming-soon" ? "준비 중" : document.badge === "무료" ? "무료 이용" : "이용 가능",
    href: document.status === "available" ? document.href : undefined,
    icon: icons[document.id] ?? FileText,
  })),
  { id: "career", title: "커리어 검사", description: "직업흥미·업무성향·직업가치로 나의 일하는 방향을 탐색하세요.", badge: "무료 · 베타", href: "/career", icon: Compass },
  { id: "interview-pro", title: "면접 PRO", description: "더 깊이 있는 면접 준비를 위한 서비스를 준비하고 있습니다.", badge: "준비 중", href: undefined, icon: MessagesSquare },
];

export function ServiceShowcase() {
  const trackRef = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const interaction = useRef({ hover: false, focus: false, touch: false, resumeAfter: 0 });

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      const track = trackRef.current;
      const state = interaction.current;
      if (!track || document.visibilityState === "hidden" || state.hover || state.focus || state.touch || Date.now() < state.resumeAfter || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = track.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      const end = track.scrollWidth - track.clientWidth;
      if (end <= 0) return;
      if (track.scrollLeft >= end - 2) {
        track.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const width = track.firstElementChild?.getBoundingClientRect().width ?? 280;
        track.scrollBy({ left: width + 24, behavior: "smooth" });
      }
    }, 4000);
    return () => window.clearInterval(timer);
  }, [paused]);

  function move(direction: number) {
    interaction.current.resumeAfter = Date.now() + 6000;
    const track = trackRef.current;
    if (!track) return;
    const width = track.firstElementChild?.getBoundingClientRect().width ?? 280;
    track.scrollBy({ left: direction * (width + 24), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  return (
    <section className={`container ${styles.showcase}`} aria-labelledby="service-showcase-title"
      onMouseEnter={() => { interaction.current.hover = true; }}
      onMouseLeave={() => { interaction.current.hover = false; }}
      onFocusCapture={() => { interaction.current.focus = true; }}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) interaction.current.focus = false; }}
      onTouchStart={() => { interaction.current.touch = true; }}
      onTouchEnd={() => { interaction.current.touch = false; interaction.current.resumeAfter = Date.now() + 6000; }}
      onTouchCancel={() => { interaction.current.touch = false; interaction.current.resumeAfter = Date.now() + 6000; }}>
      <div className={styles.heading}>
        <div><span>MOOA SERVICES</span><h2 id="service-showcase-title">당신의 다음 단계도,<br />무아와 함께.</h2><p>지금 이용할 서비스부터 새롭게 준비하는 서비스까지.</p></div>
        <div className={styles.controls}>
          <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? "자동 넘김 재생" : "자동 넘김 일시정지"} aria-controls="service-showcase-track">{paused ? <Play size={17} /> : <Pause size={17} />}</button>
          <button type="button" onClick={() => move(-1)} aria-label="이전 서비스 보기" aria-controls="service-showcase-track"><ArrowLeft size={20} /></button>
          <button type="button" onClick={() => move(1)} aria-label="다음 서비스 보기" aria-controls="service-showcase-track"><ArrowRight size={20} /></button>
        </div>
      </div>
      <ul id="service-showcase-track" ref={trackRef} className={styles.track} tabIndex={0} aria-label="서비스 목록, 좌우로 넘겨보세요">
        {services.map(({ id, title, description, badge, href, icon: Icon }, index) => {
          const content = <><div className={styles.cardTop}><span className={styles.icon}><Icon size={28} strokeWidth={1.5} aria-hidden="true" /></span><span className={styles.badge}>{badge}</span></div><div className={styles.cardCopy}><h3>{title}</h3><p>{description}</p></div><span className={styles.cardBottom}>{href ? "서비스 둘러보기" : "곧 만나요"}{href && <ArrowRight size={18} aria-hidden="true" />}</span></>;
          return <li key={id} className={styles.slide}>
            {href ? <Link href={href} className={styles.card} data-tone={index % 4}>{content}</Link> : <article className={styles.card} data-tone={index % 4}>{content}</article>}
          </li>;
        })}
      </ul>
      <p className={styles.hint}>자동으로 넘겨보거나, 직접 밀어 살펴보세요 <ArrowRight size={14} aria-hidden="true" /></p>
    </section>
  );
}
