"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./summary-marker-text.module.css";

type MarkerKind = "highlight" | "underline" | "circle" | "box" | "strike";

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
  const svgHeight = kind === "circle" || kind === "box" ? height + 18 : height + 8;
  const stroke = kind === "circle"
    ? `M7 ${svgHeight / 2} C5 3 ${width - 2} 2 ${width + 1} ${svgHeight / 2 - 1} C${width + 3} ${svgHeight - 3} 6 ${svgHeight - 1} 7 ${svgHeight / 2}`
    : kind === "box"
      ? `M5 5 Q${width / 2} 2 ${width + 1} 5 L${width + 2} ${svgHeight - 5} Q${width / 2} ${svgHeight - 1} 4 ${svgHeight - 4}Z`
      : kind === "strike"
        ? `M1 ${height * .54} Q${width * .32} ${height * .37} ${width * .55} ${height * .56} T${width - 1} ${height * .48}`
    : `M1 ${height - 2} Q${width * .32} ${height + 1} ${width * .55} ${height - 2} T${width - 1} ${height - 2}`;

  return <span className={`${styles.marker} ${styles[kind]}`} style={{ "--marker-delay": `${delay}ms` } as CSSProperties}>
    <span ref={textRef} className={styles.text}>{children}</span>
    {box.width > 0 && <svg aria-hidden="true" className={styles.svg} height={svgHeight} viewBox={`0 0 ${width + 4} ${svgHeight}`} width={width + 4}>
      {kind === "highlight" && <path className={styles.highlightPath} d={`M1 ${height * .17} Q${width * .36} ${height * .03} ${width - 1} ${height * .17} L${width - 1} ${height * .92} Q${width * .55} ${height * .78} 1 ${height * .92}Z`} />}
      {kind !== "highlight" && <path className={styles.linePath} d={stroke} />}
    </svg>}
  </span>;
}
