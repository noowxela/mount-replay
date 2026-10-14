// Data loading and the hike timeline. Terrain: Copernicus GLO-30, baked by scripts/bake.py. Trail and checkpoints:
// OpenStreetMap. The itinerary times are TYPICAL (see ITINERARY) and are labelled as such in the UI.
export interface TerrainMeta { n: number; halfSize: number; spacing: number; origin: [number, number]; min: number; max: number; source: string }
export interface Checkpoint { id: string; osm: number; lat: number; lon: number; x: number; z: number; along: number; snapM: number; ele: number; eleSrc: 'osm' | 'wikipedia'; osmEle: number | null; demEle: number }
export interface Peak { name: string; x: number; z: number; demEle: number; osm: number }
export interface TrailData {
  trail: { points: [number, number, number, number][]; length: number; source: string };
  checkpoints: Checkpoint[]; places: { id: string; x: number; z: number; demEle: number }[]; peaks: Peak[]; kmMarkers: { label: string; along: number }[];
}
export interface Inset { source: string; bbox: [number, number, number, number]; rings: [number, number][][] }

export async function loadAll(base = './data/') {
  const [meta, bin, trail, inset] = await Promise.all([
    fetch(base + 'terrain.json').then((r) => r.json() as Promise<TerrainMeta>),
    fetch(base + 'terrain.bin').then((r) => r.arrayBuffer()),
    fetch(base + 'trail.json').then((r) => r.json() as Promise<TrailData>),
    fetch(base + 'inset.json').then((r) => r.json() as Promise<Inset>),
  ]);
  return { meta, heights: new Int16Array(bin), trail, inset };
}
export type Loaded = Awaited<ReturnType<typeof loadAll>>;

/** Bilinear terrain height (m) at local x (east) / z (south), metres from the grid centre. */
export function heightAt(L: Loaded, x: number, z: number) {
  const { n, halfSize } = L.meta; const s = (2 * halfSize) / (n - 1);
  const fx = Math.min(n - 1.001, Math.max(0, (x + halfSize) / s)), fz = Math.min(n - 1.001, Math.max(0, (z + halfSize) / s));
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, H = L.heights;
  const a = H[j * n + i], b = H[j * n + i + 1], c = H[(j + 1) * n + i], d = H[(j + 1) * n + i + 1];
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
/** Local metres -> lat/lon (equirectangular around the grid origin, as in bake.py). */
export function toLatLon(L: Loaded, x: number, z: number) {
  const [lat0, lon0] = L.meta.origin; const mlon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return { lat: lat0 - z / 110574, lon: lon0 + x / mlon };
}
export function toLocal(L: Loaded, lat: number, lon: number) {
  const [lat0, lon0] = L.meta.origin; const mlon = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return { x: (lon - lon0) * mlon, z: (lat0 - lat) * 110574 };
}

// ---------- timeline ----------
// Times are seconds from 00:00 of day 1, Malaysia time (UTC+8). TYPICAL itinerary, not a record:
//  - Timpohon Gate -> Laban Rata "3 to 6 hours" and Laban Rata -> Low's Peak "2 to 4 hours" (Wikipedia, Mount Kinabalu,
//    fetched 2026-10-14); the clock times (08:00 start, 02:30 summit start, sunrise at the top) are the common pattern
//    of guided two-day climbs and are labelled "typical" in the UI.
export interface Key { t: number; along: number; label?: string }
const h = (d: number, hh: number, mm = 0) => (d - 1) * 86400 + hh * 3600 + mm * 60;
export function buildItinerary(T: TrailData) {
  const cp = (id: string) => T.checkpoints.find((c) => c.id === id)!.along;
  const keys: Key[] = [
    { t: h(1, 8, 0), along: cp('timpohon'), label: 'start' },
    { t: h(1, 13, 0), along: cp('labanrata'), label: 'arriveLR' },
    // overnight at Laban Rata: 13:00 day 1 -> 02:30 day 2 (dinner, sleep, summit breakfast)
    { t: h(2, 2, 30), along: cp('labanrata'), label: 'departLR' },
    { t: h(2, 5, 45), along: cp('lowspeak'), label: 'summit' },
    { t: h(2, 6, 15), along: cp('lowspeak'), label: 'leaveSummit' },
    { t: h(2, 8, 30), along: cp('labanrata'), label: 'backLR' },
    { t: h(2, 10, 30), along: cp('labanrata'), label: 'departLR2' },
    { t: h(2, 14, 0), along: cp('timpohon'), label: 'finish' },
  ];
  const gap = { from: h(1, 13, 0), to: h(2, 2, 30) };
  return { keys, gap, start: keys[0].t, end: keys[keys.length - 1].t };
}
export type Itinerary = ReturnType<typeof buildItinerary>;
/** Position along the trail (m) at time t. Linear between the keyframes (a typical pace, not a measured one). */
export function alongAt(I: Itinerary, t: number) {
  const k = I.keys; if (t <= k[0].t) return k[0].along; if (t >= k[k.length - 1].t) return k[k.length - 1].along;
  let i = 0; while (k[i + 1].t < t) i++;
  const a = k[i], b = k[i + 1]; return a.along + ((b.along - a.along) * (t - a.t)) / (b.t - a.t);
}
/** First time the walker is at `along` on the ascent (or on the descent when `descent`). */
export function timeAtAlong(I: Itinerary, along: number, descent = false) {
  const k = I.keys; const summitIdx = k.findIndex((x) => x.label === 'summit');
  const range = descent ? [summitIdx + 1, k.length - 1] : [0, summitIdx];
  for (let i = range[0]; i < range[1]; i++) {
    const a = k[i], b = k[i + 1]; const lo = Math.min(a.along, b.along), hi = Math.max(a.along, b.along);
    if (along >= lo - 1e-6 && along <= hi + 1e-6 && a.along !== b.along) return a.t + ((along - a.along) / (b.along - a.along)) * (b.t - a.t);
  }
  return descent ? I.end : I.start;
}
/** Active (gap-free) seconds <-> clock seconds, so the scrub bar skips the night. */
export function toActive(I: Itinerary, t: number) { const g = I.gap; return t <= g.from ? t - I.start : t >= g.to ? t - I.start - (g.to - g.from) : g.from - I.start; }
export function fromActive(I: Itinerary, a: number) { const g = I.gap; const t = I.start + a; return t <= g.from ? t : t + (g.to - g.from); }
export function activeDuration(I: Itinerary) { return I.end - I.start - (I.gap.to - I.gap.from); }

/** Trail point (x, z, ele, along) at a distance along the trail, interpolated. */
export function trailAt(T: TrailData, along: number) {
  const p = T.trail.points; let lo = 0, hi = p.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (p[m][3] < along) lo = m + 1; else hi = m; }
  const b = p[lo], a = p[Math.max(0, lo - 1)]; const f = b[3] === a[3] ? 0 : (along - a[3]) / (b[3] - a[3]);
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, along] as [number, number, number, number];
}
export function nearestAlong(T: TrailData, x: number, z: number) {
  let best = Infinity, along = 0;
  for (const p of T.trail.points) { const d = (p[0] - x) ** 2 + (p[1] - z) ** 2; if (d < best) { best = d; along = p[3]; } }
  return { along, dist: Math.sqrt(best) };
}
