// src/components/home/ScrollCanvas.tsx
import { useEffect, useRef } from 'react';

interface ScrollCanvasProps {
  phase: 'history' | 'forecast';
  forecastProgress: number; // 0.0 to 1.0
  fillOpacity: number;      // 0.0 to 1.0 — confidence band fade-in
  className?: string;
}

export default function ScrollCanvas({ phase, forecastProgress, fillOpacity, className = '' }: ScrollCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const forecastProgressRef = useRef(forecastProgress);
  useEffect(() => {
    forecastProgressRef.current = forecastProgress;
  }, [forecastProgress]);

  const fillOpacityRef = useRef(fillOpacity);
  useEffect(() => {
    fillOpacityRef.current = fillOpacity;
  }, [fillOpacity]);

  // RAF loop — re-runs only when `phase` changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------
    const FPS_CAP = 30;
    const FRAME_MS = 1000 / FPS_CAP;
    const NUM_PATHS = 7;
    const HISTORY_RATIO = 0.58;
    const DOT_SPACING = 48;

    // -------------------------------------------------------------------------
    // Canvas sizing
    // -------------------------------------------------------------------------
    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();

    // -------------------------------------------------------------------------
    // Path state
    // -------------------------------------------------------------------------
    interface PathState {
      points: { x: number; y: number }[];
      phase: number;
      speed: number;
      spread: number;
      opacity: number; // base opacity for forecast paths
    }

    let paths: PathState[] = [];
    let tick = 0;

    function buildPaths() {
      const h = canvas!.height;

      paths = Array.from({ length: NUM_PATHS }, (_, i) => {
        const spreadDir = i < Math.floor(NUM_PATHS / 2) ? 1 : -1;
        const spreadMag = ((i % Math.ceil(NUM_PATHS / 2)) + 1) / Math.ceil(NUM_PATHS / 2);
        return {
          points: [],
          phase: (i / NUM_PATHS) * Math.PI * 2,
          speed: 0.008 + i * 0.002,
          spread: spreadDir * spreadMag * h * 0.18,
          opacity: 0.35 - spreadMag * 0.20, // darker near centre, lighter at edges: ~0.35→0.15
        };
      });

      updatePoints(0);
    }

    // -------------------------------------------------------------------------
    // Point computation
    // -------------------------------------------------------------------------
    function updatePoints(t: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      const histX = w * HISTORY_RATIO;
      const cy = h * 0.5;
      const NUM_PTS = 120;

      // --- Pass 1: compute path[0] fully to find the shared anchor Y at histX ---
      // All forecast paths branch from this exact point so they all start together.
      let anchorY = cy;
      {
        let y = cy;
        for (let i = 0; i <= NUM_PTS; i++) {
          const xRatio = i / NUM_PTS;
          const x = xRatio * w;
          if (x <= histX) {
            const base = Math.sin(xRatio * Math.PI * 3 + t * 0.4) * h * 0.06;
            const mid  = Math.sin(xRatio * Math.PI * 7 + t * 0.7) * h * 0.025;
            const target = cy + base + mid;
            y = y * 0.85 + target * 0.15;
          } else {
            // Stop as soon as we leave history — we only need the anchor
            anchorY = y;
            break;
          }
          anchorY = y; // keep updating; handles case where histX == right edge
        }
      }

      // --- Pass 2: compute all 7 paths using the shared anchor for forecast ---
      paths.forEach((path) => {
        path.points = [];
        let y = cy;

        for (let i = 0; i <= NUM_PTS; i++) {
          const xRatio = i / NUM_PTS;
          const x = xRatio * w;
          const isHistory = x <= histX;

          if (isHistory) {
            // Shared smooth AR(1) history — phase offset muted so all paths look alike
            const base = Math.sin(xRatio * Math.PI * 3 + t * 0.4) * h * 0.06;
            const mid  = Math.sin(xRatio * Math.PI * 7 + t * 0.7) * h * 0.025;
            const target = cy + base + mid;
            y = y * 0.85 + target * 0.15;
          } else {
            // Forecast zone: every path fans out from the shared anchorY
            const forecastRatio = (x - histX) / (w - histX); // 0→1
            const fanY = anchorY + path.spread * Math.pow(forecastRatio, 0.7);
            // Wiggle amplitude scaled to ~40% of the inter-path spread so paths
            // naturally cross and intersect rather than staying strictly ordered.
            const wiggleAmp = h * 0.08 * forecastRatio;
            const wiggle =
              Math.sin(xRatio * Math.PI * 4 + t * path.speed * 60 + path.phase) * wiggleAmp +
              Math.sin(xRatio * Math.PI * 9 + t * path.speed * 40 + path.phase * 1.7) * wiggleAmp * 0.4;
            const target = fanY + wiggle;
            y = y * 0.9 + target * 0.1;
          }

          path.points.push({ x, y });
        }
      });
    }

    // -------------------------------------------------------------------------
    // Drawing helpers
    // -------------------------------------------------------------------------
    function drawDotGrid() {
      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.fillStyle = 'rgba(0,0,0,0.06)';
      for (let x = DOT_SPACING; x < w; x += DOT_SPACING) {
        for (let y = DOT_SPACING; y < h; y += DOT_SPACING) {
          ctx!.beginPath();
          ctx!.arc(x, y, 1, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    function drawHistoryDivider() {
      const w = canvas!.width;
      const h = canvas!.height;
      const x = w * HISTORY_RATIO;

      ctx!.save();
      ctx!.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx!.lineWidth = 1;
      ctx!.setLineDash([4, 8]);
      ctx!.beginPath();
      ctx!.moveTo(x, h * 0.15);
      ctx!.lineTo(x, h * 0.85);
      ctx!.stroke();
      ctx!.setLineDash([]);

      ctx!.fillStyle = 'rgba(0,0,0,0.25)';
      ctx!.font = '10px sans-serif';
      ctx!.letterSpacing = '1px';
      ctx!.fillText('HISTORY',  x - 72, h * 0.88);
      ctx!.fillText('FORECAST', x + 8,  h * 0.88);
      ctx!.restore();
    }

    /** Draw the single history line (used in both phases). */
    function drawHistoryLine(_t: number) {
      // paths[0] represents the shared history (all paths have identical history segments)
      const path = paths[0];
      if (!path || path.points.length < 2) return;

      const w = canvas!.width;
      const histX = w * HISTORY_RATIO;
      const historyPts = path.points.filter(p => p.x <= histX + 2);
      if (historyPts.length < 2) return;

      ctx!.beginPath();
      ctx!.moveTo(historyPts[0].x, historyPts[0].y);
      for (let i = 1; i < historyPts.length; i++) {
        const prev = historyPts[i - 1];
        const curr = historyPts[i];
        const cpx = (prev.x + curr.x) / 2;
        ctx!.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
      }
      ctx!.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx!.lineWidth = 1.5;
      ctx!.stroke();
    }

    /** Draw orange confidence band between the outermost forecast paths. */
    function drawConfidenceBand(fp: number, fo: number) {
      if (fp < 1 || fo <= 0 || paths.length < 2) return;

      const w = canvas!.width;
      const histX = w * HISTORY_RATIO;

      // Find the index where the forecast zone starts (same for all paths)
      const startIdx = paths[0].points.findIndex(p => p.x >= histX - 2);
      if (startIdx < 0) return;
      const len = paths[0].points.length - startIdx;
      if (len < 2) return;

      // Build per-column top (min Y) and bottom (max Y) envelopes
      const topY = new Float32Array(len);
      const botY = new Float32Array(len);
      for (let j = 0; j < len; j++) {
        let minY = Infinity, maxY = -Infinity;
        for (const path of paths) {
          const y = path.points[startIdx + j].y;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        topY[j] = minY;
        botY[j] = maxY;
      }

      // Draw filled polygon: forward along top edge, backward along bottom edge
      ctx!.beginPath();
      ctx!.moveTo(paths[0].points[startIdx].x, topY[0]);
      for (let j = 1; j < len; j++) {
        ctx!.lineTo(paths[0].points[startIdx + j].x, topY[j]);
      }
      for (let j = len - 1; j >= 0; j--) {
        ctx!.lineTo(paths[0].points[startIdx + j].x, botY[j]);
      }
      ctx!.closePath();
      ctx!.fillStyle = `rgba(174,49,0,${fo * 0.30})`;
      ctx!.fill();
    }

    /** Draw the forecast fan. Each path's visibility/opacity is driven by forecastProgress. */
    function drawForecastPaths(fp: number) {
      const w = canvas!.width;
      const histX = w * HISTORY_RATIO;

      paths.forEach((path, i) => {
        if (path.points.length < 2) return;

        // Progressive reveal: path i becomes visible once fp > i/NUM_PATHS
        const threshold = i / NUM_PATHS;
        if (fp <= threshold) return;

        // Opacity ramps from 0 → baseOpacity as fp moves from threshold → threshold + 1/NUM_PATHS
        const ramp = Math.min(1, (fp - threshold) * NUM_PATHS);
        const alpha = ramp * path.opacity;
        if (alpha <= 0) return;

        const forecastPts = path.points.filter(p => p.x >= histX - 2);
        if (forecastPts.length < 2) return;

        // Forecast stroke
        ctx!.beginPath();
        ctx!.moveTo(forecastPts[0].x, forecastPts[0].y);
        for (let j = 1; j < forecastPts.length; j++) {
          const prev = forecastPts[j - 1];
          const curr = forecastPts[j];
          const cpx = (prev.x + curr.x) / 2;
          ctx!.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
        }
        ctx!.strokeStyle = `rgba(0,27,61,${alpha})`;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();

        // Branch dot at the history/forecast boundary
        const branchPt = forecastPts[0];
        if (branchPt) {
          ctx!.beginPath();
          ctx!.arc(branchPt.x, branchPt.y, 2.5, 0, Math.PI * 2);
          ctx!.fillStyle = '#ae3100';
          ctx!.fill();
        }
      });
    }

    // -------------------------------------------------------------------------
    // Build initial paths
    // -------------------------------------------------------------------------
    buildPaths();

    // -------------------------------------------------------------------------
    // Animation loop
    // -------------------------------------------------------------------------
    let rafId: number;
    let lastFrame = 0;

    function animate(timestamp: number) {
      rafId = requestAnimationFrame(animate);
      if (timestamp - lastFrame < FRAME_MS) return;
      lastFrame = timestamp;
      tick++;

      const t = tick * 0.016;
      updatePoints(t);

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      drawDotGrid();

      if (phaseRef.current === 'history') {
        drawHistoryLine(t);
      } else {
        // forecast phase: show divider, history portion, then band + fan
        drawHistoryDivider();
        drawHistoryLine(t);
        drawConfidenceBand(forecastProgressRef.current, fillOpacityRef.current);
        drawForecastPaths(forecastProgressRef.current);
      }
    }

    rafId = requestAnimationFrame(animate);

    // -------------------------------------------------------------------------
    // Resize handler
    // -------------------------------------------------------------------------
    function handleResize() {
      resize();
      buildPaths();
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // phase, forecastProgress, and fillOpacity are intentionally read via refs inside the loop

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
