// src/components/home/ProfileSlideshow.tsx
import { useState, useEffect } from 'react';

const pics = [
  '/img/profile_pics/1.jpg',
  '/img/profile_pics/2.jpg',
  '/img/profile_pics/3.jpg',
  '/img/profile_pics/4.jpeg',
  '/img/profile_pics/5.jpeg',
  '/img/profile_pics/6.jpeg',
  '/img/profile_pics/7.jpeg',
  '/img/profile_pics/8.jpeg',
  '/img/profile_pics/9.jpeg',
];

export default function ProfileSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((i) => (i + 1) % pics.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="hero-profile-wrapper relative inline-block"
      style={{ width: 'clamp(120px, 35vw, 200px)', height: 'clamp(120px, 35vw, 200px)' }}
    >
      {pics.map((src, i) => (
        <img
          key={src}
          src={src}
          alt="Kai Reffert"
          className="absolute inset-0 object-cover w-full h-full transition-opacity duration-1000 border-4 border-on-surface/20"
          style={{ opacity: i === current ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
