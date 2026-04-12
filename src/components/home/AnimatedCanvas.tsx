// src/components/home/AnimatedCanvas.tsx
import { useEffect, useRef } from 'react';

export default function AnimatedCanvas({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    let lastFrame = 0;
    const FPS_CAP = 30;
    const FRAME_MS = 1000 / FPS_CAP;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();

    // --- Configuration ---
    const NUM_PATHS = 7;
    const HISTORY_RATIO = 0.58; // 58% of canvas is "historical"
    const DOT_SPACING = 48;

    // Shared history: a smooth AR(1) path that all forecast paths branch from
    interface PathState {
      points: { x: number; y: number }[];
      phase: number;
      speed: number;
      spread: number; // how far this path fans out from centre in forecast zone
      opacity: number;
    }

    let paths: PathState[] = [];
    let tick = 0;

    function buildPaths() {
      const w = canvas!.width;
      const h = canvas!.height;
      const cx = h * 0.5; // vertical centre

      paths = Array.from({ length: NUM_PATHS }, (_, i) => {
        const spreadDir = i < Math.floor(NUM_PATHS / 2) ? 1 : -1;
        const spreadMag = ((i % Math.ceil(NUM_PATHS / 2)) + 1) / Math.ceil(NUM_PATHS / 2);
        return {
          points: [],
          phase: (i / NUM_PATHS) * Math.PI * 2,
          speed: 0.008 + i * 0.002,
          spread: spreadDir * spreadMag * h * 0.18,
          opacity: 0.10 + (1 - spreadMag) * 0.18,
        };
      });

      // Pre-compute initial points
      updatePoints(0);
    }

    function updatePoints(t: number) {
      const w = canvas!.width;
      const h = canvas!.height;
      const histX = w * HISTORY_RATIO;
      const cy = h * 0.5;
      const NUM_PTS = 120;

      paths.forEach((path, pi) => {
        path.points = [];
        let y = cy;
        let velocity = 0;

        for (let i = 0; i <= NUM_PTS; i++) {
          const xRatio = i / NUM_PTS;
          const x = xRatio * w;
          const isHistory = x <= histX;

          if (isHistory) {
            // Shared smooth history: gentle oscillation + random walk
            const base = Math.sin(xRatio * Math.PI * 3 + t * 0.4 + path.phase * 0.3) * h * 0.06;
            const mid = Math.sin(xRatio * Math.PI * 7 + t * 0.7) * h * 0.025;
            const target = cy + base + mid;
            y = y * 0.85 + target * 0.15;
          } else {
            // Forecast zone: fan out from the history endpoint
            const forecastRatio = (x - histX) / (w - histX); // 0→1
            const fanY = cy + path.spread * Math.pow(forecastRatio, 0.7);
            // Add gentle oscillation on top of the fan
            const wiggle = Math.sin(xRatio * Math.PI * 5 + t * path.speed * 60 + path.phase) * h * 0.015 * forecastRatio;
            const target = fanY + wiggle;
            y = y * 0.9 + target * 0.1;
          }

          path.points.push({ x, y });
        }
      });
    }

    function drawDotGrid() {
      const w = canvas!.width;
      const h = canvas!.height;
      ctx!.fillStyle = 'rgba(255,255,255,0.07)';
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
      // Subtle vertical dashed line at the history/forecast boundary
      ctx!.save();
      ctx!.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx!.lineWidth = 1;
      ctx!.setLineDash([4, 8]);
      ctx!.beginPath();
      ctx!.moveTo(x, h * 0.15);
      ctx!.lineTo(x, h * 0.85);
      ctx!.stroke();
      ctx!.setLineDash([]);
      // Labels
      ctx!.fillStyle = 'rgba(255,255,255,0.30)';
      ctx!.font = '10px sans-serif';
      ctx!.letterSpacing = '1px';
      ctx!.fillText('HISTORY', x - 72, h * 0.88);
      ctx!.fillText('FORECAST', x + 8, h * 0.88);
      ctx!.restore();
    }

    function drawPaths(t: number) {
      const w = canvas!.width;
      const histX = w * HISTORY_RATIO;

      paths.forEach((path) => {
        if (path.points.length < 2) return;

        // --- Fill under the path in forecast zone only (subtle area fill) ---
        const forecastPts = path.points.filter(p => p.x >= histX - 2);
        if (forecastPts.length > 1) {
          ctx!.beginPath();
          ctx!.moveTo(forecastPts[0].x, forecastPts[0].y);
          for (let i = 1; i < forecastPts.length; i++) {
            const prev = forecastPts[i - 1];
            const curr = forecastPts[i];
            const cpx = (prev.x + curr.x) / 2;
            ctx!.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
          }
          // Close to the centre line
          ctx!.lineTo(forecastPts[forecastPts.length - 1].x, canvas!.height / 2);
          ctx!.lineTo(forecastPts[0].x, canvas!.height / 2);
          ctx!.closePath();
          ctx!.fillStyle = `rgba(255,255,255,${path.opacity * 0.12})`;
          ctx!.fill();
        }

        // --- Stroke the full path ---
        ctx!.beginPath();
        ctx!.moveTo(path.points[0].x, path.points[0].y);
        for (let i = 1; i < path.points.length; i++) {
          const prev = path.points[i - 1];
          const curr = path.points[i];
          const cpx = (prev.x + curr.x) / 2;
          ctx!.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
        }

        // History portion: higher opacity, solid
        // Forecast portion: lower opacity, fades further right
        // Use a gradient along x for the stroke
        const grad = ctx!.createLinearGradient(0, 0, canvas!.width, 0);
        const baseAlpha = path.opacity;
        grad.addColorStop(0, `rgba(255,255,255,${baseAlpha * 0.6})`);
        grad.addColorStop(HISTORY_RATIO - 0.05, `rgba(255,255,255,${baseAlpha * 1.0})`);
        grad.addColorStop(HISTORY_RATIO + 0.02, `rgba(255,255,255,${baseAlpha * 0.7})`);
        grad.addColorStop(1, `rgba(255,255,255,${baseAlpha * 0.2})`);

        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();

        // --- Dot at the branching point ---
        const branchPt = path.points.find(p => p.x >= histX - 1);
        if (branchPt) {
          ctx!.beginPath();
          ctx!.arc(branchPt.x, branchPt.y, 2.5, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,255,255,${baseAlpha * 1.5})`;
          ctx!.fill();
        }
      });
    }

    buildPaths();

    function animate(timestamp: number) {
      rafId = requestAnimationFrame(animate);
      if (timestamp - lastFrame < FRAME_MS) return;
      lastFrame = timestamp;
      tick++;

      const t = tick * 0.016; // ~0.016s per frame at 30fps
      updatePoints(t);

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      drawDotGrid();
      drawHistoryDivider();
      drawPaths(t);
    }

    rafId = requestAnimationFrame(animate);

    // Fade in
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 1.2s ease';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        canvas.style.opacity = '1';
      });
    });

    function handleResize() {
      resize();
      buildPaths();
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      aria-hidden="true"
    />
  );
}
