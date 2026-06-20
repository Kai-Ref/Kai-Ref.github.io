// src/components/portfolio/TimelineExperience/WavyRail.tsx
//
// Canvas-rendered wavy timeline rail. Mirrors the home page's
// ScrollCanvas technique (layered sine waves + AR(1) spatial smoothing
// + bezier curves) but applied only to the *past* portion of a single
// horizontal track. The wave amplitude tapers smoothly to zero before
// the last entry so the join with the (straight) future portion looks
// seamless.
//
// Entry dots ride the wave: when `dotSpecs` and `dotRefs` are supplied,
// the component writes a `--wave-y` CSS variable on each dot's
// registered element every frame. The dot's own transform should
// consume this via `translate(..., calc(... + var(--wave-y, 0px)))`.

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { MutableRefObject } from 'react';

export interface WavyRailDotSpec {
  /** Stable identifier matching the key registered in `dotRefs`. */
  key: string;
  /** 0..1 position within the rail's (rangeStart → containerWidth - padRight) region. */
  xRatio: number;
}

interface WavyRailProps {
  /** Distance in pixels from the wrapper's left edge to where the rail starts. */
  rangeStartXPx: number;
  /** Reserved padding on the right of the wrapper. */
  padRightPx: number;
  /** 0..1 — how far across the available rail range the last (most recent) entry sits. */
  lastEntryRatio: number;
  /** Stroke color. Accepts `var()` and `color-mix()`; resolved internally. */
  color: string;
  /** Per-instance random offset so multiple rails wave independently. */
  phaseSeed: number;
  /** Peak vertical amplitude of the wave, in CSS pixels. */
  amplitudePx?: number;
  /** Distance over which amplitude fades to 0 as the wave approaches the last entry. */
  taperPx?: number;
  /** Vertical canvas size; should comfortably accommodate amplitude on both sides. */
  canvasHeight?: number;
  /** When true, draws a single straight line and skips the RAF loop. */
  reducedMotion?: boolean;
  dotSpecs?: WavyRailDotSpec[];
  dotRefs?: MutableRefObject<Map<string, HTMLElement>>;
  /** Seconds before the wave starts ramping up its amplitude. */
  revealDelaySec?: number;
  /** Seconds over which amplitude ramps from 0 → 1 once the delay has elapsed. */
  revealDurationSec?: number;
}

export function WavyRail({
  rangeStartXPx,
  padRightPx,
  lastEntryRatio,
  color,
  phaseSeed,
  amplitudePx = 4,
  taperPx = 80,
  canvasHeight = 32,
  reducedMotion = false,
  dotSpecs,
  dotRefs,
  revealDelaySec = 0.18,
  revealDurationSec = 0.55,
}: WavyRailProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Live refs so the RAF loop always reads current values without
  // re-running the effect on every prop change.
  const lastEntryRatioRef = useRef(lastEntryRatio);
  useEffect(() => {
    lastEntryRatioRef.current = lastEntryRatio;
  }, [lastEntryRatio]);

  const dotSpecsRef = useRef(dotSpecs);
  useEffect(() => {
    dotSpecsRef.current = dotSpecs;
  }, [dotSpecs]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolve CSS color expressions (var(), color-mix()) by letting
    // the browser compute them on a hidden probe element.
    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;';
    probe.style.color = color;
    wrapper.appendChild(probe);
    const resolvedColor = getComputedStyle(probe).color || color;
    wrapper.removeChild(probe);

    const dpr = Math.max(1, window.devicePixelRatio || 1);
    let containerWidthPx = wrapper.clientWidth;

    const sizeCanvas = () => {
      containerWidthPx = wrapper.clientWidth;
      if (containerWidthPx <= 0) return;
      canvas.width = Math.round(containerWidthPx * dpr);
      canvas.height = Math.round(canvasHeight * dpr);
      canvas.style.width = `${containerWidthPx}px`;
      canvas.style.height = `${canvasHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();

    const cy = canvasHeight / 2;
    const NUM_PTS = 96;

    // Hash the seed into a phase offset so different tracks/rails
    // get visually distinct wave phases.
    const seedHash = Math.abs(Math.sin(phaseSeed * 12.9898) * 43758.5453);
    const seedOffset = (seedHash % 1) * Math.PI * 2;

    const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
    const smoothstep = (u: number) => {
      const c = clamp01(u);
      return c * c * (3 - 2 * c);
    };

    const mountTime = performance.now();
    const fadeDelayMs = revealDelaySec * 1000;
    const fadeDurationMs = Math.max(1, revealDurationSec * 1000);

    const intensityAt = (now: number) => {
      if (reducedMotion) return 0;
      const elapsed = now - mountTime;
      if (elapsed <= fadeDelayMs) return 0;
      return smoothstep((elapsed - fadeDelayMs) / fadeDurationMs);
    };

    // Pre-allocated sample buffers reused every frame.
    const ptsX = new Float64Array(NUM_PTS + 1);
    const ptsY = new Float64Array(NUM_PTS + 1);

    const writeDotsToCenterline = () => {
      const specs = dotSpecsRef.current;
      if (!specs || !dotRefs?.current) return;
      for (const spec of specs) {
        const el = dotRefs.current.get(spec.key);
        if (el) el.style.setProperty('--wave-y', '0px');
      }
    };

    const drawFrame = (t: number, intensity: number) => {
      const w = containerWidthPx;
      ctx.clearRect(0, 0, w, canvasHeight);
      if (w <= 0) return;

      const railRangeWidth = w - rangeStartXPx - padRightPx;
      if (railRangeWidth <= 0) return;

      const lastRatio = clamp01(lastEntryRatioRef.current);
      const solidStartPx = rangeStartXPx;
      const solidEndPx = rangeStartXPx + lastRatio * railRangeWidth;
      const solidLengthPx = solidEndPx - solidStartPx;

      if (solidLengthPx < 2) {
        writeDotsToCenterline();
        return;
      }

      // The wave amplitude tapers off over the last `effectiveTaperPx`
      // pixels of the solid range so it joins the straight future cleanly.
      const effectiveTaperPx = Math.min(taperPx, solidLengthPx * 0.55);

      // Spatial AR(1) smoothing of layered sines (matches ScrollCanvas).
      let y = cy;
      for (let i = 0; i <= NUM_PTS; i++) {
        const xRatio = i / NUM_PTS;
        const xPx = solidStartPx + xRatio * solidLengthPx;
        const distFromEnd = solidEndPx - xPx;
        const taper =
          effectiveTaperPx > 0 ? smoothstep(distFromEnd / effectiveTaperPx) : 1;

        const a =
          Math.sin(xRatio * Math.PI * 2.2 + t * 0.42 + seedOffset) *
          amplitudePx *
          0.7;
        const b =
          Math.sin(xRatio * Math.PI * 5.5 + t * 0.75 + seedOffset * 1.7) *
          amplitudePx *
          0.3;

        const target = cy + (a + b) * taper * intensity;
        y = y * 0.85 + target * 0.15;
        ptsX[i] = xPx;
        ptsY[i] = y;
      }

      // Bezier stroke between consecutive samples.
      ctx.beginPath();
      ctx.moveTo(ptsX[0], ptsY[0]);
      for (let i = 1; i <= NUM_PTS; i++) {
        const cpx = (ptsX[i - 1] + ptsX[i]) / 2;
        ctx.bezierCurveTo(cpx, ptsY[i - 1], cpx, ptsY[i], ptsX[i], ptsY[i]);
      }
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Position dots on the wave at their xRatio.
      const specs = dotSpecsRef.current;
      if (specs && dotRefs?.current) {
        for (const spec of specs) {
          const el = dotRefs.current.get(spec.key);
          if (!el) continue;
          const dotXPx = rangeStartXPx + spec.xRatio * railRangeWidth;
          // Only ride the wave if the dot is within the wavy region.
          if (dotXPx < solidStartPx - 1 || dotXPx > solidEndPx + 1) {
            el.style.setProperty('--wave-y', '0px');
            continue;
          }
          const localRatio =
            solidLengthPx > 0 ? (dotXPx - solidStartPx) / solidLengthPx : 0;
          const sampleIdx = Math.max(
            0,
            Math.min(NUM_PTS, Math.round(clamp01(localRatio) * NUM_PTS))
          );
          const dotY = ptsY[sampleIdx];
          el.style.setProperty('--wave-y', `${(dotY - cy).toFixed(2)}px`);
        }
      }
    };

    // Draw a single static straight line + zero out dot offsets.
    const drawStatic = () => {
      const w = containerWidthPx;
      ctx.clearRect(0, 0, w, canvasHeight);
      const railRangeWidth = w - rangeStartXPx - padRightPx;
      if (railRangeWidth <= 0) {
        writeDotsToCenterline();
        return;
      }
      const lastRatio = clamp01(lastEntryRatioRef.current);
      const solidEndPx = rangeStartXPx + lastRatio * railRangeWidth;
      if (solidEndPx - rangeStartXPx < 2) {
        writeDotsToCenterline();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(rangeStartXPx, cy);
      ctx.lineTo(solidEndPx, cy);
      ctx.strokeStyle = resolvedColor;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
      writeDotsToCenterline();
    };

    const ro = new ResizeObserver(() => {
      sizeCanvas();
      if (reducedMotion) drawStatic();
    });
    ro.observe(wrapper);

    if (reducedMotion) {
      drawStatic();
      return () => {
        ro.disconnect();
      };
    }

    // Initial frame at intensity 0 (line is flat, dots at center).
    drawFrame(0, 0);

    const FPS_CAP = 30;
    const FRAME_MS = 1000 / FPS_CAP;
    let rafId = 0;
    let tick = 0;
    let lastFrame = 0;

    const loop = (timestamp: number) => {
      rafId = requestAnimationFrame(loop);
      if (timestamp - lastFrame < FRAME_MS) return;
      lastFrame = timestamp;
      tick += 1;
      const t = tick * (1 / FPS_CAP);
      drawFrame(t, intensityAt(timestamp));
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [
    color,
    rangeStartXPx,
    padRightPx,
    phaseSeed,
    amplitudePx,
    taperPx,
    canvasHeight,
    reducedMotion,
    dotRefs,
    revealDelaySec,
    revealDurationSec,
  ]);

  return (
    <motion.div
      ref={wrapperRef}
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: reducedMotion ? 0 : revealDurationSec,
        delay: revealDelaySec,
        ease: 'easeOut',
      }}
      className="pointer-events-none absolute"
      style={{
        left: 0,
        right: 0,
        top: '50%',
        height: canvasHeight,
        transform: 'translateY(-50%)',
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </motion.div>
  );
}

export default WavyRail;
