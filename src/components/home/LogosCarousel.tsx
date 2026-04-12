// src/components/home/LogosCarousel.tsx
import { useEffect, useRef, useState } from 'react';

const logos = [
  { name: 'KIT', src: '/img/logos/kit.svg' },
  { name: 'University of Mannheim', src: '/img/logos/uom.webp' },
  { name: 'University of Adelaide', src: '/img/logos/uoa.png' },
  { name: 'ICIS', src: '/img/logos/icis.jpg' },
  { name: 'Fraunhofer SIT', src: '/img/logos/sit.webp' },
  { name: 'statworx', src: '/img/logos/statworx-Logo-Black.jpg' },
];

export default function LogosCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const translateX = useRef(0);
  const isPaused = useRef(false);
  const rafId = useRef<number>(0);

  const [dims, setDims] = useState({ logoWidth: 140, gap: 48 });

  useEffect(() => {
    function update() {
      const mobile = window.innerWidth < 640;
      setDims({ logoWidth: mobile ? 90 : 140, gap: mobile ? 28 : 48 });
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const { logoWidth, gap } = dims;
  const totalWidth = (logoWidth + gap) * logos.length;

  useEffect(() => {
    translateX.current = 0;
    function animate() {
      if (!isPaused.current) {
        translateX.current -= 0.5;
        if (translateX.current <= -totalWidth) translateX.current = 0;
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(${translateX.current}px)`;
        }
      }
      rafId.current = requestAnimationFrame(animate);
    }
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [totalWidth]);

  const doubleLogos = [...logos, ...logos, ...logos];

  return (
    <div
      className="logos-carousel overflow-hidden w-full"
      onMouseEnter={() => { isPaused.current = true; }}
      onMouseLeave={() => { isPaused.current = false; }}
    >
      <div
        ref={trackRef}
        className="logos-track flex items-center will-change-transform"
        style={{ gap: `${gap}px` }}
      >
        {doubleLogos.map((logo, i) => (
          <div
            key={i}
            className="logo-item flex-none flex items-center justify-center"
            style={{ width: logoWidth }}
          >
            <img
              src={logo.src}
              alt={logo.name}
              title={logo.name}
              className="max-h-10 sm:max-h-12 object-contain transition-all duration-300"
              style={{ maxWidth: logoWidth - 10, filter: 'grayscale(60%)', opacity: 0.7 }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(0%)';
                (e.currentTarget as HTMLImageElement).style.opacity = '1';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLImageElement).style.filter = 'grayscale(60%)';
                (e.currentTarget as HTMLImageElement).style.opacity = '0.7';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
