// src/components/portfolio/map/types.ts

export interface TimelineEntry {
  type: 'education' | 'professional';
  start: string;
  end?: string;
  title: string;
  institution?: string;
  company?: string;
  location?: string;
  lat?: number;
  lng?: number;
  description: string;
  skills?: string[];
  logo?: string;
  website?: string;
}

export interface Chapter {
  id: string;
  duration: number;   // multiplier × 100vh
  city: string | null; // matches Pin.key, or null for transitions/outros
  label?: { top: string; sub: string; accent?: boolean };
}

export interface Pin {
  key: string;
  label: string;
  country: string;
  lat: number;
  lng: number;
  /** Approximate normalised [0,1] position on the background image for CSS positioning */
  bgX: number;
  bgY: number;
  /** Chapter id where this pin first appears */
  appearsAt: string;
  satelliteImage: string;
  /** Short subtitle shown in the TimelineStrip under the city name */
  detail?: string;
  /** Year range shown in the TimelineStrip, e.g. "2019 – 2023" */
  years?: string;
}
