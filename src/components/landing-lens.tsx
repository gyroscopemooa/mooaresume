"use client";

import { useEffect, useRef } from "react";
import styles from "./landing-lens.module.css";

/*
 * Glass lens over the whole landing page.
 *
 * A round glass follows the mouse everywhere on the page and magnifies whatever
 * is under it. Three copies of the page sit inside the glass, each zoomed a
 * little more and shown a little closer to the rim, so the view bends outward
 * like a convex lens. The glass chases the pointer on a soft spring and leans a
 * little into its motion. Press to zoom in. Phrases marked data-lens-mark light
 * up inside the glass only.
 *
 * Ported from designbookmark.com/motion#db-glass-lens. Spring numbers are that
 * project's shared/tokens.css values (--lens-follow 180/17, --lens-zoom 1.7,
 * --lens-zoom-press 2.4, --lens-size 150) and the zoom spring from lens.js
 * (260/26), unchanged. Spring = [stiffness, damping].
 *
 * Mouse only: on touch screens a floating glass would fight with scrolling, so
 * it is not mounted there. It is rendered inside .home-page, whose zoom cancels
 * the app's body zoom, so pointer coordinates and layout pixels are the same.
 */
const LENS_FOLLOW: [number, number] = [180, 17];
const LENS_ZOOM_SPRING: [number, number] = [260, 26];
const LENS_ZOOM = 1.7;
const LENS_ZOOM_PRESS = 2.4;
const LENS_SIZE = 150;
const BEND = [1, 1.05, 1.12]; // whole glass, outer band, rim: each bends a bit more

type Spring = { x: number; v: number; t: number; k: number; c: number };
const makeSpring = (x: number, [k, c]: [number, number], reduce: boolean): Spring => ({
  x, v: 0, t: x, k, c: reduce ? 2 * Math.sqrt(k) : c,
});
const step = (s: Spring, dt: number) => {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
};

export function LandingLens() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const holdRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current, lens = lensRef.current, view = viewRef.current;
    const main = root?.closest("main") as HTMLElement | null;
    if (!root || !lens || !view || !main) return;
    // a mouse and room for a glass; never on touch screens
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const holds = holdRefs.current.filter((h): h is HTMLDivElement => !!h);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const L = LENS_SIZE;
    lens.style.width = lens.style.height = L + "px";

    // ---- copies of the page ------------------------------------------------
    // The copy is made on the first mouse move and rebuilt when the page changes size (images, fonts, client
    // components that mount late), at most once every 600 ms.
    const build = () => {
      const w = main.offsetWidth;
      holds.forEach((hold) => {
        hold.replaceChildren();
        const wrap = document.createElement("div");
        wrap.className = "home-page " + styles.clone;
        wrap.style.width = w + "px";
        wrap.setAttribute("aria-hidden", "true");
        wrap.setAttribute("inert", "");
        Array.from(main.children).forEach((child) => {
          if (child === root) return;
          const c = child.cloneNode(true) as HTMLElement;
          c.querySelectorAll("script,video,iframe,canvas,[id]").forEach((n) => {
            if (n.tagName === "SCRIPT" || n.tagName === "VIDEO" || n.tagName === "IFRAME" || n.tagName === "CANVAS") n.remove();
            else n.removeAttribute("id");
          });
          if (c.tagName !== "SCRIPT") wrap.appendChild(c);
        });
        hold.appendChild(wrap);
      });
    };
    // Nothing is copied until the mouse first moves, so the page loads, hydrates
    // and gets crawled exactly as before; the copies only exist for real mouse users.
    let built = false, buildTimer = 0;
    const scheduleBuild = () => { if (!built) return; window.clearTimeout(buildTimer); buildTimer = window.setTimeout(build, 600); };
    const ro = new ResizeObserver(scheduleBuild);
    ro.observe(main);
    window.addEventListener("load", scheduleBuild);

    // ---- springs ------------------------------------------------------------
    const X = makeSpring(innerWidth / 2, LENS_FOLLOW, reduce);
    const Y = makeSpring(innerHeight / 2, LENS_FOLLOW, reduce);
    const Z = makeSpring(LENS_ZOOM, LENS_ZOOM_SPRING, reduce);
    let px = -1, py = -1, inside = false;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!built) { built = true; build(); }
      if (!inside) { inside = true; X.x = X.t = e.clientX; Y.x = Y.t = e.clientY; lens.style.opacity = "1"; }
      px = e.clientX; py = e.clientY;
    };
    const onDown = (e: PointerEvent) => { if (e.pointerType === "mouse") Z.t = LENS_ZOOM_PRESS; };
    const onUp = () => { Z.t = LENS_ZOOM; };
    const onLeave = () => { inside = false; lens.style.opacity = "0"; Z.t = LENS_ZOOM; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    const frame = (dt: number) => { X.t = px; Y.t = py; step(X, dt); step(Y, dt); step(Z, dt); };
    const render = () => {
      const x = X.x, y = Y.x;
      const tilt = Math.max(-6, Math.min(6, X.v / 220)); // a hand-held glass leans into its motion; no squash
      lens.style.transform = `translate(${(x - L / 2).toFixed(2)}px,${(y - L / 2).toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`;
      // line each copy up with the real page, then zoom around the glass centre
      const r = main.getBoundingClientRect();
      const ox = r.left - (x - L / 2), oy = r.top - (y - L / 2);
      const origin = `${(x - r.left).toFixed(2)}px ${(y - r.top).toFixed(2)}px`;
      holds.forEach((hold, i) => {
        hold.style.transformOrigin = origin;
        hold.style.transform = `translate(${ox.toFixed(2)}px,${oy.toFixed(2)}px) scale(${(Z.x * (BEND[i] ?? 1)).toFixed(4)})`;
      });
      view.style.transform = `rotate(${(-tilt).toFixed(2)}deg)`; // keep the page itself level inside
    };

    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30); last = now;
      if (inside || lens.style.opacity === "1") {
        for (let k = 0; k < 4; k++) frame(dt / 4);
        render();
      }
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    const onVis = () => { if (document.hidden) stop(); else start(); };
    document.addEventListener("visibilitychange", onVis);
    start();

    return () => {
      stop(); ro.disconnect(); window.clearTimeout(buildTimer);
      window.removeEventListener("load", scheduleBuild);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("blur", onLeave);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      holds.forEach((h) => h.replaceChildren());
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.root} aria-hidden="true">
      <div ref={lensRef} className={styles.lens}>
        <div ref={viewRef} className={styles.view}>
          {BEND.map((_, i) => (
            <div key={i} className={`${styles.layer} ${styles["l" + i]}`}>
              <div className={styles.hold} ref={(el) => { holdRefs.current[i] = el; }} />
            </div>
          ))}
        </div>
        <div className={styles.glass} />
      </div>
    </div>
  );
}
