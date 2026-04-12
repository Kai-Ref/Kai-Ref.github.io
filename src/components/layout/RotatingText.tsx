// src/components/layout/RotatingText.tsx
import { useState, useEffect } from 'react';

const texts = [
  'Time Series Enthusiast',
  'Pfalzkind',
  'ML Engineer',
  'Computer Visioneer',
  'Werder Bremen Fan',
];

export default function RotatingText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % texts.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className="font-medium mt-2 min-h-[1.5em] text-lg"
      style={{ color: 'var(--primary-color)' }}
    >
      {texts[index]}
    </p>
  );
}
