// src/components/home/ScrollHero.tsx
import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from 'framer-motion';
import ScrollCanvas from './ScrollCanvas';
import ProfileSlideshow from './ProfileSlideshow';
import LogosCarousel from './LogosCarousel';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScrollIndicator({ opacity }: { opacity: MotionValue<number> }) {
  return (
    <motion.div
      style={{
        opacity,
        position: 'absolute',
        left: 0,
        right: 0,
        top: '66%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <span
        className="font-headline italic text-sm text-on-surface-variant tracking-[0.25em]"
        style={{ fontVariant: 'small-caps' }}
      >
        scroll
      </span>
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 mt-2 text-on-surface-variant"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <polyline points="6 9 12 15 18 9" />
      </motion.svg>
    </motion.div>
  );
}

function HeroContent({ opacity }: { opacity: MotionValue<number> }) {
  return (
    <motion.div
      style={{ opacity }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none"
    >
      <h1 className="font-headline text-4xl sm:text-6xl md:text-8xl font-light tracking-tighter text-on-surface">
        Kai Reffert
      </h1>
      <ProfileSlideshow />
      <p className="font-label text-lg text-on-surface-variant tracking-widest uppercase">
        Data Scientist &amp; AI Enthusiast
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 pointer-events-auto mt-2">
        <a
          href="/portfolio"
          className="font-label text-sm tracking-widest uppercase px-8 py-3 border border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-colors"
        >
          View Experience
        </a>
        <a
          href="/projects"
          className="font-label text-sm tracking-widest uppercase px-8 py-3 border border-on-surface text-on-surface hover:bg-on-surface hover:text-surface transition-colors"
        >
          See Projects
        </a>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// StatsRow — rendered below the sticky viewport, entry via whileInView
// ---------------------------------------------------------------------------

const STATS = [
  { label: 'Degree', value: 'M.Sc. Data Science' },
  { label: 'Projects', value: '5+' },
  { label: 'Experience', value: '3+ Years' },
];

function StatsRow() {
  return (
    <div className="bg-white px-6 sm:px-12 py-10 sm:py-16">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Stat chips */}
        <div className="flex items-center justify-center gap-6 sm:gap-12 mb-10 flex-wrap">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1">
              <span className="font-label text-xs tracking-widest uppercase text-on-surface-variant">
                {stat.label}
              </span>
              <span className="font-label text-sm tracking-widest uppercase text-on-surface font-medium">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
        {/* Logos carousel */}
        <LogosCarousel />
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScrollHero
// ---------------------------------------------------------------------------

export default function ScrollHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: containerRef });

  // ---- Canvas phase --------------------------------------------------------
  const [canvasPhase, setCanvasPhase] = useState<'history' | 'forecast'>('history');
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setCanvasPhase(v >= 0.25 ? 'forecast' : 'history');
  });

  // ---- Forecast progress ---------------------------------------------------
  const forecastProgressMotion = useTransform(scrollYProgress, [0.25, 0.50], [0, 1]);
  const [forecastProgressValue, setForecastProgressValue] = useState(0);
  useMotionValueEvent(forecastProgressMotion, 'change', (v) => {
    setForecastProgressValue(v);
  });

  // ---- Phase 0: SCROLL indicator opacity ----------------------------------
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.10, 0.22], [1, 1, 0]);

  // ---- Phase 2: Hero content opacity — fades in, stays visible ------------
  const heroContentOpacity = useTransform(scrollYProgress, [0.48, 0.58], [0, 1]);

  // ---- Phase 3: Confidence band fill opacity ------------------------------
  const fillOpacityMotion = useTransform(scrollYProgress, [0.50, 0.62], [0, 1]);
  const [fillOpacityValue, setFillOpacityValue] = useState(0);
  useMotionValueEvent(fillOpacityMotion, 'change', (v) => {
    setFillOpacityValue(v);
  });

  return (
    <>
      {/* 400vh scroll container — only the sticky canvas lives here */}
      <div ref={containerRef} style={{ height: '400vh' }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
        <ScrollCanvas
            phase={canvasPhase}
            forecastProgress={forecastProgressValue}
            fillOpacity={fillOpacityValue}
            className="absolute inset-0 w-full h-full"
          />
          <ScrollIndicator opacity={scrollIndicatorOpacity} />
          <HeroContent opacity={heroContentOpacity} />
        </div>
      </div>

      {/* Stats + logos: outside the scroll container, always in normal flow */}
      <StatsRow />
    </>
  );
}
