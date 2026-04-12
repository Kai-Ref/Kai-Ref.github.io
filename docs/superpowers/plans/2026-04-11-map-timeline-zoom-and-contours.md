# Map Timeline — GTA-Style Zoom Transitions & Australia Contour Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the chapter sequence so every city transition mimics a GTA map zoom — pull back to the Germany overview between each city, then zoom into the next — and fix the D3 data-join key collision that causes Australia state borders to render incorrectly.

**Architecture:** All changes are confined to `src/components/portfolio/MapTimeline.tsx`. Two orthogonal changes: (1) expand `CHAPTER_BOUNDS` from 7 to 9 chapters, add per-chapter projection configs (including two `germany_overview` pull-back chapters), and update all downstream logic that maps chapters to projections/pins/cards; (2) fix the D3 `.data(features, keyFn)` key function to produce globally unique keys across all three GeoJSON datasets, and move hover color state into SVG `data-*` attributes to eliminate a stale-closure bug that leaves ghost contours on phase transitions.

**Tech Stack:** React 19, D3 v7, Framer Motion 12, TypeScript, Astro 5. No new dependencies.

---

## New Chapter Sequence

```
ch0  → germany_overview    fade in, no pins yet           (0.00 – 0.08)
ch1  → germany_karlsruhe   zoom in, Karlsruhe pin drops   (0.08 – 0.20)
ch2  → germany_overview    pull back, KA pin stays        (0.20 – 0.28)
ch3  → germany_mannheim    zoom in, Mannheim pin drops     (0.28 – 0.40)
ch4  → germany_overview    pull back, KA+MA pins stay     (0.40 – 0.48)
ch5  → germany_darmstadt   zoom in, Darmstadt pin drops   (0.48 – 0.60)
ch6  → world               zoom out to globe — departing  (0.60 – 0.72)
ch7  → australia           zoom in to Adelaide            (0.72 – 0.88)
ch8  → australia           outro, Adelaide pin stays      (0.88 – 1.00)
```

Total: 9 chapters (indices 0–8). Scroll height stays `400svh`.

**Pin visibility rules (updated):**
- Germany pins show when `phase.startsWith('germany')` — i.e. chapters 0–5. Pull-back chapters (2, 4) show accumulated pins from prior zoomed chapters.
- `isPinActive` logic stays: a pin renders once `currentChapter >= pin.chapterIndex`.
- All pins hidden during ch6 (world), as before.
- Adelaide pin shows from ch7 onward.

**Card visibility rules (updated):**
- Germany cards show only during the zoomed-in city chapter for that location (ch1 for Karlsruhe, ch3 for Mannheim, ch5 for Darmstadt). They do **not** show during pull-back chapters (would be off-screen / wrong projection anyway).
- Adelaide cards show from ch7 onward.

**ChapterLabel copy (updated):**
```
ch0 → top: 'Germany'       sub: 'scroll to explore'
ch1 → top: 'Karlsruhe'     sub: 'Baden-Württemberg, Germany'
ch2 → top: 'Mannheim'      sub: 'next stop ↓'
ch3 → top: 'Mannheim'      sub: 'Baden-Württemberg, Germany'
ch4 → top: 'Darmstadt'     sub: 'next stop ↓'
ch5 → top: 'Darmstadt'     sub: 'Hessen, Germany'
ch6 → top: 'Departing'     sub: 'Europe → Australia'
ch7 → top: 'Adelaide'      sub: 'South Australia'
ch8 → top: 'Adelaide'      sub: 'South Australia'
```

---

## File Structure

| File | Change |
|------|--------|
| `src/components/portfolio/MapTimeline.tsx` | All changes — chapter bounds, projection configs, `getMapPhase`, `LOCATION_PINS`, `ChapterLabel`, card filter, pin visibility, D3 key function, hover handlers |

No other files change. `global.css`, `timeline.json`, GeoJSON files are untouched.

---

## Background: Root Cause of Australia Contour Bug

The current D3 key function is:
```ts
(d: any) => d.id ?? d.properties?.name ?? d.properties?.NAME ?? JSON.stringify(d.properties)
```

Australia features have `f.id = 0, 1, … 7` (numeric integers, all truthy or zero). The `??` operator only falls through on `null`/`undefined` — not on `0`. So `f.id = 0` evaluates as `0 ?? ...` → `0`. D3 serialises join keys to strings internally, so `0` becomes `"0"`.

Germany's single feature also has `f.id = 0`, so it also gets key `"0"`. When transitioning Germany → World → Australia, D3 may match Australia feature `id=0` against Germany's stale DOM node (key `"0"`) still in the update set, so it morphs the Germany path into an Australia path rather than doing a clean exit/enter. The remaining Australia features (keys `1–7`) enter fresh, but key `"0"` gets a corrupted update — producing one broken contour.

Fix: prefix keys with a dataset tag so they are globally unique:
```ts
(d: any) => {
  if (d.properties?.STATE_NAME) return `au:${d.properties.STATE_NAME}`;
  if (d.properties?.name)       return `w:${d.properties.name}`;
  return `g:${String(d.id ?? 0)}`;
}
```

Additionally, the `mouseover`/`mouseout` handlers close over `fillColor` (a `let` variable set before the D3 block). When the component re-renders for a new chapter, `fillColor` changes — but the handlers already attached to existing DOM nodes still hold the old value. The `mouseout` handler then resets fill to the wrong color after a transition, leaving ghost tints. Fix: store `data-fill` and `data-dataset` attributes on each path and read from the DOM inside the handlers instead of the closure.

---

## Task 1: Expand chapter bounds and projection configs

**Files:**
- Modify: `src/components/portfolio/MapTimeline.tsx` lines 22–65

**What this task does:** Replace the 7-chapter `CHAPTER_BOUNDS` and 3-entry `PROJECTION_CONFIGS` with a 9-chapter sequence and 6 projection configs. Update `getMapPhase` to return the right config key per chapter. Keep everything else unchanged for now (downstream logic updated in Task 2).

- [ ] **Step 1: Read current constants**

Read `src/components/portfolio/MapTimeline.tsx` lines 22–66 to see the current `TOTAL_SVH`, `CHAPTER_BOUNDS`, `PROJECTION_CONFIGS`, `LOCATION_PINS`, and `getMapPhase`.

- [ ] **Step 2: Replace `CHAPTER_BOUNDS`**

Find and replace the entire `CHAPTER_BOUNDS` constant:

```ts
// Each chapter has start/end fractions of total scroll
const CHAPTER_BOUNDS = [
  { start: 0.00, end: 0.08 }, // 0: intro — Germany overview, no pins
  { start: 0.08, end: 0.20 }, // 1: zoom into Karlsruhe
  { start: 0.20, end: 0.28 }, // 2: pull back — Germany overview, KA pin stays
  { start: 0.28, end: 0.40 }, // 3: zoom into Mannheim
  { start: 0.40, end: 0.48 }, // 4: pull back — Germany overview, KA+MA pins stay
  { start: 0.48, end: 0.60 }, // 5: zoom into Darmstadt
  { start: 0.60, end: 0.72 }, // 6: zoom out to world — departing
  { start: 0.72, end: 0.88 }, // 7: zoom into Adelaide, Australia
  { start: 0.88, end: 1.00 }, // 8: outro — Adelaide
];
```

- [ ] **Step 3: Replace `PROJECTION_CONFIGS`**

Find and replace the entire `PROJECTION_CONFIGS` constant:

```ts
// D3 geoMercator projection configs per map phase.
// center is [lng, lat] (D3 Mercator convention — longitude first).
// scale is a function of viewport dimensions for responsiveness.
const PROJECTION_CONFIGS = {
  germany_overview: {
    getScale: (w: number, h: number) => Math.min(w, h) * 3.5,
    center: [10.45, 51.16] as [number, number], // geographic center of Germany
    geoDataset: 'germany' as const,
  },
  germany_karlsruhe: {
    getScale: (w: number, h: number) => Math.min(w, h) * 14,
    center: [8.4037, 49.0069] as [number, number], // Karlsruhe [lng, lat]
    geoDataset: 'germany' as const,
  },
  germany_mannheim: {
    getScale: (w: number, h: number) => Math.min(w, h) * 14,
    center: [8.466, 49.4875] as [number, number], // Mannheim [lng, lat]
    geoDataset: 'germany' as const,
  },
  germany_darmstadt: {
    getScale: (w: number, h: number) => Math.min(w, h) * 14,
    center: [8.6512, 49.8728] as [number, number], // Darmstadt [lng, lat]
    geoDataset: 'germany' as const,
  },
  world: {
    getScale: (w: number, h: number) => Math.min(w, h) * 0.18,
    center: [20.0, 20.0] as [number, number],
    geoDataset: 'world' as const,
  },
  australia: {
    getScale: (w: number, h: number) => Math.min(w, h) * 1.2,
    center: [134.0, -25.0] as [number, number],
    geoDataset: 'australia' as const,
  },
};
```

- [ ] **Step 4: Add `MapPhase` type and replace `getMapPhase`**

Add the type alias immediately before the function, then replace the function body:

```ts
type MapPhase = keyof typeof PROJECTION_CONFIGS;

function getMapPhase(chapter: number): MapPhase {
  if (chapter === 0) return 'germany_overview';
  if (chapter === 1) return 'germany_karlsruhe';
  if (chapter === 2) return 'germany_overview';
  if (chapter === 3) return 'germany_mannheim';
  if (chapter === 4) return 'germany_overview';
  if (chapter === 5) return 'germany_darmstadt';
  if (chapter === 6) return 'world';
  return 'australia'; // chapters 7 and 8
}
```

- [ ] **Step 5: Update `LOCATION_PINS` chapter indices**

The pins need updated `chapterIndex` values to match the new chapter numbering:

```ts
const LOCATION_PINS = [
  { key: 'karlsruhe', lat: 49.0069, lng: 8.4037,   chapterIndex: 1, phase: 'germany' as const },
  { key: 'mannheim',  lat: 49.4875, lng: 8.466,     chapterIndex: 3, phase: 'germany' as const },
  { key: 'darmstadt', lat: 49.8728, lng: 8.6512,    chapterIndex: 5, phase: 'germany' as const },
  { key: 'adelaide',  lat: -34.9285, lng: 138.6007, chapterIndex: 7, phase: 'australia' as const },
];
```

- [ ] **Step 6: Run build — expect TypeScript errors**

```bash
npm run build
```

There will be TypeScript errors at this point because `getMapPhase` still returns `MapPhase` but the downstream logic uses it with `phase === 'germany'` comparisons that no longer match the new phase names. The errors will guide Task 2. Record the errors and proceed to Task 2.

- [ ] **Step 7: Commit**

```bash
git add src/components/portfolio/MapTimeline.tsx
git commit -m "feat: expand to 9-chapter GTA-zoom sequence with per-city projection configs"
```

---

## Task 2: Update downstream logic to match new chapter/phase model

**Files:**
- Modify: `src/components/portfolio/MapTimeline.tsx` (D3 render `useEffect`s, card filter, pin visibility, progress bar, scroll indicator, chapter label)

**What this task does:** Fix every place that used the old `phase === 'germany'` / `phase === 'world'` / `phase === 'australia'` comparison. Switch to using `config.geoDataset` where a dataset is needed and `phase.startsWith('germany')` where German chapter grouping is needed. Also update the scroll indicator fade-out chapter and the progress bar color logic for the new chapter count.

- [ ] **Step 1: Read the full file**

Read the complete `src/components/portfolio/MapTimeline.tsx`. Focus on: the D3 map render `useEffect` (~line 447–538), the D3 pin render `useEffect` (~line 540–632), the card overlay JSX (~line 706–732), the progress bar JSX (~line 688–698), the scroll indicator JSX (~line 763–782).

- [ ] **Step 2: Fix D3 map render `useEffect` — geoData selection**

Find the block inside the map render `useEffect` that selects the geo dataset. Replace:

```ts
// OLD:
let geoData: any = null;
if (phase === 'germany') geoData = germanyGeo;
else if (phase === 'world') geoData = worldGeo;
else geoData = australiaGeo || worldGeo;
```

With:

```ts
// NEW:
const config = PROJECTION_CONFIGS[phase];
let geoData: any = null;
if (config.geoDataset === 'germany') geoData = germanyGeo;
else if (config.geoDataset === 'world') geoData = worldGeo;
else geoData = australiaGeo || worldGeo;
```

Note: there may already be a `const config = PROJECTION_CONFIGS[phase]` line — if so, remove the duplicate and keep one.

- [ ] **Step 3: Fix D3 map render `useEffect` — fill/stroke colors**

Find:
```ts
const fillColor   = phase === 'australia' ? '#1a3030' : '#1a2a4a';
const strokeColor = phase === 'australia' ? '#2a6a5a' : '#3a6aaa';
```

Replace with:
```ts
const fillColor   = config.geoDataset === 'australia' ? '#1a3030' : '#1a2a4a';
const strokeColor = config.geoDataset === 'australia' ? '#2a6a5a' : '#3a6aaa';
```

- [ ] **Step 4: Fix D3 pin render `useEffect` — phase match guard**

Inside the pin render `useEffect`, find:
```ts
if (pin.phase !== phase) return;
```

Replace with:
```ts
const pinPhaseMatch = phase.startsWith('germany') ? 'germany' : phase;
if (pin.phase !== pinPhaseMatch) return;
```

- [ ] **Step 5: Fix D3 pin render `useEffect` — world chapter hide**

Find:
```ts
pinsGroup.attr('opacity', currentChapter === 4 ? 0 : 1);
```

Replace with (world is now chapter 6):
```ts
pinsGroup.attr('opacity', currentChapter === 6 ? 0 : 1);
```

- [ ] **Step 6: Fix card overlay filter**

Find the `.filter(group => { ... })` block in the cards overlay JSX. Replace:

```tsx
// OLD:
.filter(group => {
  if (group.phase === 'germany') return currentChapter >= group.chapterIndex && currentChapter <= 3;
  if (group.phase === 'australia') return currentChapter >= group.chapterIndex && currentChapter <= 6;
  return false;
})
```

With:

```tsx
// NEW — cards only show during the zoomed-in chapter for that city,
// not during pull-back overview chapters.
.filter(group => {
  if (group.phase === 'germany') {
    // Karlsruhe cards: ch1 only
    if (group.key === 'karlsruhe') return currentChapter === 1;
    // Mannheim cards: ch3 only
    if (group.key === 'mannheim')  return currentChapter === 3;
    // Darmstadt cards: ch5 only
    if (group.key === 'darmstadt') return currentChapter === 5;
    return false;
  }
  if (group.phase === 'australia') return currentChapter >= group.chapterIndex && currentChapter <= 8;
  return false;
})
```

- [ ] **Step 7: Fix progress bar color**

Find the progress bar `background` style. The current logic colors the bar green for chapters 5–6 (Australia). Update for the new chapter numbering (Australia is now chapters 7–8):

```tsx
// OLD:
background: currentChapter === 5 || currentChapter === 6
  ? 'linear-gradient(to right, #2a6a5a, #00d399)'
  : 'linear-gradient(to right, #00bcd4, #ff6b35)',
```

```tsx
// NEW:
background: currentChapter >= 7
  ? 'linear-gradient(to right, #2a6a5a, #00d399)'
  : 'linear-gradient(to right, #00bcd4, #ff6b35)',
```

- [ ] **Step 8: Fix scroll indicator fade-out**

Find:
```tsx
animate={{ opacity: currentChapter >= 5 ? 0 : 0.5 }}
```

Replace with (fade out at chapter 7+, i.e. once in Australia):
```tsx
animate={{ opacity: currentChapter >= 7 ? 0 : 0.5 }}
```

- [ ] **Step 9: Run build**

```bash
npm run build
```

Expected: 0 TypeScript errors, 8 pages built. Fix any remaining type errors — they will be from any stray `phase === 'germany'` or `phase === 'world'` comparisons not yet updated. Use `grep` to find them:

```bash
grep -n "phase === " src/components/portfolio/MapTimeline.tsx
```

Any hit that isn't using `pin.phase` or `group.phase` needs to be updated to use `config.geoDataset` or `phase.startsWith('germany')`.

- [ ] **Step 10: Commit**

```bash
git add src/components/portfolio/MapTimeline.tsx
git commit -m "feat: update all chapter/phase downstream logic for 9-chapter GTA zoom sequence"
```

---

## Task 3: Update `ChapterLabel` copy

**Files:**
- Modify: `src/components/portfolio/MapTimeline.tsx` (`ChapterLabel` function, lines ~79–131)

**What this task does:** Replace the 7-entry `LABELS` map with a 9-entry version matching the new chapter sequence. The pull-back chapters (2 and 4) show a "next stop" hint.

- [ ] **Step 1: Replace `LABELS` inside `ChapterLabel`**

Find the `const LABELS: Record<number, ...>` object inside `ChapterLabel`. Replace it entirely:

```ts
const LABELS: Record<number, { top: string; sub: string } | null> = {
  0: { top: 'Germany',    sub: 'scroll to explore' },
  1: { top: 'Karlsruhe',  sub: 'Baden-Württemberg, Germany' },
  2: { top: 'Mannheim',   sub: 'next stop ↓' },
  3: { top: 'Mannheim',   sub: 'Baden-Württemberg, Germany' },
  4: { top: 'Darmstadt',  sub: 'next stop ↓' },
  5: { top: 'Darmstadt',  sub: 'Hessen, Germany' },
  6: { top: 'Departing',  sub: 'Europe → Australia' },
  7: { top: 'Adelaide',   sub: 'South Australia' },
  8: { top: 'Adelaide',   sub: 'South Australia' },
};
```

- [ ] **Step 2: Update the orange color condition**

The label for chapter 4 (old "Departing") was colored orange (`#ff6b35`). In the new sequence, "Departing" is chapter 6. Also color the pull-back chapters (2, 4) with the orange accent to give them a cinematic "in transit" feel.

Find:
```tsx
color: chapter === 4 ? '#ff6b35' : '#e8f4fd',
```

Replace:
```tsx
color: (chapter === 2 || chapter === 4 || chapter === 6) ? '#ff6b35' : '#e8f4fd',
```

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: 0 errors, 8 pages.

- [ ] **Step 4: Commit**

```bash
git add src/components/portfolio/MapTimeline.tsx
git commit -m "feat: update chapter labels for 9-chapter GTA zoom sequence"
```

---

## Task 4: Fix Australia D3 key collision and stale hover handlers

**Files:**
- Modify: `src/components/portfolio/MapTimeline.tsx` (D3 map render `useEffect`, enter/update/exit blocks)

**What this task does:** Fix the root cause of missing Australia state borders: the D3 key function produces numeric `"0"–"7"` keys for Australia features which collide with Germany's `"0"` key, causing one Australia state to morph from Germany's DOM node rather than entering clean. Fix also moves hover color state into SVG `data-*` attributes to prevent stale closures from overwriting transition fill values.

- [ ] **Step 1: Read the D3 map render `useEffect`**

Read `src/components/portfolio/MapTimeline.tsx` from the `// D3 map rendering` comment to the closing `}, [germanyGeo, worldGeo, australiaGeo, svgSize, currentChapter]);` line. Note the current `.data(features, keyFn)`, `paths.enter()`, and `paths` (update) blocks.

- [ ] **Step 2: Replace the D3 key function**

Find the `.data(features, ...)` call. Replace the key function argument:

```ts
// OLD key function:
(d: any) => d.id ?? d.properties?.name ?? d.properties?.NAME ?? JSON.stringify(d.properties)

// NEW key function:
(d: any) => {
  // Australia: f.id is 0-7 (number, falsy for 0), so use STATE_NAME
  if (d.properties?.STATE_NAME) return `au:${d.properties.STATE_NAME}`;
  // World: f.properties.name is ISO country name
  if (d.properties?.name)       return `w:${d.properties.name}`;
  // Germany: single feature, f.id = 0
  return `g:${String(d.id ?? 0)}`;
}
```

The full `.data(...)` call becomes:

```ts
const paths = mapGroup
  .selectAll<SVGPathElement, any>('path.geo-feature')
  .data(features, (d: any) => {
    if (d.properties?.STATE_NAME) return `au:${d.properties.STATE_NAME}`;
    if (d.properties?.name)       return `w:${d.properties.name}`;
    return `g:${String(d.id ?? 0)}`;
  });
```

- [ ] **Step 3: Replace the enter block**

Replace the entire `paths.enter()` chain (currently lines ~500–511) with:

```ts
paths.enter()
  .append('path')
  .attr('class', 'geo-feature')
  .attr('data-fill', fillColor)
  .attr('data-dataset', config.geoDataset)
  .attr('fill', fillColor)
  .attr('stroke', strokeColor)
  .attr('stroke-width', 0.8)
  .attr('opacity', 0)
  .attr('d', (d: any) => pathGen(d) ?? '')
  .on('mouseover', function(this: SVGPathElement) {
    d3.select(this).attr('fill', this.dataset.dataset === 'australia' ? '#243a3a' : '#243a5e');
  })
  .on('mouseout', function(this: SVGPathElement) {
    d3.select(this).attr('fill', this.dataset.fill ?? '#1a2a4a');
  })
  .transition().duration(600)
  .attr('opacity', 1);
```

Key changes from the old enter block:
- Added `data-fill` and `data-dataset` attributes before the transition.
- Hover handlers use `this.dataset.fill` / `this.dataset.dataset` (read from DOM, not closure).
- Handlers are typed `function(this: SVGPathElement)` to avoid the D3 `this` typing issue.
- Handlers are set on **enter only** — not re-attached on update, so they never interrupt transitions.

- [ ] **Step 4: Replace the update block**

Replace the second `paths` chain (the update block, currently lines ~513–520):

```ts
paths
  .attr('data-fill', fillColor)
  .attr('data-dataset', config.geoDataset)
  .transition().duration(600)
  .attr('d', (d: any) => pathGen(d) ?? '')
  .attr('fill', fillColor)
  .attr('stroke', strokeColor);
```

Key changes:
- `data-fill` and `data-dataset` updated **before** the transition (no `transition()` on those attrs), so handlers read correct values immediately.
- No `mouseover`/`mouseout` re-attachment — handlers remain from enter.

- [ ] **Step 5: Run build**

```bash
npm run build
```

Expected: 0 TypeScript errors. If TypeScript complains about `this.dataset` on `SVGPathElement`, confirm the `function(this: SVGPathElement)` syntax is present. If it still errors, add a `// @ts-ignore` comment above the `.on(...)` lines as a last resort (document it with a comment explaining D3's `this` typing quirk).

- [ ] **Step 6: Commit**

```bash
git add src/components/portfolio/MapTimeline.tsx
git commit -m "fix: D3 prefixed key function and data-attr hover handlers eliminate Australia contour ghost"
```

---

## Task 5: Verify end-to-end

**Files:**
- Read-only verification + build check

- [ ] **Step 1: Run final build**

```bash
npm run build
```

Expected:
```
[build] 8 page(s) built in X.XXs
[build] Complete!
```

Zero errors or warnings. If any errors remain, fix before proceeding.

- [ ] **Step 2: Verify chapter bounds**

Read `src/components/portfolio/MapTimeline.tsx` and confirm:
- `CHAPTER_BOUNDS` has exactly 9 entries (indices 0–8)
- First entry starts at `0.00`, last ends at `1.00`
- No gaps between adjacent entries (each `end` equals the next `start`)

- [ ] **Step 3: Verify projection configs**

Confirm `PROJECTION_CONFIGS` has exactly 6 keys: `germany_overview`, `germany_karlsruhe`, `germany_mannheim`, `germany_darmstadt`, `world`, `australia`. Each has `getScale`, `center`, and `geoDataset`.

- [ ] **Step 4: Verify `getMapPhase` covers all chapters**

Confirm `getMapPhase` returns:
- `'germany_overview'` for 0, 2, 4
- `'germany_karlsruhe'` for 1
- `'germany_mannheim'` for 3
- `'germany_darmstadt'` for 5
- `'world'` for 6
- `'australia'` for 7 and 8

- [ ] **Step 5: Verify LOCATION_PINS chapter indices**

Confirm:
- karlsruhe → `chapterIndex: 1`
- mannheim  → `chapterIndex: 3`
- darmstadt → `chapterIndex: 5`
- adelaide  → `chapterIndex: 7`

- [ ] **Step 6: Verify world-chapter pin hide**

Confirm `pinsGroup.attr('opacity', currentChapter === 6 ? 0 : 1)` (chapter 6, not 4).

- [ ] **Step 7: Verify D3 key function**

Confirm the `.data(features, keyFn)` key function uses `au:` prefix for `STATE_NAME`, `w:` prefix for `properties.name`, and `g:` fallback.

- [ ] **Step 8: Commit if any fixes were made**

If any step above required a fix:
```bash
git add src/components/portfolio/MapTimeline.tsx
git commit -m "fix: verification pass for GTA zoom sequence and Australia contours"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| GTA-style zoom: pull back to overview between cities | Task 1 (ch2, ch4 = `germany_overview` pull-backs) |
| Start on Germany overview, zoom into Karlsruhe first | Task 1 (ch0 = overview, ch1 = Karlsruhe) |
| Each city gets its own zoomed projection | Task 1 (`germany_karlsruhe`, `germany_mannheim`, `germany_darmstadt` configs) |
| Transition to Adelaide via world zoom-out | Tasks 1–2 (ch6 = world, ch7 = australia, unchanged logic) |
| Australia contours render correctly | Task 4 (prefixed key function + data-attr hover fix) |
| All pins accumulate and show on overview pull-backs | Task 2, Step 4 (`pinPhaseMatch = startsWith('germany')`) |
| Cards only show during zoomed-in city chapters | Task 2, Step 6 (per-key card filter) |
| Chapter labels match new sequence | Task 3 |
| Build passes, no TypeScript errors | Tasks 1–5 |

**Placeholder scan:** No TBDs, no vague steps. All code shown in full.

**Type consistency:**
- `MapPhase = keyof typeof PROJECTION_CONFIGS` covers all 6 phase names used in `getMapPhase`.
- `config.geoDataset` typed as `'germany' | 'world' | 'australia'` via `as const` — consistent in all color/dataset comparisons.
- `pin.phase` and `group.phase` remain `'germany' | 'australia'` — consistent with `startsWith('germany')` and `=== 'australia'` comparisons in Tasks 2 and 3.
- `LOCATION_PINS[*].chapterIndex` updated to 1/3/5/7 in Task 1, Step 5 — matches `getMapPhase` chapter numbers.
- `currentChapter === 6` for world-phase pin hide (Task 2, Step 5) matches `getMapPhase` returning `'world'` for chapter 6.
