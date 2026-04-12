# Map Timeline — City View Enhancements

**Date:** 2026-04-11
**Status:** Approved

---

## Overview

Three targeted enhancements to the portfolio map timeline's city detail view:

1. **Offset zoom** — shift the projection center so the city pin sits left-of-center, leaving room for description cards on the right.
2. **Satellite backdrop** — show a pre-downloaded aerial image behind the D3 SVG when zoomed into a city.
3. **Scope exclusions** — explicitly no 3D camera, no scroll-driven pan within a city, no tile library.

---

## Feature 1: Offset Zoom

### Problem

Currently, city-level `PROJECTION_CONFIGS` entries center the D3 Mercator projection exactly on the pin's lat/lng. When zoomed in, the pin lands near the viewport center. The `CardsOverlay` component places cards to the right (or left) of the pin dynamically, but there is no guaranteed space — cards can overlap the pin or sit awkwardly.

### Solution

Shift each city config's `center` longitude slightly westward so the pin renders roughly one-third from the left edge of the SVG. Cards (which default to the right of the pin) then have the full right portion of the viewport.

**Offset magnitude:** At scale `×14` (the city zoom scale), a longitude offset of `~−0.04°` translates to approximately 25–30% of the viewport width. This is consistent across all German cities since they share the same scale.

**Per-city adjustments:**

| City | Current center | Offset center |
|---|---|---|
| Karlsruhe | `[8.4037, 49.0069]` | `[8.36, 49.0069]` |
| Mannheim | `[8.466, 49.4875]` | `[8.42, 49.4875]` |
| Darmstadt | `[8.6512, 49.8728]` | `[8.61, 49.8728]` |
| Adelaide | `[138.6007, −34.9285]` | `[138.56, −34.9285]` |

Note: exact values are to be verified empirically during implementation — the numbers above are starting estimates. Mobile breakpoint (`< 768px`) may need a smaller offset since cards are narrower (`280px` vs `370px`).

### Files changed

- `src/components/portfolio/MapTimeline.tsx` — update `PROJECTION_CONFIGS` center coordinates for the four city-level entries.

---

## Feature 2: Satellite Image Backdrop

### Assets

Four pre-downloaded aerial WebP images committed to `public/images/cities/`:

| File | City |
|---|---|
| `public/images/cities/karlsruhe.webp` | Karlsruhe city center |
| `public/images/cities/mannheim.webp` | Mannheim city center |
| `public/images/cities/darmstadt.webp` | Darmstadt city center |
| `public/images/cities/adelaide.webp` | Adelaide city center |

**Image requirements:**
- Format: WebP (fallback PNG acceptable)
- Minimum resolution: 1200×900px
- Coverage: approximately 5×5 km bounding box around the city center pin coordinate
- Source: public aerial imagery (e.g. Google Maps, Bing Maps, or similar screenshot at high zoom)
- The image should be centered on the pin's lat/lng so it registers correctly with the projected pin position

### Rendering

An `<img>` element is inserted as a sibling below the D3 `<svg>` inside the map container. Both are `position: absolute; inset: 0`. The SVG sits on top via z-index.

**Visibility logic:**
- Detail chapters (`DETAIL_CHAPTERS = {1, 3, 5, 7, 8}`) → image fades in (`opacity: 0 → 1`, 300ms ease-in)
- All other chapters → image fades out (`opacity: 1 → 0`, 300ms ease-out)
- Image `src` is set to the active city's satellite image path; it updates when the chapter changes

**SVG overlay behavior during detail chapters:**
- The filled country/region SVG `<path>` elements (Germany outline, land fills, ocean fill, rivers) are set to `opacity: 0` during detail chapters so the aerial image shows through cleanly. These are the paths rendered by D3's `geoPath()` from the GeoJSON layers.
- The `<g id="pins-group">` (needles, heads, pulse rings) remains visible on top of the satellite image
- The vignette `<div>` overlay remains on top
- The existing frosted-glass cards remain on top of everything
- For Adelaide, chapters 7 and 8 both map to the same `LOCATION_PINS` entry (chapterIndex 7). The same `adelaide.webp` image is shown for both chapters — no special handling needed since the active satellite image is derived from the active detail-chapter's matching pin entry.

### City config addition

Each entry in `LOCATION_PINS` gains a `satelliteImage` field:

```ts
const LOCATION_PINS = [
  { key: 'karlsruhe', lat: 49.0069, lng: 8.4037, chapterIndex: 1, phase: 'germany', satelliteImage: '/images/cities/karlsruhe.webp' },
  { key: 'mannheim',  lat: 49.4875, lng: 8.466,  chapterIndex: 3, phase: 'germany', satelliteImage: '/images/cities/mannheim.webp'  },
  { key: 'darmstadt', lat: 49.8728, lng: 8.6512, chapterIndex: 5, phase: 'germany', satelliteImage: '/images/cities/darmstadt.webp' },
  { key: 'adelaide',  lat: -34.9285, lng: 138.6007, chapterIndex: 7, phase: 'australia', satelliteImage: '/images/cities/adelaide.webp' },
];
```

### Files changed

- `public/images/cities/` — add four WebP image assets
- `src/components/portfolio/MapTimeline.tsx`:
  - Add `satelliteImage` field to `LOCATION_PINS` entries and the `LocationPin` type
  - Add `SatelliteBackdrop` sub-component (or inline `<img>`) with fade transition
  - Hide map path outlines during detail chapters

---

## Out of Scope

- No 3D camera, pitch, bearing, or rotation
- No scroll-driven pan within a city chapter
- No change to chapter count, `CHAPTER_BOUNDS`, or scroll architecture
- No tile-based map library (Mapbox, MapLibre, etc.)
- No change to card layout logic beyond what offset zoom naturally improves

---

## Implementation Order

1. Add `satelliteImage` field to `LOCATION_PINS` type definition
2. Download and commit the four aerial images to `public/images/cities/`
3. Implement `SatelliteBackdrop` component with fade transitions
4. Hide path outlines during detail chapters
5. Update `PROJECTION_CONFIGS` center coordinates for offset zoom
6. Verify pin + card layout at all four cities across desktop and mobile breakpoints
