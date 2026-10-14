import './styles.css';
import { loadAll, buildItinerary, alongAt, timeAtAlong, toActive, fromActive, activeDuration, trailAt, nearestAlong, toLocal, type Loaded } from './data';
import { TerrainView, type View } from './terrain';
import { createChart, type ChartMarker } from './chart';
import { drawInset } from './inset';
import { importFiles, disposeMedia, type MediaItem } from './media';
import { t, setLang, getLang, type Lang } from './i18n';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 820px)').matches;
const fmtClock = (s: number) => { const d = ((s % 86400) + 86400) % 86400; return `${String(Math.floor(d / 3600)).padStart(2, '0')}:${String(Math.floor(d / 60) % 60).padStart(2, '0')}`; };
const fmtDur = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}`;

const L: Loaded = await loadAll();
const I = buildItinerary(L.trail);
const T = L.trail; const CP = T.checkpoints; const PTS = T.trail.points;
const view = new TerrainView($('#gl'), L, reduced, mobile);
$('#loading').remove();
const params = new URLSearchParams(location.search);

// ---------- state ----------
let clock = I.start;              // seconds from 00:00 day 1 (UTC+8)
let playing = !reduced && params.get('autoplay') !== '0';
let speed = 600, loop = true, nightUntil = 0, media: MediaItem[] = [];
if (params.has('t')) clock = fromActive(I, (+params.get('t')! / 100) * activeDuration(I));
const indexAt = (along: number) => { let lo = 0, hi = PTS.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (PTS[m][3] < along) lo = m + 1; else hi = m; } const b = PTS[lo], a = PTS[Math.max(0, lo - 1)]; return Math.max(0, lo - 1) + (b[3] === a[3] ? 0 : (along - a[3]) / (b[3] - a[3])); };
const summitT = I.keys.find((k) => k.label === 'summit')!.t;
/** Distance walked so far (m): along the trail up, then back down. */
const walked = (tt: number) => { const a = alongAt(I, tt); return tt <= summitT ? a : T.trail.length * 2 - a; };

// ---------- text ----------
const cpKind = (id: string) => (t().cpKind as Record<string, string>)[id] ?? t().cpKind.shelter;
function applyText() {
  const D = t();
  document.title = `${D.title} · ${D.subtitle}`;
  for (const el of document.querySelectorAll<HTMLElement>('[data-i]')) { const v = (D as unknown as Record<string, unknown>)[el.dataset.i!]; if (typeof v === 'string') el.textContent = v; }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.textContent = D.views[b.dataset.view as keyof typeof D.views];
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  $('#btn-colour').textContent = D.colour; $('#btn-mono').textContent = D.mono;
  $('#sources').innerHTML = D.sources.map((s) => `<li>${s}</li>`).join('');
  $('#cp-list').innerHTML = CP.map((c) => `<li><button data-cp="${c.id}"><b>${D.cp[c.id as keyof typeof D.cp]}</b><span>${c.ele.toLocaleString('en')} ${D.units.m} · ${(c.along / 1000).toFixed(1)} ${D.units.km}</span><i>${cpKind(c.id)} · ${D.eleSrc[c.eleSrc]}</i></button></li>`).join('');
  drawInset($('#inset') as unknown as SVGSVGElement, L.inset, [CP[CP.length - 1].lat, CP[CP.length - 1].lon], { borneo: D.borneo, sabah: D.sabah, kk: D.kk, peak: D.cp.lowspeak });
  buildLabels(); renderMedia(); setPlaying(playing); refreshChartMarkers();
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) b.onclick = () => { setLang(b.dataset.lang as Lang); applyText(); };

// ---------- labels over the 3D view (checkpoints, Park HQ, peaks, media thumbnails) ----------
interface Label { el: HTMLElement; x: number; z: number; lift: number }
let labels: Label[] = [];
function buildLabels() {
  const layer = $('#labels'); layer.innerHTML = ''; labels = [];
  const add = (cls: string, html: string, x: number, z: number, lift = 60, onClick?: () => void) => {
    const el = document.createElement('div'); el.className = `lab ${cls}`; el.innerHTML = html; layer.appendChild(el);
    if (onClick) { el.style.pointerEvents = 'auto'; el.onclick = onClick; }
    labels.push({ el, x, z, lift });
  };
  const D = t();
  for (const c of CP) { const major = ['timpohon', 'labanrata', 'sayat', 'lowspeak'].includes(c.id); if (!major && mobile) continue; add(major ? 'cp major' : 'cp', `<span>${D.cp[c.id as keyof typeof D.cp]}</span>${major ? `<i>${c.ele.toLocaleString('en')} m</i>` : ''}`, c.x, c.z, 60, () => flyToAlong(c.along)); }
  const hq = T.places[0]; add('place', `<span>${D.parkhq}</span>`, hq.x, hq.z);
  for (const m of media) if (m.along != null) { const p = trailAt(T, m.along); add('media-pin', m.thumb ? `<img src="${m.thumb}" alt="">` : `<span class="ph">${m.heic ? 'HEIC' : m.kind === 'video' ? '▶' : '◻'}</span>`, p[0], p[1], 120, () => openViewer(m)); }
}
function placeLabels() {
  const placed: DOMRect[] = [];
  for (const l of labels) {
    const p = view.project(view.worldOf(l.x, l.z, l.lift));
    l.el.style.display = p.visible ? '' : 'none'; if (!p.visible) continue;
    l.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
    if (l.el.classList.contains('cp') && !l.el.classList.contains('major')) { const r = l.el.getBoundingClientRect(); const hit = placed.some((q) => r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top); l.el.style.opacity = hit ? '0' : ''; if (!hit) placed.push(r); }
    else placed.push(l.el.getBoundingClientRect());
  }
}

// ---------- chart ----------
const chart = createChart($('#chart') as unknown as SVGSVGElement, L, (along) => { const up = clock <= summitT; clock = timeAtAlong(I, along, !up); update(); });
function refreshChartMarkers() {
  const D = t(); const list: ChartMarker[] = CP.filter((c) => !mobile || ['timpohon', 'labanrata', 'sayat', 'lowspeak'].includes(c.id)).map((c) => ({ along: c.along, label: D.cp[c.id as keyof typeof D.cp], kind: 'cp', id: c.id }));
  for (const m of media) if (m.along != null) list.push({ along: m.along, kind: 'media', id: m.id });
  chart.setMarkers(list, (m) => { if (m.kind === 'cp') flyToAlong(m.along); else { const it = media.find((x) => x.id === m.id); if (it) { if (it.t != null) clock = it.t; update(); openViewer(it); } } });
}
function flyToAlong(along: number) { clock = timeAtAlong(I, along, clock > summitT); update(); view.setView('follow'); }
document.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cp]'); if (b) { const c = CP.find((x) => x.id === b.dataset.cp)!; flyToAlong(c.along); } });

// ---------- transport ----------
const scrub = $<HTMLInputElement>('#scrub');
function setPlaying(v: boolean) { playing = v; const D = t(); $('#play-ico').textContent = v ? 'Ⅱ' : '▶'; $('#play-txt').textContent = v ? D.pause : clock >= I.end ? D.again : D.play; }
$('#play').onclick = () => { if (!playing && clock >= I.end) clock = I.start; setPlaying(!playing); };
scrub.oninput = () => { clock = fromActive(I, (+scrub.value / 1000) * activeDuration(I)); nightUntil = 0; update(); };
$<HTMLSelectElement>('#speed').onchange = (e) => { speed = +(e.target as HTMLSelectElement).value; };
$('#loop').onclick = () => { loop = !loop; $('#loop').setAttribute('aria-pressed', String(loop)); };
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.onclick = () => view.setView((b.dataset.view === 'reset' ? 'oblique' : b.dataset.view) as View);
view.onViewChange = (v) => { for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === v)); };
view.onViewChange(view.view);
const setTone = (mono: boolean) => { view.setMono(mono); $('#btn-mono').setAttribute('aria-pressed', String(mono)); $('#btn-colour').setAttribute('aria-pressed', String(!mono)); };
$('#btn-colour').onclick = () => setTone(false); $('#btn-mono').onclick = () => setTone(true); setTone(params.get('tone') === 'mono');
document.addEventListener('keydown', (e) => { if ((e.target as HTMLElement).closest('input,select,textarea')) return; if (e.key === ' ') { e.preventDefault(); $('#play').click(); } if (e.key === 'Escape') closeViewer(); });

// night card: entering the overnight gap shows the card, then the clock jumps to the 02:30 start
const night = $('#night');
function showNight(on: boolean) { night.classList.toggle('hidden', !on); }
$('#night-skip').onclick = () => { nightUntil = 0; clock = I.gap.to; showNight(false); update(); };

function update() {
  const a = alongAt(I, clock); const p = trailAt(T, a);
  view.setWalker(indexAt(a));
  const D = t(); const day = clock >= 86400 ? 2 : 1;
  $('#v-clock').textContent = fmtClock(clock); $('#v-day').textContent = `${D.day} ${day}`;
  $('#v-ele').textContent = `${Math.round(p[2]).toLocaleString('en')} ${D.units.m}`;
  $('#v-dist').textContent = `${(walked(clock) / 1000).toFixed(2)} ${D.units.km}`;
  $('#v-elapsed').textContent = fmtDur(toActive(I, clock));
  $('#t-now').textContent = `${D.day} ${day} · ${fmtClock(clock)}`;
  if (document.activeElement !== scrub) scrub.value = String(Math.round((toActive(I, clock) / activeDuration(I)) * 1000));
  chart.setPosition(a, clock <= summitT ? a : T.trail.length);
  const ll = { lat: CP[0].lat, lon: CP[0].lon }; void ll;
}

// ---------- media ----------
const fileIn = $<HTMLInputElement>('#file'); const day1In = $<HTMLInputElement>('#day1'); const offIn = $<HTMLInputElement>('#offset');
fileIn.onchange = async () => { if (!fileIn.files?.length) return; const added = await importFiles(fileIn.files); media.push(...added); fileIn.value = '';
  if (!day1In.value) { const dates = media.map((m) => m.wall?.date).filter(Boolean).sort() as string[]; if (dates.length) day1In.value = dates[0]; }
  placeMedia(); };
day1In.onchange = offIn.onchange = () => placeMedia();
function placeMedia() {
  const day1 = day1In.value ? Date.parse(day1In.value + 'T00:00:00Z') : NaN; const off = +offIn.value || 0;
  for (const m of media) {
    m.along = null; m.t = null; m.how = 'none';
    let tt: number | null = null;
    if (m.wall && Number.isFinite(day1)) { const days = Math.round((Date.parse(m.wall.date + 'T00:00:00Z') - day1) / 86400e3); tt = days * 86400 + m.wall.secs - off * 3600; }
    if (m.lat != null && m.lon != null) {
      const loc = toLocal(L, m.lat, m.lon); const near = nearestAlong(T, loc.x, loc.z);
      if (near.dist < 400) { m.along = near.along; m.how = 'gps'; m.t = tt != null && tt >= I.start && tt <= I.end ? tt : timeAtAlong(I, near.along); continue; }
    }
    if (tt != null) { if (tt >= I.start && tt <= I.end) { m.t = tt; m.along = alongAt(I, tt); m.how = 'time'; } else m.how = 'outside'; }
  }
  media.sort((a, b) => (a.t ?? 1e12) - (b.t ?? 1e12));
  renderMedia(); buildLabels(); refreshChartMarkers();
}
function renderMedia() {
  const D = t(); const ul = $('#media-list');
  if (!media.length) { ul.innerHTML = `<li class="empty">${D.mediaNone}</li>`; return; }
  const how = { gps: D.placedGps, time: D.placedTime, none: D.unplaced, outside: D.outside };
  ul.innerHTML = media.map((m) => `<li data-m="${m.id}" class="${m.how}"><span class="th">${m.thumb ? `<img src="${m.thumb}" alt="">` : `<span class="ph">${m.heic ? 'HEIC' : m.kind === 'video' ? '▶' : '◻'}</span>`}</span><span class="mi"><b>${m.name}</b><i>${how[m.how]}${m.t != null ? ` · ${D.day} ${m.t >= 86400 ? 2 : 1} ${fmtClock(m.t)}` : ''}${m.heic && !m.thumb ? ` · ${D.heicNote}` : ''}</i></span><button class="rm" aria-label="remove">×</button></li>`).join('');
  for (const li of ul.querySelectorAll<HTMLElement>('li[data-m]')) {
    const m = media.find((x) => x.id === li.dataset.m)!;
    li.querySelector('.rm')!.addEventListener('click', (e) => { e.stopPropagation(); disposeMedia(m); media = media.filter((x) => x !== m); renderMedia(); buildLabels(); refreshChartMarkers(); });
    li.onclick = () => { if (m.t != null) { clock = m.t; update(); } openViewer(m); };
  }
}
function openViewer(m: MediaItem) {
  const body = $('#viewer-body'); const D = t();
  body.innerHTML = m.kind === 'video' ? `<video src="${m.url}" controls playsinline></video>` : m.heic && !m.thumb ? `<div class="ph big">HEIC<br><small>${D.heicNote}</small></div>` : `<img src="${m.url}" alt="">`;
  $('#viewer-cap').textContent = `${m.name}${m.lat != null ? ` · ${m.lat.toFixed(5)}, ${m.lon!.toFixed(5)}` : ''}`;
  $('#viewer').classList.remove('hidden');
}
function closeViewer() { $('#viewer').classList.add('hidden'); $('#viewer-body').innerHTML = ''; }
$('#viewer-close').onclick = closeViewer; $('#viewer').onclick = (e) => { if (e.target === $('#viewer')) closeViewer(); };

// ---------- loop ----------
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing && !document.hidden) {
    if (nightUntil) { if (now >= nightUntil) { nightUntil = 0; clock = I.gap.to; showNight(false); } }
    else {
      const next = clock + dt * speed;
      if (clock < I.gap.from + 1 && next >= I.gap.from) { clock = I.gap.from; nightUntil = now + 2600; showNight(true); }
      else clock = next;
      if (clock >= I.end) { if (loop) clock = I.start; else { clock = I.end; setPlaying(false); } }
    }
    update();
  }
  view.render(now, dt, !reduced);
  placeLabels();
  requestAnimationFrame(frame);
}
setLang(getLang()); applyText(); update();
if (params.get('view')) view.setView(params.get('view') as View, true);
else if (!reduced) view.setView('auto');
requestAnimationFrame(frame);
(window as unknown as { __mr: unknown }).__mr = { view, I, get clock() { return clock; }, set clock(v: number) { clock = v; update(); }, media: () => media, ready: true };
