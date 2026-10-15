// Elevation profile (SVG) on a TIME axis: x = active (night-free) replay time, y = height. Orange gradient fill,
// checkpoint labels with thin vertical lines, media markers (clustered so they never overlap) and a scrub cursor.
// Drawn in real pixels (viewBox = element size) so circles and text are never stretched; redrawn on resize.
import type { Loaded, Itinerary } from './data';
import { alongAt, fromActive, toActive, activeDuration, trailAt } from './data';
const NS = 'http://www.w3.org/2000/svg';
const TICK_M = 100; const LABEL_STEPS = [100, 200, 500, 1000];
export interface ChartCp { id: string; short: string; full: string; t: number }
export interface ChartMedia { id: string; t: number; kind: 'image' | 'video' }
export type ChartHit = { kind: 'cp'; id: string; t: number } | { kind: 'media'; ids: string[]; t: number };
const fmt = (s: number) => { const d = ((s % 86400) + 86400) % 86400; return `${String(Math.floor(d / 3600)).padStart(2, '0')}:${String(Math.floor(d / 60) % 60).padStart(2, '0')}`; };

export function createChart(svg: SVGSVGElement, L: Loaded, I: Itinerary, onScrub: (active: number) => void) {
  const T = L.trail; const dur = activeDuration(I);
  const ele = (active: number) => trailAt(T, alongAt(I, fromActive(I, active)))[2];
  let W = 1000, H = 170; const pad = { l: 46, r: 14, t: 56, b: 20 };
  const x = (a: number) => pad.l + (a / dur) * (W - pad.l - pad.r);
  const y = (h: number) => pad.t + (1 - (h - 1700) / (4300 - 1700)) * (H - pad.t - pad.b);
  const el = <K extends keyof SVGElementTagNameMap>(k: K, a: Record<string, string | number>, parent: Element = svg) => { const e = document.createElementNS(NS, k); for (const [n, v] of Object.entries(a)) e.setAttribute(n, String(v)); parent.appendChild(e); return e; };
  let cps: ChartCp[] = [], med: ChartMedia[] = [], onHit: (h: ChartHit) => void = () => {};
  let pos = 0, activeCp = '';
  let clipRect: SVGRectElement, cursor: SVGLineElement, dot: SVGCircleElement, cpGroups = new Map<string, SVGGElement>();

  function draw() {
    const r = svg.getBoundingClientRect(); W = Math.max(300, Math.round(r.width)); H = Math.max(120, Math.round(r.height));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.innerHTML = ''; cpGroups = new Map();
    const defs = el('defs', {});
    const gr = el('linearGradient', { id: 'chfill', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: 0, 'stop-color': '#ff8a3d', 'stop-opacity': 0.55 }, gr); el('stop', { offset: 1, 'stop-color': '#ff8a3d', 'stop-opacity': 0.02 }, gr);
    const cp = el('clipPath', { id: 'chpassed' }, defs); clipRect = el('rect', { x: 0, y: 0, width: 0, height: H }, cp);
    // axes
    // light gridline every 100 m; labels on 100 m steps, thinned to 200 / 500 / 1000 m when closer than 14 px
    const ticks: number[] = []; for (let h = Math.ceil(1700 / TICK_M) * TICK_M; h <= 4300; h += TICK_M) ticks.push(h);
    const pxPerM = Math.abs(y(0) - y(1)); const lstep = LABEL_STEPS.find((st) => st * pxPerM >= 14) ?? 1000;
    ticks.forEach((h) => { el('line', { x1: pad.l, x2: W - pad.r, y1: y(h), y2: y(h), class: 'grid', 'data-h': h });
      if (h % lstep === 0) el('text', { x: pad.l - 8, y: y(h) + 3.5, class: 'ax ytick', 'text-anchor': 'end' }).textContent = h.toLocaleString('en'); });
    const step = W < 600 ? 4 * 3600 : 2 * 3600;
    for (let c = Math.ceil(I.start / step) * step; c <= I.end; c += step) {
      if (c > I.gap.from && c < I.gap.to) continue;
      const a = toActive(I, c); const tx = x(a); if (tx < pad.l + 40 || tx > W - pad.r - 40) continue;
      el('line', { x1: tx, x2: tx, y1: H - pad.b, y2: H - pad.b + 3, class: 'tick' }); el('text', { x: tx, y: H - 5, class: 'ax', 'text-anchor': 'middle' }).textContent = fmt(c);
    }
    el('text', { x: pad.l, y: H - 5, class: 'ax', 'text-anchor': 'start' }).textContent = fmt(I.start);
    el('text', { x: W - pad.r, y: H - 5, class: 'ax', 'text-anchor': 'end' }).textContent = fmt(I.end);
    const gx = x(toActive(I, I.gap.from)); el('line', { x1: gx, x2: gx, y1: pad.t - 4, y2: H - pad.b, class: 'gap' });
    el('text', { x: gx + 4, y: H - pad.b - 4, class: 'ax night' }).textContent = '☾';
    // profile
    const N = Math.min(700, W); const pts: string[] = [];
    for (let i = 0; i <= N; i++) { const a = (i / N) * dur; pts.push(`${i ? 'L' : 'M'}${x(a).toFixed(1)},${y(ele(a)).toFixed(1)}`); }
    const d = pts.join(''); const area = `${d}L${x(dur)},${H - pad.b}L${x(0)},${H - pad.b}Z`;
    el('path', { d: area, class: 'area' }); el('path', { d: area, class: 'area on', 'clip-path': 'url(#chpassed)' });
    el('path', { d, class: 'profile' }); el('path', { d, class: 'profile on', 'clip-path': 'url(#chpassed)' });
    // checkpoints: short code above a thin vertical line; full name stays in the tooltip
    // codes go in rows 0-2, skipped (line only) if no row fits
    const rows: number[] = []; const cw = 6.2;
    for (const c of cps) {
      const tx = x(toActive(I, c.t)); const g = el('g', { class: 'mk cp', transform: `translate(${tx.toFixed(1)},0)` });
      el('title', {}, g).textContent = c.full;
      const half = (c.short.length * cw) / 2 + 4; let row = 0; while (row <= 2 && rows[row] != null && tx - half < rows[row]) row++;
      const shown = row <= 2; if (shown) rows[row] = tx + half; const ly = shown ? 11 + row * 11 : 11 + 2 * 11;
      el('line', { y1: ly + 4, y2: y(ele(toActive(I, c.t))), class: 'cpline' }, g);
      const tl = el('text', { y: ly, class: `cplabel${shown ? '' : ' hid'}`, 'text-anchor': 'middle' }, g); tl.textContent = c.short;
      el('rect', { x: -half, y: ly - 10, width: 2 * half, height: 14, class: 'hit' }, g);
      g.addEventListener('pointerdown', (e) => e.stopPropagation());
      g.addEventListener('click', () => onHit({ kind: 'cp', id: c.id, t: c.t })); cpGroups.set(c.id, g);
    }
    // media markers: greedy clustering in pixel space so circles never overlap
    const R = W < 600 ? 8 : 9; const sorted = [...med].sort((a, b) => a.t - b.t); const clusters: { x: number; items: ChartMedia[] }[] = [];
    for (const m of sorted) { const mx = x(toActive(I, m.t)); const last = clusters[clusters.length - 1]; if (last && mx - last.x < 2 * R + 3) { last.items.push(m); last.x = (last.x * (last.items.length - 1) + mx) / last.items.length; } else clusters.push({ x: mx, items: [m] }); }
    // keep cluster centres apart after averaging
    for (let i = 1; i < clusters.length; i++) clusters[i].x = Math.max(clusters[i].x, clusters[i - 1].x + 2 * R + 3);
    for (const c of clusters) {
      const a = Math.max(0, Math.min(dur, ((c.x - pad.l) / (W - pad.l - pad.r)) * dur)); const cy = y(ele(a));
      const g = el('g', { class: `mk media${c.items.length > 1 ? ' cluster' : ''}`, transform: `translate(${c.x.toFixed(1)},${cy.toFixed(1)})` });
      el('title', {}, g).textContent = c.items.length > 1 ? `${c.items.length}` : c.items[0].kind;
      el('circle', { r: R, class: 'mdot' }, g);
      if (c.items.length > 1) el('text', { y: 3.5, class: 'mcount', 'text-anchor': 'middle' }, g).textContent = String(c.items.length);
      else if (c.items[0].kind === 'video') el('path', { d: 'M-2.5,-4L4,0L-2.5,4Z', class: 'mico' }, g);
      else { el('rect', { x: -4, y: -3.2, width: 8, height: 6.4, rx: 1, class: 'mico-o' }, g); el('path', { d: 'M-3,2.2L-0.8,-0.6L0.8,1L2,0L3,2.2Z', class: 'mico' }, g); }
      g.addEventListener('pointerdown', (e) => e.stopPropagation());
      g.addEventListener('click', () => onHit({ kind: 'media', ids: c.items.map((m) => m.id), t: c.items[0].t }));
    }
    cursor = el('line', { y1: pad.t - 6, y2: H - pad.b, class: 'cursor' }); dot = el('circle', { r: 4, class: 'cdot' });
    apply();
  }
  function apply() {
    if (!cursor) return; const cx = x(pos);
    cursor.setAttribute('x1', cx.toFixed(1)); cursor.setAttribute('x2', cx.toFixed(1)); dot.setAttribute('cx', cx.toFixed(1)); dot.setAttribute('cy', y(ele(pos)).toFixed(1));
    clipRect.setAttribute('width', String(Math.max(0, cx)));
    for (const [id, g] of cpGroups) g.classList.toggle('active', id === activeCp);
  }
  let dragging = false;
  const toActiveX = (ev: PointerEvent) => { const r = svg.getBoundingClientRect(); const px = ((ev.clientX - r.left) / r.width) * W; return Math.max(0, Math.min(dur, ((px - pad.l) / (W - pad.l - pad.r)) * dur)); };
  svg.addEventListener('pointerdown', (e) => { dragging = true; svg.setPointerCapture(e.pointerId); onScrub(toActiveX(e)); });
  svg.addEventListener('pointermove', (e) => { if (dragging) onScrub(toActiveX(e)); });
  svg.addEventListener('pointerup', () => { dragging = false; });
  new ResizeObserver(() => draw()).observe(svg);
  return {
    set(list: ChartCp[], media: ChartMedia[], hit: (h: ChartHit) => void) { cps = list; med = media; onHit = hit; draw(); },
    setPosition(active: number, cpId: string) { pos = active; activeCp = cpId; apply(); },
  };
}
