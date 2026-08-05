import React, { useEffect, useRef } from "react";

/**
 * The background *is* a game of Skribbl.
 *
 * An invisible player sketches a scene stroke by stroke — hills, a tree, a
 * house, the sun — holds it for a beat, then wipes it away with an eraser and
 * starts the next one. On top of that, the pointer leaves a fading ink trail,
 * so moving the mouse (or dragging a finger) feels like drawing on the page.
 *
 * Everything is normalised 0..1 and mapped to the viewport, so the same scene
 * composes correctly on a phone, a tablet and a desktop.
 *
 * Perf: one canvas, one rAF loop, DPR capped at 2, paused when the tab is
 * hidden, and disabled entirely for prefers-reduced-motion.
 */

type Pt = [number, number];
interface Stroke {
  pts: Pt[];
  color: string;
  width: number;
}

const GREEN = "#4ade80";
const GREEN_DEEP = "#2f9e5f";
const BROWN = "#b45309";
const SUN = "#fbbf24";
const SKY = "#60a5fa";
const RED = "#e94560";
const PINK = "#f472b6";
const PURPLE = "#a78bfa";

// ── geometry helpers (all in 0..1 space) ──────────────────────────────────

const line = (x1: number, y1: number, x2: number, y2: number): Pt[] => {
  const out: Pt[] = [];
  const n = 10;
  for (let i = 0; i <= n; i++)
    out.push([x1 + ((x2 - x1) * i) / n, y1 + ((y2 - y1) * i) / n]);
  return out;
};

const poly = (...pts: Pt[]): Pt[] => {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    out.push(...line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  }
  return out;
};

const arc = (
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
  ry = r,
): Pt[] => {
  const out: Pt[] = [];
  const n = Math.max(12, Math.round((Math.abs(a1 - a0) / (Math.PI * 2)) * 44));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * ry]);
  }
  return out;
};

const circle = (cx: number, cy: number, r: number, ry = r): Pt[] =>
  arc(cx, cy, r, 0, Math.PI * 2, ry);

const s = (pts: Pt[], color: string, width = 3): Stroke => ({
  pts,
  color,
  width,
});

// ── the scenes ────────────────────────────────────────────────────────────
// Ordered the way a person would actually draw them: big shapes first,
// details last.

function countryside(): Stroke[] {
  return [
    // rolling hills
    s(arc(0.28, 0.98, 0.36, Math.PI, Math.PI * 2, 0.2), GREEN_DEEP, 3),
    s(arc(0.74, 1.0, 0.34, Math.PI, Math.PI * 2, 0.17), GREEN, 3),
    s(line(0, 0.86, 1, 0.86), GREEN_DEEP, 2),
    // sun + rays
    s(circle(0.84, 0.18, 0.055), SUN, 3),
    ...[0, 1, 2, 3, 4, 5].map((i) => {
      const a = (i / 6) * Math.PI * 2;
      return s(
        line(
          0.84 + Math.cos(a) * 0.075,
          0.18 + Math.sin(a) * 0.075,
          0.84 + Math.cos(a) * 0.105,
          0.18 + Math.sin(a) * 0.105,
        ),
        SUN,
        2.5,
      );
    }),
    // tree
    s(poly([0.2, 0.86], [0.2, 0.66]), BROWN, 4),
    s(circle(0.2, 0.6, 0.075, 0.07), GREEN, 3),
    s(circle(0.155, 0.64, 0.045, 0.042), GREEN_DEEP, 2.5),
    s(circle(0.245, 0.645, 0.04, 0.038), GREEN_DEEP, 2.5),
    // house
    s(poly([0.5, 0.86], [0.5, 0.72], [0.64, 0.72], [0.64, 0.86], [0.5, 0.86]), RED, 3),
    s(poly([0.48, 0.72], [0.57, 0.63], [0.66, 0.72]), RED, 3),
    s(poly([0.545, 0.86], [0.545, 0.79], [0.585, 0.79], [0.585, 0.86]), BROWN, 2.5),
    s(poly([0.605, 0.75], [0.605, 0.78], [0.63, 0.78], [0.63, 0.75], [0.605, 0.75]), SKY, 2),
    // cloud
    s(arc(0.32, 0.2, 0.05, Math.PI, Math.PI * 2, 0.035), "#cbd5e1", 2.5),
    s(arc(0.39, 0.205, 0.04, Math.PI, Math.PI * 2, 0.03), "#cbd5e1", 2.5),
    s(line(0.27, 0.2, 0.43, 0.205), "#cbd5e1", 2.5),
    // birds
    s(poly([0.58, 0.24], [0.605, 0.22], [0.63, 0.24]), "#cbd5e1", 2.5),
    s(poly([0.64, 0.3], [0.665, 0.28], [0.69, 0.3]), "#cbd5e1", 2.5),
    // grass tufts
    ...[0.08, 0.35, 0.44, 0.72, 0.88].map((x) =>
      s(poly([x, 0.86], [x + 0.012, 0.825], [x + 0.024, 0.86]), GREEN, 2),
    ),
  ];
}

function garden(): Stroke[] {
  const flower = (cx: number, cy: number, c: string, r: number): Stroke[] => [
    s(poly([cx, 0.9], [cx, cy + r * 1.2]), GREEN_DEEP, 3),
    ...[0, 1, 2, 3, 4].map((i) => {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      return s(
        circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.1, r * 0.62, r * 0.6),
        c,
        2.5,
      );
    }),
    s(circle(cx, cy, r * 0.4, r * 0.38), SUN, 2.5),
    s(circle(cx + r * 1.5, cy + r * 2.4, r * 0.7, r * 0.35), GREEN, 2.5),
  ];
  return [
    s(line(0, 0.9, 1, 0.9), GREEN_DEEP, 3),
    ...flower(0.22, 0.55, RED, 0.055),
    ...flower(0.45, 0.62, SUN, 0.048),
    ...flower(0.68, 0.52, PINK, 0.058),
    ...flower(0.86, 0.64, PURPLE, 0.045),
    // butterfly
    s(circle(0.35, 0.3, 0.03, 0.038), PINK, 2.5),
    s(circle(0.41, 0.3, 0.03, 0.038), PINK, 2.5),
    s(line(0.38, 0.28, 0.38, 0.34), "#cbd5e1", 2.5),
    // sun
    s(arc(0.06, 0.06, 0.09, 0, Math.PI / 2), SUN, 3),
    // grass
    ...[0.05, 0.14, 0.3, 0.55, 0.78, 0.94].map((x) =>
      s(poly([x, 0.9], [x + 0.014, 0.855], [x + 0.028, 0.9]), GREEN, 2),
    ),
  ];
}

function mountains(): Stroke[] {
  return [
    s(poly([0.02, 0.72], [0.24, 0.3], [0.46, 0.72]), "#94a3b8", 3),
    s(poly([0.17, 0.44], [0.24, 0.3], [0.31, 0.44], [0.26, 0.42], [0.21, 0.46]), "#e2e8f0", 2.5),
    s(poly([0.36, 0.72], [0.58, 0.36], [0.8, 0.72]), "#64748b", 3),
    s(poly([0.51, 0.49], [0.58, 0.36], [0.65, 0.49]), "#e2e8f0", 2.5),
    s(line(0, 0.72, 1, 0.72), GREEN_DEEP, 3),
    // lake
    s(arc(0.62, 0.86, 0.26, Math.PI, Math.PI * 2, 0.09), SKY, 3),
    ...[0.5, 0.62, 0.74].map((x, i) =>
      s(line(x - 0.05, 0.88 + i * 0.025, x + 0.05, 0.88 + i * 0.025), SKY, 2),
    ),
    // pines
    ...[0.1, 0.2, 0.3].map((x) => [
      s(poly([x, 0.86], [x, 0.78]), BROWN, 3),
      s(poly([x - 0.045, 0.78], [x, 0.66], [x + 0.045, 0.78], [x - 0.045, 0.78]), GREEN, 3),
    ]).flat(),
    // sun + birds
    s(circle(0.86, 0.16, 0.05), SUN, 3),
    s(poly([0.4, 0.2], [0.425, 0.18], [0.45, 0.2]), "#cbd5e1", 2.5),
    s(poly([0.47, 0.26], [0.495, 0.24], [0.52, 0.26]), "#cbd5e1", 2.5),
  ];
}

const SCENES = [countryside, garden, mountains];

/** Deterministic per-point wobble so strokes look hand-drawn, not plotted. */
function wobble(i: number, seed: number) {
  const a = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return (a - Math.floor(a) - 0.5) * 2;
}

interface Props {
  /** "full" for the homepage; "low" dims it for pages with a panel on top. */
  density?: "full" | "low";
}

export default function SceneryCanvas({ density = "full" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let last = performance.now();

    const baseAlpha = density === "low" ? 0.2 : 0.42;

    // ── scene state machine: draw → hold → erase ──
    let sceneIdx = Math.floor(Math.random() * SCENES.length);
    let strokes = SCENES[sceneIdx]();
    let totalPts = strokes.reduce((n, st) => n + st.pts.length, 0);
    let phase: "draw" | "hold" | "erase" = "draw";
    let drawn = 0; // points drawn so far
    let holdLeft = 0;
    let erase = 0; // 0..1 wipe position

    const nextScene = () => {
      sceneIdx = (sceneIdx + 1 + Math.floor(Math.random() * 2)) % SCENES.length;
      strokes = SCENES[sceneIdx]();
      totalPts = strokes.reduce((n, st) => n + st.pts.length, 0);
      drawn = 0;
      phase = "draw";
      erase = 0;
    };

    // ── pointer trail ──
    interface TrailPt { x: number; y: number; t: number }
    let trail: TrailPt[] = [];
    const TRAIL_MS = 620;
    const onPointer = (e: PointerEvent) => {
      trail.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (trail.length > 90) trail.shift();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    // ── layout ──
    /** Scene box: keep a 16:9-ish composition centred, covering the viewport. */
    let ox = 0, oy = 0, sw = 0, sh = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Compose the scene as a drawing *on* the page rather than a zoomed-in
      // wallpaper: near-full width on phones, comfortably inset on desktop,
      // always bottom-anchored so the ground line sits near the fold.
      sw = w < 640 ? w * 0.94 : Math.min(w * 0.7, 900);
      sh = sw * 0.6;
      ox = (w - sw) / 2;
      oy = h - sh - Math.min(h * 0.08, 56);
    };
    resize();
    window.addEventListener("resize", resize);

    const X = (x: number) => ox + x * sw;
    const Y = (y: number) => oy + y * sh;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // advance the state machine
      if (phase === "draw") {
        drawn += dt * (totalPts / 5.5); // whole scene in ~5.5s
        if (drawn >= totalPts) {
          drawn = totalPts;
          phase = "hold";
          holdLeft = 2.6;
        }
      } else if (phase === "hold") {
        holdLeft -= dt;
        if (holdLeft <= 0) phase = "erase";
      } else {
        erase += dt * 0.75; // ~1.3s wipe
        if (erase >= 1.12) nextScene();
      }

      // ── the scene ──
      let budget = drawn;
      ctx.globalAlpha = baseAlpha;
      strokes.forEach((st, si) => {
        if (budget <= 0) return;
        const take = Math.min(st.pts.length, budget);
        budget -= st.pts.length;
        if (take < 2) return;

        ctx.beginPath();
        ctx.strokeStyle = st.color;
        ctx.lineWidth = st.width;
        for (let i = 0; i < take; i++) {
          const p = st.pts[i];
          const px = X(p[0]) + wobble(i, si) * 1.5;
          const py = Y(p[1]) + wobble(i + 99, si) * 1.5;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        // partial last segment, so the line grows smoothly rather than in jumps
        if (take < st.pts.length && take >= 1) {
          const f = budget + st.pts.length - Math.floor(budget + st.pts.length);
          const a = st.pts[take - 1];
          const b = st.pts[take];
          if (b) {
            ctx.lineTo(
              X(a[0] + (b[0] - a[0]) * f),
              Y(a[1] + (b[1] - a[1]) * f),
            );
          }
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // pen nib at the tip while drawing
      if (phase === "draw") {
        let seen = 0;
        for (let si = 0; si < strokes.length; si++) {
          const st = strokes[si];
          if (seen + st.pts.length >= drawn) {
            const i = Math.max(0, Math.floor(drawn - seen) - 1);
            const p = st.pts[Math.min(i, st.pts.length - 1)];
            ctx.globalAlpha = baseAlpha + 0.25;
            ctx.fillStyle = st.color;
            ctx.beginPath();
            ctx.arc(X(p[0]), Y(p[1]), 3.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            break;
          }
          seen += st.pts.length;
        }
      }

      // ── eraser wipe ──
      if (phase === "erase") {
        const ex = erase * (w + 160) - 80;
        ctx.clearRect(0, 0, ex, h);
        // the eraser block itself
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#f4f1e8";
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 2;
        const ey = oy + sh * 0.42 + Math.sin(erase * 26) * 22;
        ctx.beginPath();
        ctx.roundRect?.(ex - 34, ey - 16, 46, 32, 6);
        if (!ctx.roundRect) ctx.rect(ex - 34, ey - 16, 46, 32);
        ctx.fill();
        ctx.stroke();
        // dust
        ctx.globalAlpha = 0.28;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(
            ex - 40 - i * 9 + wobble(i, erase * 10) * 6,
            ey + wobble(i + 7, erase * 10) * 18,
            1.6,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ── pointer ink trail (always on top) ──
      const cutoff = now - TRAIL_MS;
      trail = trail.filter((p) => p.t > cutoff);
      if (trail.length > 1) {
        for (let i = 1; i < trail.length; i++) {
          const p = trail[i];
          const q = trail[i - 1];
          const age = (now - p.t) / TRAIL_MS; // 0 fresh → 1 gone
          ctx.globalAlpha = (1 - age) * 0.75;
          ctx.strokeStyle = GREEN;
          ctx.lineWidth = 1 + (1 - age) * 5;
          ctx.beginPath();
          ctx.moveTo(q.x, q.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        // wet ink dot at the cursor
        const head = trail[trail.length - 1];
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = GREEN;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
    />
  );
}
