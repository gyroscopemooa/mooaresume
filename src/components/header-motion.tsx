"use client";

import { useEffect } from "react";

/** 스크롤하면 data-site-header 헤더에 data-scrolled를 달아 그림자·농도를 바꿉니다. */
export function HeaderMotion() {
  useEffect(() => {
    let frame = 0;
    const apply = () => {
      frame = 0;
      const scrolled = window.scrollY > 8;
      document.querySelectorAll<HTMLElement>("header[data-site-header]").forEach((header) => {
        header.dataset.scrolled = scrolled ? "true" : "false";
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(apply); };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);
  return null;
}
