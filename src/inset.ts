// Location inset: Borneo (Natural Earth outline) with Kinabalu marked.
import type { Inset } from './data';
export function drawInset(svg: SVGSVGElement, I: Inset, peak: [number, number], labels: { borneo: string; sabah: string; kk: string; peak: string }) {
  const [x0, y0, x1, y1] = I.bbox; const W = 240, H = 240 * ((y1 - y0) / (x1 - x0));
  svg.setAttribute('viewBox', `0 0 ${W} ${H.toFixed(0)}`);
  const X = (lon: number) => ((lon - x0) / (x1 - x0)) * W, Y = (lat: number) => ((y1 - lat) / (y1 - y0)) * H;
  const paths = I.rings.map((r) => `<path d="${r.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('')}Z"/>`).join('');
  const [plat, plon] = peak; const kk = [5.98, 116.07];
  svg.innerHTML = `<g class="land">${paths}</g>
    <text class="lbl big" x="${X(113.6)}" y="${Y(0.8)}">${labels.borneo}</text>
    <text class="lbl" x="${X(117.0)}" y="${Y(5.0)}">${labels.sabah}</text>
    <circle class="kk" cx="${X(kk[1])}" cy="${Y(kk[0])}" r="2.2"/><text class="lbl sm" x="${X(kk[1]) - 4}" y="${Y(kk[0]) + 10}" text-anchor="end">${labels.kk}</text>
    <rect class="frame" x="${(X(plon - 0.9)).toFixed(1)}" y="${(Y(plat + 0.75)).toFixed(1)}" width="${(X(plon + 0.9) - X(plon - 0.9)).toFixed(1)}" height="${(Y(plat - 0.75) - Y(plat + 0.75)).toFixed(1)}"/>
    <circle class="pk-pulse" cx="${X(plon)}" cy="${Y(plat)}" r="7"/><circle class="pk" cx="${X(plon)}" cy="${Y(plat)}" r="3.2"/>
    <text class="lbl pkl" x="${X(plon) + 7}" y="${Y(plat) - 6}">${labels.peak}</text>`;
}
