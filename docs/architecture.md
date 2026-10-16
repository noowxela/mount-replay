# Architecture

Vite + TypeScript app. One page (`index.html`) renders a Three.js terrain, an SVG elevation chart, and side panels. No backend. Photos stay in the browser.

## Stack

- Vite 6, TypeScript, Three.js
- `exifr` for photo and video metadata; `libheif-js` in a worker for HEIC
- IndexedDB for imported files on this device
- GitHub Pages at `https://noowxela.github.io/mount-replay/` (`base: './'`)

## Data flow

`scripts/bake.py` writes `public/data/` once (terrain grid, OSM trail, world and Malaysia outlines). `src/data.ts` loads that and builds the typical two-day itinerary. `src/main.ts` owns the clock, cameras, labels, and photo placement. `src/terrain.ts` draws the DEM. `src/chart.ts` draws the elevation panel. `src/inset.ts` draws the world globe and the Malaysia map.

## Screen

One page, three regions: the stage (3D map), the aside (info), and the bottom strip (elevation, the location column, and transport). The numbered panels are 01 Live data, 02 Checkpoints, 03 Elevation, 04 Location, 05 Your photos, and 06 Sources & credits. The header toggles show or hide 01, 02, 05, and 06 in the aside, and 04 beside the elevation strip. What each one shows, reads, and does is in `docs/modules.md`. A reload starts with the aside and the chart closed, and every toggle on.

## Page identity

The header mark and favicon share one monoline ridge (`#ff8a3d` on `#0b0d0e`). The Open Graph image is a 1200×630 crop of the 3D trail view. Share tags live in `index.html` because crawlers do not run the script that localizes `document.title`.
