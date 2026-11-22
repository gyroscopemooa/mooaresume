"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./summary-marker-text.module.css";

type MarkerKind = "highlight" | "underline" | "circle";

type SummaryMarkerTextProps = {
  children: string;
  kind?: MarkerKind;
  delay?: number;
};

/**
 * Small, dependency-free marker treatment used only in the summary experiment.
 * It measures the real text rather than guessing its width, so Korean wrapping
 * and user font settings remain safe. Inspired by Kokonut UI's MIT MarkerText.
 */
export function SummaryMarkerText({ children, kind = "highlight", delay = 0 }: SummaryMarkerTextProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const element = textRef.current;
    if (!element) return;
    const measure = () => setBox({ width: element.offsetWidth, height: element.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [children]);

  const width = Math.max(1, box.width);
  const height = Math.max(1, box.height);
  const stroke = kind === "circle"
    ? `M3 ${height * .52} C2 2 ${width - 3} 1 ${width - 2} ${height * .48} C${width + 2} ${height - 1} 4 ${height + 2} 3 ${height * .52}`
    : `M1 ${height - 2} Q${width * .32} ${height + 1} ${width * .55} ${height - 2} T${width - 1} ${height - 2}`;

  return <span className={`${styles.marker} ${styles[kind]}`} style={{ "--marker-delay": `${delay}ms` } as CSSProperties}>
    <span ref={textRef} className={styles.text}>{children}</span>
    {box.width > 0 && <svg aria-hidden="true" className={styles.svg} height={height + 8} viewBox={`0 0 ${width + 4} ${height + 8}`} width={width + 4}>
      {kind === "highlight" && <path className={styles.highlightPath} d={`M1 ${height * .17} Q${width * .36} ${height * .03} ${width - 1} ${height * .17} L${width - 1} ${height * .92} Q${width * .55} ${height * .78} 1 ${height * .92}Z`} />}
      {kind !== "highlight" && <path className={styles.linePath} d={stroke} />}
    </svg>}
  </span>;
}
