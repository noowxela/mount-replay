// Elevation profile (SVG): trail distance on x, height on y, checkpoint labels, photo markers and a scrub cursor.
import type { Loaded } from './data';
const NS = 'http://www.w3.org/2000/svg';
export interface ChartMarker { along: number; label?: string; kind: 'cp' | 'media'; id: string }
export function createChart(svg: SVGSVGElement, L: Loaded, onScrub: (along: number) => void) {
  const pts = L.trail.trail.points; const len = L.trail.trail.length;
  const W = 1000, H = 220, pad = { l: 44, r: 12, t: 40, b: 24 };
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none');
  const x = (a: number) => pad.l + (a / len) * (W - pad.l - pad.r);
  const y = (h: number) => pad.t + (1 - (h - 1700) / (4200 - 1700)) * (H - pad.t - pad.b);
  const el = <K extends keyof SVGElementTagNameMap>(k: K, a: Record<string, string | number>, parent: Element = svg) => { const e = document.createElementNS(NS, k); for (const [n, v] of Object.entries(a)) e.setAttribute(n, String(v)); parent.appendChild(e); return e; };
  svg.innerHTML = '';
  for (const h of [2000, 2500, 3000, 3500, 4000]) { el('line', { x1: pad.l, x2: W - pad.r, y1: y(h), y2: y(h), class: 'grid' }); el('text', { x: pad.l - 6, y: y(h) + 4, class: 'ax', 'text-anchor': 'end' }).textContent = String(h); }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p[3]).toFixed(1)},${y(p[2]).toFixed(1)}`).join('');
  el('path', { d: `${d}L${x(len)},${H - pad.b}L${x(0)},${H - pad.b}Z`, class: 'area' });
  el('path', { d, class: 'profile' });
  const passed = el('path', { d: '', class: 'passed' });
  const markers = el('g', {}); const cursor = el('line', { y1: pad.t - 6, y2: H - pad.b, class: 'cursor' });
  let dragging = false;
  const toAlong = (ev: PointerEvent) => { const r = svg.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W; return Math.max(0, Math.min(len, ((px - pad.l) / (W - pad.l - pad.r)) * len)); };
  svg.addEventListener('pointerdown', (e) => { dragging = true; svg.setPointerCapture(e.pointerId); onScrub(toAlong(e)); });
  svg.addEventListener('pointermove', (e) => { if (dragging) onScrub(toAlong(e)); });
  svg.addEventListener('pointerup', () => { dragging = false; });
  return {
    setMarkers(list: ChartMarker[], onClick: (m: ChartMarker) => void) {
      markers.innerHTML = '';
      let row = 0;
      for (const m of list) {
        const g = el('g', { class: `mk ${m.kind}`, transform: `translate(${x(m.along).toFixed(1)},0)` }, markers);
        if (m.kind === 'cp') { el('line', { y1: pad.t - 4, y2: H - pad.b, class: 'cpline' }, g); const tx = el('text', { y: 12 + (row++ % 3) * 11, class: 'cplabel', 'text-anchor': 'middle' }, g); tx.textContent = m.label ?? ''; }
        else { const hh = pts[Math.min(pts.length - 1, Math.round((m.along / len) * (pts.length - 1)))][2]; el('circle', { cy: y(hh), r: 6, class: 'mediadot' }, g); }
        g.addEventListener('click', (ev) => { ev.stopPropagation(); onClick(m); });
      }
    },
    setPosition(along: number, walkedTo: number) {
      cursor.setAttribute('x1', x(along).toFixed(1)); cursor.setAttribute('x2', x(along).toFixed(1));
      const sub = pts.filter((p) => p[3] <= walkedTo); passed.setAttribute('d', sub.map((p, i) => `${i ? 'L' : 'M'}${x(p[3]).toFixed(1)},${y(p[2]).toFixed(1)}`).join(''));
    },
  };
}
