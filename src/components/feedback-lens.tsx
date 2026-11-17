"use client";

import { useEffect, useRef } from "react";
import styles from "./feedback-lens.module.css";

/*
 * "Glass lens" for the landing page.
 *
 * A round glass glides over a sample cover-letter paragraph. Three copies of the
 * paragraph sit inside the glass, each zoomed a little more and shown a little
 * closer to the rim, so the view bends outward like a convex lens. Inside the
 * glass the vague phrases light up; outside it the paragraph looks like a normal
 * paragraph. The glass chases the pointer on a soft spring and leans slightly
 * into its motion. Press to zoom in. With no pointer around it drifts.
 *
 * Ported from designbookmark.com/motion#db-glass-lens. The spring numbers are the
 * ones in that project's shared/tokens.css (--lens-follow, --lens-zoom,
 * --lens-zoom-press, --lens-size) and the Z spring from lens.js, unchanged, so
 * it moves the same way. Spring = [stiffness, damping].
 */
const LENS_FOLLOW: [number, number] = [180, 17]; // lens chasing the cursor, a little lazy
const LENS_ZOOM_SPRING: [number, number] = [260, 26];
const LENS_ZOOM = 1.7;
const LENS_ZOOM_PRESS = 2.4;
const LENS_SIZE = 150; // px
// l0 = whole glass, l1 = outer band, l2 = rim: each bends a bit more
const BEND = [1, 1.05, 1.12];

type Spring = { x: number; v: number; t: number; k: number; c: number };
const makeSpring = (x: number, [k, c]: [number, number], reduce: boolean): Spring => ({
  x, v: 0, t: x, k, c: reduce ? 2 * Math.sqrt(k) : c,
});
const step = (s: Spring, dt: number) => {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
};

// Fictional sample sentence for illustration, not a real applicant's text.
function Sample() {
  return (
    <p>
      저는 생산 현장에서 불량률을 줄이기 위해 <mark>열심히 노력했습니다.</mark> 팀원들과 협력하여 <mark>좋은 성과</mark>를
      냈고, 이 경험을 통해 <mark>많이 배웠습니다.</mark> 귀사에서도 최선을 다해 기여하겠습니다.
    </p>
  );
}

export function FeedbackLens() {
  const stageRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const copyRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const stage = stageRef.current, paper = paperRef.current, lens = lensRef.current, view = viewRef.current;
    if (!stage || !paper || !lens || !view) return;
    const copies = copyRefs.current.filter((c): c is HTMLDivElement => !!c);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const L = LENS_SIZE;
    lens.style.width = lens.style.height = L + "px";

    // Layout size of the stage. Reading offsetWidth (not the bounding rect) keeps
    // everything in the page's own pixels even though the app root is CSS-zoomed.
    let w = stage.offsetWidth, h = stage.offsetHeight;
    const X = makeSpring(w * 0.3, LENS_FOLLOW, reduce);
    const Y = makeSpring(h * 0.45, LENS_FOLLOW, reduce);
    const Z = makeSpring(LENS_ZOOM, LENS_ZOOM_SPRING, reduce);
    let px: number | null = null, py = 0, lastPointer = -1e9, clock = 0;

    const size = () => {
      w = stage.offsetWidth; h = stage.offsetHeight;
      // the copies must lay text out exactly like the real paragraph
      const pl = paper.offsetLeft, pt = paper.offsetTop;
      copies.forEach((c) => {
        c.style.width = paper.offsetWidth + "px";
        c.style.left = pl + "px";
        c.style.top = pt + "px";
      });
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(stage);

    const local = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const k = r.width ? w / r.width : 1;
      px = Math.max(0, Math.min(w, (e.clientX - r.left) * k));
      py = Math.max(0, Math.min(h, (e.clientY - r.top) * k));
      lastPointer = performance.now();
    };
    const onMove = (e: PointerEvent) => local(e);
    const onDown = (e: PointerEvent) => { local(e); Z.t = LENS_ZOOM_PRESS; };
    const onUp = () => { Z.t = LENS_ZOOM; };
    const onLeave = (e: PointerEvent) => { if (e.pointerType === "mouse") px = null; Z.t = LENS_ZOOM; };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("pointerleave", onLeave);

    const frame = (dt: number) => {
      clock += dt;
      const idle = px === null || performance.now() - lastPointer > 2500;
      if (idle) {
        if (reduce) { X.t = w * 0.3; Y.t = h * 0.45; }
        else {
          // a slow loop over the paragraph
          X.t = w / 2 + Math.cos(clock * 0.42) * w * 0.3;
          Y.t = h / 2 + Math.sin(clock * 0.84) * h * 0.16;
        }
      } else { X.t = px as number; Y.t = py; }
      step(X, dt); step(Y, dt); step(Z, dt);
    };
    const render = () => {
      const x = X.x, y = Y.x;
      // a hand-held glass leans a little into its motion; no squash
      const tilt = Math.max(-6, Math.min(6, X.v / 220));
      lens.style.transform = `translate(${(x - L / 2).toFixed(2)}px,${(y - L / 2).toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`;
      // line each copy up with the real paragraph, then zoom around the glass centre
      const ox = -(x - L / 2), oy = -(y - L / 2);
      copies.forEach((c, i) => {
        c.style.transformOrigin = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
        c.style.transform = `translate(${ox.toFixed(2)}px,${oy.toFixed(2)}px) scale(${(Z.x * (BEND[i] ?? 1)).toFixed(4)})`;
      });
      // undo the tilt inside so the text itself stays level
      view.style.transform = `rotate(${(-tilt).toFixed(2)}deg)`;
    };

    let raf = 0, last = performance.now(), visible = true;
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
      const sub = 4;
      for (let k = 0; k < sub; k++) frame(dt / sub);
      render();
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); else stop(); });
    io.observe(stage);
    const onVis = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener("visibilitychange", onVis);

    // first frame in place, then reveal (before this the glass is hidden so it never flashes at 0,0)
    render();
    lens.style.opacity = "1";
    start();

    return () => {
      stop(); io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section className={`container ${styles.section}`} aria-labelledby="feedback-lens-title">
      <div className={styles.head}>
        <span>SENTENCE LENS</span>
        <h2 id="feedback-lens-title">좋아 보이는 문장도,<br />확대하면 비어 있는 곳이 보입니다.</h2>
        <p>돋보기를 문장 위로 움직여 보세요. 읽는 사람이 “그래서 뭘 했는데?”라고 되물을 부분이 켜집니다.</p>
      </div>

      <div className={styles.stage} ref={stageRef}>
        <div className={styles.paper} ref={paperRef}><Sample /></div>
        <div className={styles.lens} ref={lensRef} aria-hidden="true">
          <div className={styles.view} ref={viewRef}>
            {BEND.map((_, i) => (
              <div key={i} className={`${styles.layer} ${styles["l" + i]}`}>
                <div className={styles.copy} ref={(el) => { copyRefs.current[i] = el; }}><Sample /></div>
              </div>
            ))}
          </div>
          <div className={styles.glass} />
        </div>
      </div>
      <small className={styles.note}>예시 문장입니다. 실제 지원자의 글이 아닙니다.</small>

      <ul className={styles.points}>
        <li><b>열심히 노력했습니다</b><span>무엇을 어떻게 했는지가 빠져 있어요.</span></li>
        <li><b>좋은 성과</b><span>숫자나 비교 기준이 없어 확인할 수 없어요.</span></li>
        <li><b>많이 배웠습니다</b><span>무엇을 배웠는지 말하지 않았어요.</span></li>
      </ul>
    </section>
  );
}
