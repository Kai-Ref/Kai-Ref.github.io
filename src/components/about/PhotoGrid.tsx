// src/components/about/PhotoGrid.tsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface Slide {
  label: string;
  images: string[];
}

const slides: Slide[] = [
  {
    label: 'Hiking',
    images: Array.from({ length: 12 }, (_, i) =>
      `/img/about/hiking/${i + 1}.${i < 1 ? 'jpg' : 'jpeg'}`
    ),
  },
  {
    label: 'Cooking',
    images: [
      '/img/about/cooking/1.jpeg',
      '/img/about/cooking/2.jpeg',
      '/img/about/cooking/3.jpg',
    ],
  },
  {
    label: 'Sports',
    images: [
      '/img/about/sports/1.jpeg',
      '/img/about/sports/2.jpeg',
      '/img/about/sports/3.jpeg',
      '/img/about/sports/4.jpg',
      '/img/about/sports/5.jpg',
      '/img/about/sports/6.jpg',
    ],
  },
  {
    label: 'Wine',
    images: [
      '/img/about/wine/1.jpeg',
      '/img/about/wine/2.jpeg',
      '/img/about/wine/3.jpg',
      '/img/about/wine/4.jpg',
    ],
  },
];

function PhotoSlide({ images, label, delay }: { images: string[]; label: string; delay: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrent((i) => (i + 1) % images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <motion.div
      className="photo-slide relative overflow-hidden rounded-card shadow-light"
      style={{ aspectRatio: '3/4' }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay }}
    >
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={label}
          width="300"
          height="400"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0 }}
          loading="lazy"
        />
      ))}
      <div
        className="absolute bottom-0 left-0 right-0 px-3 py-2 text-white text-sm font-medium"
        style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.65))' }}
      >
        {label}
      </div>
      {/* Progress dots */}
      <div className="absolute top-2 right-2 flex gap-1">
        {images.slice(0, Math.min(images.length, 6)).map((_, i) => (
          <div
            key={i}
            className="w-1 h-1 rounded-full transition-all duration-300"
            style={{
              background: i === (current % Math.min(images.length, 6)) ? 'white' : 'rgba(255,255,255,0.4)',
              transform: i === (current % Math.min(images.length, 6)) ? 'scale(1.4)' : 'scale(1)',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function PhotoGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
      {slides.map((slide, i) => (
        <PhotoSlide key={slide.label} images={slide.images} label={slide.label} delay={i * 0.1} />
      ))}
    </div>
  );
}
