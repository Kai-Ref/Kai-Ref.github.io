# Map City View Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the city detail view in the portfolio map timeline by (1) shifting the projection center so the city pin sits left-of-center with room for cards on the right, and (2) showing a pre-downloaded aerial satellite image behind the D3 SVG when zoomed into a city.

**Architecture:** The map is a custom D3.js SVG rendered in `MapTimeline.tsx`. For the offset zoom, we adjust the `center` coordinates in `PROJECTION_CONFIGS` for each city-level phase. For the satellite backdrop, we add a `<img>` element as an absolutely-positioned sibling beneath the SVG, keyed to the active detail chapter, with CSS fade transitions. The D3 GeoJSON path layers are hidden during detail chapters so the aerial image shows through. No new libraries are introduced.

**Tech Stack:** React 19, D3 v7, Framer Motion v12, Astro 5, TypeScript, Tailwind CSS

---

## File Map

| File | Change |
|---|---|
| `src/components/portfolio/MapTimeline.tsx` | Add `satelliteImage` to `LOCATION_PINS` type + data; update `PROJECTION_CONFIGS` center offsets; add `SatelliteBackdrop` component; hide geo path layers during detail chapters |
| `public/images/cities/karlsruhe.webp` | New aerial image asset |
| `public/images/cities/mannheim.webp` | New aerial image asset |
| `public/images/cities/darmstadt.webp` | New aerial image asset |
| `public/images/cities/adelaide.webp` | New aerial image asset |

---

## Task 1: Create `public/images/cities/` directory and add placeholder images

The image assets need to exist before the component references them. In this task we create the directory and add placeholder files so the build doesn't break. Real images will be swapped in Task 4.

**Files:**
- Create: `public/images/cities/` (directory)
- Create: `public/images/cities/karlsruhe.webp` (placeholder — 1×1 transparent WebP)
- Create: `public/images/cities/mannheim.webp`
- Create: `public/images/cities/darmstadt.webp`
- Create: `public/images/cities/adelaide.webp`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p public/images/cities
```

- [ ] **Step 2: Create 1×1 transparent WebP placeholders using ImageMagick (if available) or copy a tiny WebP**

```bash
# If ImageMagick is installed:
convert -size 1x1 xc:none public/images/cities/karlsruhe.webp
convert -size 1x1 xc:none public/images/cities/mannheim.webp
convert -size 1x1 xc:none public/images/cities/darmstadt.webp
convert -size 1x1 xc:none public/images/cities/adelaide.webp
```

If ImageMagick is not installed, create them with Python:

```bash
python3 -c "
import struct, zlib

def make_webp_1x1():
    # Minimal 1x1 transparent WebP (RIFF container)
    # This is a known-good 1x1 transparent WebP binary
    data = bytes([
        0x52,0x49,0x46,0x46,0x24,0x00,0x00,0x00,0x57,0x45,0x42,0x50,
        0x56,0x50,0x38,0x4C,0x17,0x00,0x00,0x00,0x2F,0x00,0x00,0x00,
        0x00,0x00,0xFE,0xFF,0x00,0xFE,0xFF,0x00,0xFF,0xFF,0xFF,0x00,
        0xFF,0xFF,0xFF,0x00,0x00
    ])
    return data

webp = make_webp_1x1()
for name in ['karlsruhe','mannheim','darmstadt','adelaide']:
    with open(f'public/images/cities/{name}.webp','wb') as f:
        f.write(webp)
print('done')
"
```

- [ ] **Step 3: Verify files exist**

```bash
ls -lh public/images/cities/
```

Expected output: four `.webp` files.

- [ ] **Step 4: Commit**

```bash
git add public/images/cities/
git commit -m "feat: add city satellite image placeholders"
```

---

## Task 2: Update `LOCATION_PINS` type and data to include `satelliteImage`

**Files:**
- Modify: `src/components/portfolio/MapTimeline.tsx` — lines 113–118 (LOCATION_PINS array) and the `ProjectedGroup` interface area

- [ ] **Step 1: Add `satelliteImage` field to the inline LOCATION_PINS array**

In `MapTimeline.tsx`, find the `LOCATION_PINS` constant (currently lines 113–118):

```ts
const LOCATION_PINS = [
  { key: 'karlsruhe', lat: 49.0069, lng: 8.4037,    chapterIndex: 1, phase: 'germany'   as const },
  { key: 'mannheim',  lat: 49.4875, lng: 8.466,      chapterIndex: 3, phase: 'germany'   as const },
  { key: 'darmstadt', lat: 49.8728, lng: 8.6512,     chapterIndex: 5, phase: 'germany'   as const },
  { key: 'adelaide',  lat: -34.9285, lng: 138.6007,  chapterIndex: 7, phase: 'australia' as const },
];
```

Replace it with:

```ts
const LOCATION_PINS = [
  { key: 'karlsruhe', lat: 49.0069, lng: 8.4037,   chapterIndex: 1, phase: 'germany'   as const, satelliteImage: '/images/cities/karlsruhe.webp' },
  { key: 'mannheim',  lat: 49.4875, lng: 8.466,     chapterIndex: 3, phase: 'germany'   as const, satelliteImage: '/images/cities/mannheim.webp'  },
  { key: 'darmstadt', lat: 49.8728, lng: 8.6512,    chapterIndex: 5, phase: 'germany'   as const, satelliteImage: '/images/cities/darmstadt.webp' },
  { key: 'adelaide',  lat: -34.9285, lng: 138.6007, chapterIndex: 7, phase: 'australia' as const, satelliteImage: '/images/cities/adelaide.webp'  },
];
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `satelliteImage`.

- [ ] **Step 3: Commit**

```bash
git add src/components/portfolio/MapTimeline.tsx
git commit -m "feat: add satelliteImage field to LOCATION_PINS"
```

---

## Task 3: Add `SatelliteBackdrop` component and wire into render tree

This component renders an `<img>` absolutely positioned beneath the D3 SVG. It fades in when the current chapter is a detail chapter and the active pin has a `satelliteImage`.

**Files:**
- Modify: `src/components/portfolio/MapTimeline.tsx`

- [ ] **Step 1: Add the `SatelliteBackdrop` component**

Add the following component definition in `MapTimeline.tsx`, immediately before the `CardsOverlay` function (around line 527). Insert it as a new top-level function:

```tsx
// ─── Satellite image backdrop ──────────────────────────────────────────────────
function SatelliteBackdrop({ chapter }: { chapter: number }) {
  const isDetail = DETAIL_CHAPTERS.has(chapter);

  // Find the active pin for this chapter
  const activePin = LOCATION_PINS.find(pin => {
    if (pin.phase === 'germany') {
      if (pin.key === 'karlsruhe') return chapter === 1;
      if (pin.key === 'mannheim')  return chapter === 3;
      if (pin.key === 'darmstadt') return chapter === 5;
      return false;
    }
    // australia: chapters 7 and 8 both show adelaide
    return pin.phase === 'australia' && chapter >= pin.chapterIndex;
  });

  const imageSrc = isDetail && activePin ? activePin.satelliteImage : null;

  return (
    <AnimatePresence>
      {imageSrc && (
        <motion.img
          key={imageSrc}
          src={imageSrc}
          alt=""
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeIn' }}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            zIndex: 0,
          }}
        />
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Add `SatelliteBackdrop` to the render tree**

In the `return` block of `MapTimeline` (around line 1077), the sticky viewport div currently has this structure:

```tsx
{/* D3 SVG map layer */}
<svg
  ref={svgRef}
  className="absolute inset-0 w-full h-full"
  aria-hidden="true"
  style={{ willChange: 'transform' }}
/>
```

Add `<SatelliteBackdrop>` immediately before the SVG:

```tsx
{/* Satellite aerial backdrop (detail chapters only) */}
<SatelliteBackdrop chapter={currentChapter} />

{/* D3 SVG map layer */}
<svg
  ref={svgRef}
  className="absolute inset-0 w-full h-full"
  aria-hidden="true"
  style={{ willChange: 'transform', position: 'relative', zIndex: 1 }}
/>
```

Note: add `position: 'relative', zIndex: 1` to the SVG's inline style so it sits above the backdrop image.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Start the dev server and confirm the component renders without errors**

```bash
npm run dev
```

Open the portfolio page. With placeholder images, nothing visible will change yet, but the browser console should show no errors. The satellite backdrop is present in the DOM during detail chapters (inspect with DevTools).

- [ ] **Step 5: Commit**

```bash
git add src/components/portfolio/MapTimeline.tsx
git commit -m "feat: add SatelliteBackdrop component with fade transition"
```

---

## Task 4: Hide D3 GeoJSON path layers during detail chapters

When a satellite image is visible, the SVG country/land/river/lake paths should be transparent so the aerial shows through. The ocean background rect can remain (it provides the dark fallback color). The pins layer stays visible.

**Files:**
- Modify: `src/components/portfolio/MapTimeline.tsx` — `renderFrame` function inside the D3 map rendering `useEffect` (lines ~747–877)

- [ ] **Step 1: Compute `isDetailChapter` inside the D3 rendering `useEffect`**

Inside the D3 map rendering `useEffect` (which begins around line 689), find where `renderFrame` is defined. At the very start of `renderFrame`, after the line:

```ts
const renderFrame = (scale: number, center: [number, number], isFirstFrame: boolean) => {
  const proj    = makeProjection(scale, center);
  const pathGen = d3.geoPath().projection(proj);
```

Add:

```ts
  const isDetailChapter = DETAIL_CHAPTERS.has(currentChapter);
```

- [ ] **Step 2: Apply opacity to path layers based on `isDetailChapter`**

After the Natural Earth land paths block (the `landGroup.selectAll(...)` block), add an opacity setter:

```ts
  // Hide geographic path layers when satellite backdrop is visible
  landGroup.attr('opacity', isDetailChapter ? 0 : 1);
  lakesGroup.attr('opacity', isDetailChapter ? 0 : 1);
  riversGroup.attr('opacity', isDetailChapter ? 0 : 1);
  mapGroup.attr('opacity', isDetailChapter ? 0 : 1);
  gratGroup.attr('opacity', isDetailChapter ? 0 : 1);
```

Place this block immediately after all the path-rendering `selectAll` calls but before the graticule block (around line 868). A convenient place is right before the graticule section:

```ts
      // Graticule
      const graticule = d3.geoGraticule().step([10, 10])();
```

Insert before that line:

```ts
      // Hide all geographic layers when satellite backdrop is active
      landGroup.transition().duration(300).attr('opacity', isDetailChapter ? 0 : 1);
      lakesGroup.transition().duration(300).attr('opacity', isDetailChapter ? 0 : 1);
      riversGroup.transition().duration(300).attr('opacity', isDetailChapter ? 0 : 1);
      mapGroup.transition().duration(300).attr('opacity', isDetailChapter ? 0 : 1);
      gratGroup.transition().duration(300).attr('opacity', isDetailChapter ? 0 : 1);
```

The 300ms transition matches the `SatelliteBackdrop` fade duration so they cross-fade cleanly.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Confirm visually in dev server**

```bash
npm run dev
```

Scroll to a detail chapter (chapters 1, 3, 5, 7, 8). The D3 country paths should fade out; the ocean rect background remains; the pins remain. With placeholder images, the ocean background shows through — this is expected until real images are in place.

- [ ] **Step 5: Commit**

```bash
git add src/components/portfolio/MapTimeline.tsx
git commit -m "feat: hide geo path layers during satellite detail chapters"
```

---

## Task 5: Download and commit real aerial satellite images

Replace the placeholder WebP files with genuine aerial imagery for each city. The images should be centered on the pin's coordinates and cover approximately a 5×5 km area.

**Files:**
- Replace: `public/images/cities/karlsruhe.webp`
- Replace: `public/images/cities/mannheim.webp`
- Replace: `public/images/cities/darmstadt.webp`
- Replace: `public/images/cities/adelaide.webp`

**Target coordinates and zoom:**
| City | Lat | Lng | Suggested Google Maps zoom |
|---|---|---|---|
| Karlsruhe | 49.0069 | 8.4037 | zoom 14–15 |
| Mannheim | 49.4875 | 8.466 | zoom 14–15 |
| Darmstadt | 49.8728 | 8.6512 | zoom 14–15 |
| Adelaide | -34.9285 | 138.6007 | zoom 13–14 |

- [ ] **Step 1: Download aerial images**

Open each city in Google Maps (or Bing Maps) satellite view. Center the map on the coordinates above. Take a screenshot at minimum 1200×900px resolution. Crop to a rectangular area. Save as WebP at quality 80–90 (use `cwebp`, Squoosh, or similar).

Alternatively, use the Mapbox Static Images API (no charge for low volume) with a URL like:
```
https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/{lng},{lat},14,0/1200x900?access_token=YOUR_TOKEN
```

Or use Google Maps Static API:
```
https://maps.googleapis.com/maps/api/staticmap?center={lat},{lng}&zoom=14&size=1200x900&maptype=satellite&key=YOUR_KEY
```

- [ ] **Step 2: Convert to WebP if needed**

```bash
cwebp -q 85 karlsruhe.png -o public/images/cities/karlsruhe.webp
cwebp -q 85 mannheim.png  -o public/images/cities/mannheim.webp
cwebp -q 85 darmstadt.png -o public/images/cities/darmstadt.webp
cwebp -q 85 adelaide.png  -o public/images/cities/adelaide.webp
```

Or using ffmpeg:
```bash
ffmpeg -i karlsruhe.png -c:v libwebp -quality 85 public/images/cities/karlsruhe.webp
```

- [ ] **Step 3: Verify file sizes are reasonable**

```bash
ls -lh public/images/cities/
```

Expected: each file between 200 KB and 1.5 MB. Larger files should be recompressed.

- [ ] **Step 4: Check images render in dev server**

```bash
npm run dev
```

Scroll to chapter 1 (Karlsruhe). The aerial image should appear behind the SVG pin. Verify for all four cities.

- [ ] **Step 5: Commit**

```bash
git add public/images/cities/
git commit -m "feat: add aerial satellite images for all four cities"
```

---

## Task 6: Update `PROJECTION_CONFIGS` center offsets for offset zoom

Shift each city-level projection center westward so the pin renders approximately one-third from the left edge, leaving space for the description cards on the right.

**Files:**
- Modify: `src/components/portfolio/MapTimeline.tsx` — `PROJECTION_CONFIGS` constant (lines 64–95)

At scale ×14, a longitude shift of `−0.04°` moves the projected point approximately 25–30% of the viewport width westward. Adelaide uses the same scale, so the same offset magnitude applies. These are starting values — verify and tune empirically in the browser.

- [ ] **Step 1: Update the four city center coordinates**

Find `PROJECTION_CONFIGS` in `MapTimeline.tsx` (lines 64–95). Replace the four city entries:

```ts
  germany_karlsruhe: {
    getScale: (w: number, h: number) => Math.min(w, h) * 14,
    center: [8.36, 49.0069] as [number, number],
    geoDataset: 'germany' as const,
  },
  germany_mannheim: {
    getScale: (w: number, h: number) => Math.min(w, h) * 14,
    center: [8.42, 49.4875] as [number, number],
    geoDataset: 'germany' as const,
  },
  germany_darmstadt: {
    getScale: (w: number, h: number) => Math.min(w, h) * 14,
    center: [8.61, 49.8728] as [number, number],
    geoDataset: 'germany' as const,
  },
```

And the australia entry:

```ts
  australia: {
    getScale: (w: number, h: number) => Math.min(w, h) * 1.2,
    center: [134.0, -25.0] as [number, number],
    geoDataset: 'australia' as const,
  },
```

Note: The australia phase is the continent overview — Adelaide's city-level zoom also uses this phase. Check whether a separate `australia_adelaide` phase entry is needed. Looking at `getMapPhase`: chapters 7 and 8 both return `'australia'` with scale ×1.2 — this is a continent-level zoom, not a city zoom. Adelaide does not get a ×14 city zoom in the current architecture. **Therefore, skip the Adelaide longitude offset for now** — it would require adding a new `australia_adelaide` phase to `PROJECTION_CONFIGS` and `getMapPhase`, which is out of scope. Only update the three German city entries.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Check pin positioning in dev server**

```bash
npm run dev
```

Scroll to chapter 1 (Karlsruhe). The pin should appear approximately one-third from the left of the viewport. The description card should appear to the right of the pin with clear space. Check the same for Mannheim (chapter 3) and Darmstadt (chapter 5).

If the pin is too far left or right, adjust the longitude offset:
- More negative → pin moves further left
- Less negative → pin moves closer to center

Typical tuning range: `−0.03` to `−0.06` depending on viewport width.

- [ ] **Step 4: Check mobile layout**

Resize the browser to below 640px width. Cards are 280px wide on mobile vs 370px on desktop. The pin may need to sit slightly further right on narrow screens. If the current offset crowds the pin against the left edge on mobile, consider adding a conditional mobile offset. However, if the layout is acceptable, skip this — YAGNI.

- [ ] **Step 5: Commit**

```bash
git add src/components/portfolio/MapTimeline.tsx
git commit -m "feat: offset city projection centers for pin-left card-right layout"
```

---

## Task 7: Final integration check

Verify all features work together end-to-end.

- [ ] **Step 1: Build the site**

```bash
npm run build
```

Expected: build completes with no errors or warnings about missing assets.

- [ ] **Step 2: Preview the production build**

```bash
npm run preview
```

- [ ] **Step 3: End-to-end scroll through the full timeline**

Check each chapter in order:
- Chapter 0: Germany overview — no satellite image, geo paths visible ✓
- Chapter 1: Karlsruhe — aerial image fades in, geo paths fade out, pin sits left-of-center, cards on right ✓
- Chapter 2: Pull-back — satellite fades out, geo paths fade back in ✓
- Chapter 3: Mannheim — same as chapter 1 ✓
- Chapter 4: Pull-back ✓
- Chapter 5: Darmstadt ✓
- Chapter 6: World zoom-out — no satellite, world view ✓
- Chapter 7: Adelaide — satellite fades in (no offset zoom, continent scale) ✓
- Chapter 8: Adelaide outro — satellite still visible ✓

- [ ] **Step 4: Check no console errors**

Open browser DevTools console. Scroll through all chapters. Expected: no 404s for image assets, no React warnings, no D3 errors.

- [ ] **Step 5: Commit any final fixes, then tag**

```bash
git add -A
git commit -m "fix: integration adjustments for city view enhancements"
```

---

## Notes for implementer

- The `LOCATION_PINS` array doesn't have an explicit TypeScript type annotation — `satelliteImage` is just added as a field and TypeScript infers the type from the array literal. No separate interface change required.
- The `SatelliteBackdrop` component's active-pin matching logic mirrors the logic already in `CardsOverlay` — keep them in sync if chapter mapping ever changes.
- The D3 `useEffect` that renders map paths currently closes over `currentChapter` in the dependency array (`line 904`). `DETAIL_CHAPTERS.has(currentChapter)` works correctly because `currentChapter` is a dependency.
- If the aerial images are large (>1 MB each), consider adding `loading="lazy"` and `fetchPriority` attributes to the `<motion.img>` in `SatelliteBackdrop`.
