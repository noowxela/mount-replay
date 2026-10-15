# Architecture

Vite + TypeScript app. One page (`index.html`) renders a Three.js terrain, an SVG elevation chart, and side panels. No backend. Photos stay in the browser.

## Stack

- Vite 6, TypeScript, Three.js
- `exifr` for photo and video metadata; `libheif-js` in a worker for HEIC
- IndexedDB for imported files on this device
- GitHub Pages at `https://noowxela.github.io/mount-replay/` (`base: './'`)

## Data flow

`scripts/bake.py` writes `public/data/` once (terrain grid, OSM trail, Borneo inset). `src/data.ts` loads that and builds the typical two-day itinerary. `src/main.ts` owns the clock, cameras, labels, and photo placement. `src/terrain.ts` draws the DEM. `src/chart.ts` draws the elevation panel.

## Page identity

The header mark and favicon share one monoline ridge (`#ff8a3d` on `#0b0d0e`). The Open Graph image is a 1200×630 crop of the 3D trail view. Share tags live in `index.html` because crawlers do not run the script that localizes `document.title`.
