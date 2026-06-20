import { AnimatePresence, motion } from 'framer-motion';

import { CITY_IMAGES } from './constants';
import styles from './styles.module.css';

function toCityLabel(cityKey: string | null) {
  if (!cityKey) return 'Current city';
  return cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
}

export function CityMinimap({
  cityKey,
  compact = false,
  reducedMotion = false,
  fixedSize,
}: {
  cityKey: string | null;
  compact?: boolean;
  reducedMotion?: boolean;
  fixedSize?: { width: number | string; height: number | string };
}) {
  const image = cityKey ? CITY_IMAGES[cityKey] : null;
  const width = fixedSize?.width ?? (compact ? 80 : 'clamp(160px, 18vw, 220px)');
  const height = fixedSize?.height ?? (compact ? 80 : 'clamp(160px, 18vw, 220px)');

  return (
    <div
      className={`${styles.cityFrame} relative overflow-hidden`}
      style={{
        width,
        height,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={image ?? 'empty'}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' }}
          className="absolute inset-0"
          style={{
            backgroundImage: image ? `url(${image})` : 'linear-gradient(135deg, #d6d8dd, #f1f2f5)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </AnimatePresence>

      <div className={`${styles.cityCaption} absolute inset-x-0 bottom-0 px-3 py-2 text-white`}>
        {toCityLabel(cityKey)}
      </div>
    </div>
  );
}
