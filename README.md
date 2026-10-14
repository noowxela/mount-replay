# mount-replay

A 3D replay of the two-day **Mount Kinabalu** climb (Sabah, Malaysia): Timpohon Gate (1,866 m) → Laban Rata (3,270 m, overnight) → Sayat-Sayat → Low's Peak (4,095 m) and back, on Copernicus GLO-30 terrain drawn as a dot cloud with 100 m contours. Add your own photos and videos: they are placed on the trail from their GPS or capture time, entirely in the browser.

**Live (after the first deploy):** https://noowxela.github.io/mount-replay/

## Run

```sh
npm ci
npm run dev          # http://localhost:5173
npm run typecheck && npm run i18n && npm run build
npx vite preview --port 4173 &  node scripts/smoke.mjs   # Playwright smoke check + screenshots (needs local Chrome)
```

## What is sourced and what is typical

| Item | Source |
|---|---|
| Terrain | Copernicus GLO-30 DEM (a DSM, 1 arcsec), tiles N05/N06 E116, resampled to 721×721 (~30.6 m) over 22×22 km: `public/data/terrain.bin` (int16), built by `scripts/bake.py` |
| Trail | OpenStreetMap ways "Timpohon Summit Trail", "Summit Trail", "Kinabalu Summit Trail" (Overpass, 2026-10-14). 8.0 km, slightly shorter than the ~8.7 km on the signposts |
| Shelters, Sayat-Sayat, peaks, km posts | OSM nodes and their `ele` tags |
| Timpohon Gate 1,866 m, Laban Rata 3,270 m, Low's Peak 4,095 m, walking times (3–6 h, 2–4 h) | Wikipedia, "Mount Kinabalu" (fetched 2026-10-14) |
| Borneo inset | Natural Earth 1:10m land (public domain) |
| **Timeline** | **Typical** two-day guided climb (08:00 start, overnight at Laban Rata, 02:30 summit start, sunrise on top). Labelled "TYPICAL" in the UI; not a recording |

The DEM is a surface model smoothed to 30 m, so the summit reads ~4,017–4,056 m on the grid; labels use the cited heights. Heights are exaggerated 1.6×.

## Photos and videos

Files are read with the File API and never uploaded. Images: EXIF capture time and GPS via [exifr](https://github.com/MikeKovarik/exifr) (JPEG, HEIC, PNG, WebP). Videos: creation time from the QuickTime/MP4 `mvhd` atom (UTC, shown in UTC+8) and an ISO 6709 location if present. With GPS within 400 m of the trail the item snaps to the nearest trail point; with a time only it is placed on the typical timeline (set the Day 1 date and the camera clock offset). HEIC that the browser cannot decode shows a placeholder, metadata still used.

## Structure

`src/data.ts` loading, timeline · `src/terrain.ts` Three.js scene and cameras · `src/chart.ts` elevation profile · `src/media.ts` import and placement · `src/inset.ts` location inset · `src/i18n.ts` EN/中文/BM · `scripts/bake.py` data prep · `scripts/smoke.mjs` check.

## Licences and attribution

Code: not yet licensed (owner to choose). Data: © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; © OpenStreetMap contributors (ODbL); Natural Earth (public domain). Ideas for the presentation came from a public demo; no code was copied.
