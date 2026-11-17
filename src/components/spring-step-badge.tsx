"use client";

import { useEffect, useRef } from "react";

/**
 * Step badge for the wizard sidebar, moved by real springs instead of CSS
 * curves. Stiffness/damping come from designbookmark.com's motion tokens:
 * --spring-pop 520/16 (the badge bounces when a step is completed) and
 * --spring-fade 420/32 (the check mark draws itself in). Integrates with
 * semi-implicit Euler at a fixed step so it behaves the same on any refresh rate.
 */
const POP = { k: 520, c: 16 };
const FADE = { k: 420, c: 32 };
const CHECK_LENGTH = 16;

type Spring = { x: number; v: number; target: number };

export function SpringStepBadge({ number, done }: { number: number; done: boolean }) {
  const root = useRef<HTMLSpanElement>(null);
  const check = useRef<SVGPathElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const scale = useRef<Spring>({ x: 1, v: 0, target: 1 });
  const draw = useRef<Spring>({ x: done ? 1 : 0, v: 0, target: done ? 1 : 0 });
  const first = useRef(true);
  const frame = useRef(0);

  function paint() {
    if (root.current) root.current.style.transform = `scale(${scale.current.x.toFixed(4)})`;
    const p = Math.min(Math.max(draw.current.x, 0), 1);
    if (check.current) check.current.style.strokeDashoffset = String(CHECK_LENGTH * (1 - p));
    if (label.current) label.current.style.opacity = String(1 - p);
    if (check.current) check.current.style.opacity = String(Math.min(1, p * 3));
  }

  function run() {
    if (frame.current) return;
    let last = performance.now();
    const tick = (now: number) => {
      let dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      let moving = false;
      while (dt > 0) {
        const step = Math.min(dt, 1 / 240);
        dt -= step;
        for (const [s, p] of [[scale.current, POP], [draw.current, FADE]] as const) {
          const a = -p.k * (s.x - s.target) - p.c * s.v;
          s.v += a * step;
          s.x += s.v * step;
        }
      }
      for (const s of [scale.current, draw.current]) {
        if (Math.abs(s.x - s.target) > 0.0005 || Math.abs(s.v) > 0.0005) moving = true;
        else { s.x = s.target; s.v = 0; }
      }
      paint();
      frame.current = moving ? requestAnimationFrame(tick) : 0;
    };
    frame.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    draw.current.target = done ? 1 : 0;
    if (first.current) {
      first.current = false;
      paint();
      return;
    }
    if (reduce) {
      draw.current.x = draw.current.target;
      paint();
      return;
    }
    // Completing a step: squash the badge small, then let the spring overshoot.
    if (done) { scale.current.x = 0.7; scale.current.v = 0; }
    run();
  }, [done]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <span ref={root} style={{ display: "inline-grid", placeItems: "center", position: "relative" }}>
      <i ref={label} style={{ gridArea: "1/1", fontStyle: "normal" }}>{number}</i>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ gridArea: "1/1" }} aria-hidden="true">
        <path ref={check} d="M5 12.5l4.5 4.5L19 7.5" pathLength={CHECK_LENGTH} strokeDasharray={CHECK_LENGTH} strokeDashoffset={done ? 0 : CHECK_LENGTH} />
      </svg>
    </span>
  );
}
