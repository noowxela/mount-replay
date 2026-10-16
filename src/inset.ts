// Location inset: dotted world globe and Malaysia, marker on Mount Kinabalu.
import type { Outline } from './data';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Orthographic point, or null on the far side. Centre faces SE Asia. */
function globePoint(lat: number, lon: number, c: number, r: number): [number, number] | null {
  const λ = (lon * Math.PI) / 180, φ = (lat * Math.PI) / 180;
  const λ0 = (105 * Math.PI) / 180, φ0 = (12 * Math.PI) / 180;
  const x = Math.cos(φ) * Math.sin(λ - λ0);
  const y = Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ - λ0);
  const z = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ - λ0);
  if (z < 0.02) return null;
  return [c + x * r, c - y * r];
}

function graticule(c: number, r: number) {
  const lines: string[] = [];
  const arc = (pts: [number, number][]) => {
    if (pts.length > 1) lines.push(`<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')}"/>`);
  };
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 6) { const p = globePoint(lat, lon, c, r); if (p) pts.push(p); else { arc(pts); pts.length = 0; } }
    arc(pts);
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 4) { const p = globePoint(lat, lon, c, r); if (p) pts.push(p); else { arc(pts); pts.length = 0; } }
    arc(pts);
  }
  return lines.join('');
}

function dotsAlong(pts: [number, number][], step: number, inside: (x: number, y: number) => boolean) {
  const out: string[] = [];
  let prev: [number, number] | null = null, acc = 0;
  const walk = (x: number, y: number) => {
    if (!inside(x, y)) { prev = null; acc = 0; return; }
    if (!prev) { prev = [x, y]; acc = 0; return; }
    const dx = x - prev[0], dy = y - prev[1], dist = Math.hypot(dx, dy);
    if (dist < 0.01 || dist > 28) { prev = [x, y]; acc = 0; return; }
    let travelled = 0;
    while (acc + (dist - travelled) >= step) {
      const need = step - acc;
      travelled += need; acc = 0;
      const t = travelled / dist;
      const cx = prev[0] + dx * t, cy = prev[1] + dy * t;
      if (inside(cx, cy)) out.push(`<circle class="coast" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.05"/>`);
    }
    acc += dist - travelled;
    prev = [x, y];
  };
  for (const p of pts) walk(p[0], p[1]);
  if (pts.length > 1) walk(pts[0][0], pts[0][1]);
  return out;
}

function limbAngle(x: number, y: number, c: number) { return Math.atan2(y - c, x - c); }

function limbArc(from: [number, number], to: [number, number], c: number, r: number) {
  const a0 = limbAngle(from[0], from[1], c), a1 = limbAngle(to[0], to[1], c);
  let d = a1 - a0;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const steps = Math.max(2, Math.round(Math.abs(d) / 0.18));
  const pts: [number, number][] = [];
  for (let i = 1; i < steps; i++) {
    const a = a0 + d * (i / steps);
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  return pts;
}

function drawGlobe(svg: SVGSVGElement, world: Outline, peak: [number, number]) {
  const c = 60, r = 46;
  svg.setAttribute('viewBox', '0 0 120 120');
  const land: string[] = [];
  for (const ring of world.rings) {
    const vis: ([number, number] | null)[] = ring.map(([lon, lat]) => globePoint(lat, lon, c, r));
    const runs: [number, number][][] = [];
    let run: [number, number][] = [];
    for (const p of vis) { if (p) run.push(p); else if (run.length) { runs.push(run); run = []; } }
    if (run.length) runs.push(run);
    if (!runs.length) continue;
    const wraps = vis[0] && vis[vis.length - 1];
    if (wraps && runs.length > 1) {
      const last = runs.pop()!;
      runs[0] = last.concat(runs[0]);
    }
    for (const pts of runs) {
      if (pts.length < 3) continue;
      const closed = vis.every(Boolean);
      const body = closed ? pts : pts.concat(limbArc(pts[pts.length - 1], pts[0], c, r));
      land.push(`<path class="land" d="${body.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')}Z"/>`);
    }
  }
  const mark = globePoint(peak[0], peak[1], c, r);
  const pin = mark ? `<circle class="ring" cx="${mark[0].toFixed(1)}" cy="${mark[1].toFixed(1)}" r="5.5"/><circle class="core" cx="${mark[0].toFixed(1)}" cy="${mark[1].toFixed(1)}" r="1.6"/>` : '';
  svg.innerHTML = `<defs><clipPath id="globe-clip"><circle cx="${c}" cy="${c}" r="${r}"/></clipPath></defs>
    <circle class="limb" cx="${c}" cy="${c}" r="${r}"/>
    <g clip-path="url(#globe-clip)">${graticule(c, r)}${land.join('')}</g>${pin}`;
}

function drawMalaysia(svg: SVGSVGElement, my: Outline, peak: [number, number], name: string) {
  const [x0, y0, x1, y1] = my.bbox ?? [99.4, 0.8, 119.6, 7.6];
  const pad = 6, top = 18, inner = 148, m = 0.35;
  const west = x0 - m, east = x1 + m, south = y0 - m, north = y1 + m;
  const W = inner + pad * 2;
  const H = top + inner * ((north - south) / (east - west)) + 4;
  svg.setAttribute('viewBox', `0 0 ${W} ${H.toFixed(0)}`);
  const X = (lon: number) => pad + ((lon - west) / (east - west)) * inner;
  const Y = (lat: number) => top + ((north - lat) / (north - south)) * (H - top - 4);
  const inside = (x: number, y: number) => x >= 2 && y >= 2 && x <= W - 2 && y <= H - 2;
  const land: string[] = [];
  for (const ring of my.rings) land.push(...dotsAlong(ring.map(([lon, lat]) => [X(lon), Y(lat)]), 2.0, inside));
  const [plat, plon] = peak;
  const px = X(plon), py = Y(plat);
  svg.innerHTML = `${land.join('')}
    <line class="leader" x1="${(px + 6).toFixed(1)}" y1="${py.toFixed(1)}" x2="${Math.min(W - 4, px + 22).toFixed(1)}" y2="${py.toFixed(1)}"/>
    <circle class="ring" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5.2"/>
    <circle class="core" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="1.5"/>
    <text class="peak" x="${Math.min(W - 8, Math.max(8, px - 4)).toFixed(1)}" y="${(py - 9).toFixed(1)}" text-anchor="end">${esc(name)}</text>`;
}

export function drawLocation(globe: SVGSVGElement, inset: SVGSVGElement, world: Outline, malaysia: Outline, peak: [number, number], peakName: string) {
  drawGlobe(globe, world, peak);
  drawMalaysia(inset, malaysia, peak, peakName);
}
