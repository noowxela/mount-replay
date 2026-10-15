import './styles.css';
import { loadAll, buildItinerary, alongAt, timeAtAlong, toActive, fromActive, activeDuration, trailAt, nearestAlong, toLocal, type Loaded } from './data';
import { TerrainView, type View } from './terrain';
import { createChart, type ChartCp, type ChartMedia } from './chart';
import { drawInset } from './inset';
import { importFiles, disposeMedia, type MediaItem, type Stage } from './media';
import { saveItem, loadAllSaved, deleteSaved, clearSaved, restore } from './store';
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
/** Short checkpoint code: START, CP1..CPn, SUMMIT. The full name goes in tooltips, the active label and the chapter line. */
const cpCode = (i: number) => (i === 0 ? t().start : i === CP.length - 1 ? t().summit : `CP${i}`);
const cpName = (id: string) => t().cp[id as keyof ReturnType<typeof t>['cp']];
const cpKind = (id: string) => (t().cpKind as Record<string, string>)[id] ?? t().cpKind.shelter;
function applyText() {
  const D = t();
  document.title = `${D.title} · ${D.subtitle}`;
  for (const el of document.querySelectorAll<HTMLElement>('[data-i]')) { const v = (D as unknown as Record<string, unknown>)[el.dataset.i!]; if (typeof v === 'string') el.textContent = v; }
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.textContent = D.views[b.dataset.view as keyof typeof D.views];
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  $('#btn-colour').textContent = D.colour; $('#btn-mono').textContent = D.mono;
  $('#sources').innerHTML = D.sources.map((s) => `<li>${s}</li>`).join('');
  $('#cp-list').innerHTML = CP.map((c) => `<li><button data-cp="${c.id}"><b><em class="code">${cpCode(CP.indexOf(c))}</em> ${D.cp[c.id as keyof typeof D.cp]}</b><span>${c.ele.toLocaleString('en')} ${D.units.m} · ${(c.along / 1000).toFixed(1)} ${D.units.km}</span><i>${cpKind(c.id)} · ${D.eleSrc[c.eleSrc]}</i></button></li>`).join('');
  drawInset($('#inset') as unknown as SVGSVGElement, L.inset, [CP[CP.length - 1].lat, CP[CP.length - 1].lon], { borneo: D.borneo, sabah: D.sabah, kk: D.kk, peak: D.cp.lowspeak });
  { const pk = CP[CP.length - 1]; $('#loc-coords').textContent = `${pk.lat.toFixed(3)}° N / ${pk.lon.toFixed(3)}° E`; }
  buildLabels(); renderMedia(); renderProgress(); if (storeWarn) setStoreNote(storeWarn as 'storeQuota'); setPlaying(playing); refreshChartMarkers(); update();
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) b.onclick = () => { setLang(b.dataset.lang as Lang); applyText(); };
const asideTab = $<HTMLButtonElement>('#aside-tab');
asideTab.onclick = () => { const closed = document.querySelector('.layout')!.classList.toggle('aside-closed'); asideTab.setAttribute('aria-expanded', String(!closed)); };
const bottomTab = $<HTMLButtonElement>('#bottom-tab');
bottomTab.onclick = () => { const closed = document.querySelector('.bottom')!.classList.toggle('chart-closed'); bottomTab.setAttribute('aria-expanded', String(!closed)); };

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
  for (const c of CP) { const major = ['timpohon', 'labanrata', 'sayat', 'lowspeak'].includes(c.id); if (!major && mobile) continue; add(major ? 'cp major' : 'cp', `<span><b class="code">${cpCode(CP.indexOf(c))}</b><em class="full">${D.cp[c.id as keyof typeof D.cp]}</em></span>${major ? `<i>${c.ele.toLocaleString('en')} m</i>` : ''}`, c.x, c.z, 60, () => flyToAlong(c.along)); labels[labels.length - 1].el.title = D.cp[c.id as keyof typeof D.cp]; labels[labels.length - 1].el.dataset.cpid = c.id; }
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
const chart = createChart($('#chart') as unknown as SVGSVGElement, L, I, (active) => { clock = fromActive(I, active); nightUntil = 0; showNight(false); update(); });
function refreshChartMarkers() {
  const list: ChartCp[] = CP.map((c, i) => ({ id: c.id, short: cpCode(i), full: cpName(c.id), t: timeAtAlong(I, c.along) }));
  const ms: ChartMedia[] = media.filter((m) => m.t != null).map((m) => ({ id: m.id, t: m.t!, kind: m.kind }));
  chart.set(list, ms, (h) => { if (h.kind === 'cp') flyToAlong(CP.find((c) => c.id === h.id)!.along); else if (h.ids.length > 1) openPicker(h.ids, h.t, h.x ?? 0, h.y ?? 0); else { const it = media.find((x) => x.id === h.ids[0]); clock = h.t; update(); if (it) openViewer(it); } });
}
/** Stops for Back / The next: checkpoint arrivals (both ways) and placed media. */
function stops() { const s = CP.flatMap((c) => [timeAtAlong(I, c.along), timeAtAlong(I, c.along, true)]); for (const m of media) if (m.t != null) s.push(m.t); return [...new Set(s.map(Math.round))].sort((a, b) => a - b); }
const stepNext = () => { const n = stops().find((s) => s > clock + 30); if (n != null) { clock = n; update(); } };
const stepBack = () => { const n = stops().reverse().find((s) => s < clock - 30); clock = n ?? I.start; update(); };
$('#btn-next').onclick = stepNext; $('#btn-back').onclick = stepBack;
/** Back / The next: disabled at the ends; the status line says which stop is current. */
function renderSteps() {
  const s = stops(); const D = t(); let k = 0; s.forEach((v, i) => { if (v <= clock + 30) k = i + 1; });
  $<HTMLButtonElement>('#btn-back').disabled = clock <= I.start + 1; $<HTMLButtonElement>('#btn-next').disabled = !s.some((v) => v > clock + 30);
  const txt = D.stepStatus.replace('{n}', String(Math.max(1, k))).replace('{total}', String(s.length)); const el = $('#step-status'); if (el.textContent !== txt) el.textContent = txt;
}
// ---------- cluster picker (several photos at one spot on the chart) ----------
const picker = $('#chart-picker'); let pickerFrom: Element | null = null;
function openPicker(ids: string[], tt: number, x: number, y: number) {
  const D = t(); const items = ids.map((id) => media.find((m) => m.id === id)).filter(Boolean) as MediaItem[];
  pickerFrom = document.activeElement; const marker = [...document.querySelectorAll('#chart .cluster')].find((g) => Math.abs(+(g.getAttribute('transform') ?? '').replace(/translate\(([-\d.]+).*/, '$1') - x) < 0.5); marker?.setAttribute('aria-expanded', 'true');
  picker.setAttribute('aria-label', D.pickerTitle.replace('{n}', String(items.length)).replace('{time}', fmtClock(tt)));
  picker.innerHTML = `<div class="pk-head"><span>${D.pickerTitle.replace('{n}', String(items.length)).replace('{time}', fmtClock(tt))}</span><button type="button" class="pk-close" aria-label="${D.close}">×</button></div>` + items.map((m) => `<button type="button" class="pk-item" data-pm="${m.id}"><span class="th">${m.thumb ? `<img src="${m.thumb}" alt="">` : `<span class="ph">${m.heic ? 'HEIC' : m.kind === 'video' ? '▶' : '◻'}</span>`}</span><span>${m.t != null ? fmtClock(m.t) : ''}<small>${m.name}</small></span></button>`).join('');
  const wrap = picker.parentElement!; const w = wrap.clientWidth; const pw = Math.min(280, w);
  picker.style.left = `${Math.max(0, Math.min(w - pw, x - pw / 2))}px`; picker.style.width = `${pw}px`; picker.style.bottom = `${Math.max(0, wrap.clientHeight - y + 14)}px`; picker.style.maxHeight = `${Math.max(110, Math.min(230, wrap.offsetTop + y - 22))}px`; // stays inside the bottom panel (it clips on phones)
  picker.classList.remove('hidden'); clock = tt; update();
  picker.querySelector<HTMLButtonElement>('.pk-close')!.onclick = () => closePicker();
  for (const b of picker.querySelectorAll<HTMLButtonElement>('.pk-item')) b.onclick = () => { const m = media.find((q) => q.id === b.dataset.pm)!; closePicker(false); if (m.t != null) { clock = m.t; update(); } openViewer(m); };
  picker.querySelector<HTMLButtonElement>('.pk-item')?.focus();
}
function closePicker(restore = true) { if (picker.classList.contains('hidden')) return false; picker.classList.add('hidden'); picker.innerHTML = ''; for (const g of document.querySelectorAll('#chart .cluster')) g.setAttribute('aria-expanded', 'false'); if (restore) (pickerFrom as HTMLElement | null)?.focus?.(); return true; }
document.addEventListener('pointerdown', (e) => { if (!picker.classList.contains('hidden') && !picker.contains(e.target as Node) && !(e.target as Element).closest?.('#chart .cluster')) closePicker(false); });
$('#btn-trace').onclick = () => view.setView(view.view === 'follow' ? 'auto' : 'follow');
/** Active checkpoint: last one passed in the walking direction. */
function activeCp(along: number) { if (clock <= summitT) { let k = 0; CP.forEach((c, i) => { if (c.along <= along + 1) k = i; }); return k; } let k = CP.length - 1; CP.forEach((c, i) => { if (c.along >= along - 1 && i < k) k = i; }); return k; }
function flyToAlong(along: number) { clock = timeAtAlong(I, along, clock > summitT); update(); view.setView('follow'); }
document.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cp]'); if (b) { const c = CP.find((x) => x.id === b.dataset.cp)!; flyToAlong(c.along); } });

// ---------- transport ----------
const scrub = $<HTMLInputElement>('#scrub');
function setPlaying(v: boolean) { playing = v; const D = t(); $('#play-ico').textContent = v ? 'Ⅱ' : '▶'; $('#play-txt').textContent = v ? D.pause : clock >= I.end ? D.again : D.play;
  const st = $('#replay-status'); st.classList.toggle('paused', !v); st.querySelector('span')!.textContent = v ? D.autoReplay : D.pausedStatus; }
$('#play').onclick = () => { if (!playing && clock >= I.end) clock = I.start; setPlaying(!playing); };
scrub.oninput = () => { clock = fromActive(I, (+scrub.value / 1000) * activeDuration(I)); nightUntil = 0; update(); };
$<HTMLSelectElement>('#speed').onchange = (e) => { speed = +(e.target as HTMLSelectElement).value; };
$('#loop').onclick = () => { loop = !loop; $('#loop').setAttribute('aria-pressed', String(loop)); };
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.onclick = () => view.setView((b.dataset.view === 'reset' ? 'oblique' : b.dataset.view) as View);
view.onViewChange = (v) => { $('#btn-trace').setAttribute('aria-pressed', String(v === 'follow')); for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === v)); };
view.onViewChange(view.view);
const setTone = (mono: boolean) => { view.setMono(mono); $('#btn-mono').setAttribute('aria-pressed', String(mono)); $('#btn-colour').setAttribute('aria-pressed', String(!mono)); };
$('#btn-colour').onclick = () => setTone(false); $('#btn-mono').onclick = () => setTone(true); setTone(params.get('tone') === 'mono');
/** Keyboard: Space play/pause · ←/→ seek 1 % (Shift 10 %) · Home/End · , and . for Back / The next · Esc closes the picker, then the viewer. */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (closePicker()) return; if (!$('#viewer').classList.contains('hidden')) { closeViewer(); return; } }
  const tgt = e.target as HTMLElement; if (tgt.closest('input,select,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  const viewerOpen = !$('#viewer').classList.contains('hidden');
  if (viewerOpen) { if (e.key === 'ArrowLeft') { e.preventDefault(); viewerStep(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); viewerStep(1); } return; }
  if (e.key === ' ' && !tgt.closest('button,[role="button"]')) { e.preventDefault(); $('#play').click(); return; }
  const span = activeDuration(I); const seekBy = (f: number) => { clock = fromActive(I, Math.max(0, Math.min(span, toActive(I, clock) + f * span))); nightUntil = 0; showNight(false); update(); };
  if (e.key === 'ArrowRight') { e.preventDefault(); seekBy(e.shiftKey ? 0.1 : 0.01); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); seekBy(e.shiftKey ? -0.1 : -0.01); }
  else if (e.key === 'Home') { e.preventDefault(); clock = I.start; update(); }
  else if (e.key === 'End') { e.preventDefault(); clock = I.end; update(); }
  else if (e.key === '.') stepNext(); else if (e.key === ',') stepBack();
});

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
  scrub.style.setProperty('--fill', `${(toActive(I, clock) / activeDuration(I)) * 100}%`);
  if (document.activeElement !== scrub) scrub.value = String(Math.round((toActive(I, clock) / activeDuration(I)) * 1000));
  const ci = activeCp(a); const cid = CP[ci].id;
  chart.setPosition(toActive(I, clock), cid);
  $('#chapter').textContent = `${cpCode(ci)} · ${cpName(cid)}`; $('#chapter').title = `${cpName(cid)} · ${cpKind(cid)}`;
  $('#ch-prog').textContent = `${Math.round((toActive(I, clock) / activeDuration(I)) * 100)}% · ${Math.round(p[2]).toLocaleString('en')} ${D.units.m}`;
  for (const l of labels) if (l.el.dataset.cpid) l.el.classList.toggle('active', l.el.dataset.cpid === cid);
  renderSteps();
}

// ---------- media ----------
let day1Manual = false;
const fileIn = $<HTMLInputElement>('#file'); const day1In = $<HTMLInputElement>('#day1'); const offIn = $<HTMLInputElement>('#offset');
/** Files being imported: one pending row each (spinner + stage text), then swapped for the real item or left as an error. */
interface Pending { key: string; name: string; stage: Stage }
let pending: Pending[] = []; let batch = { done: 0, total: 0 };
fileIn.onchange = async () => { if (!fileIn.files?.length) return;
  const files = Array.from(fileIn.files); fileIn.value = ''; const tag = Math.random().toString(36).slice(2, 7);
  const rows: Pending[] = files.map((f, i) => ({ key: `${tag}-${i}`, name: f.name, stage: 'queued' }));
  pending.push(...rows); batch = { done: batch.total > batch.done ? batch.done : 0, total: (batch.total > batch.done ? batch.total : 0) + files.length }; renderMedia(); renderProgress();
  await importFiles(files, (i, stage, item) => {
    const r = rows[i]; r.stage = stage;
    if (stage === 'done' || stage === 'error' || stage === 'unsupported') batch.done++;
    if (stage === 'done' && item) { pending = pending.filter((p) => p !== r); media.push(item); persist(item);
      placeMedia(); } else renderMedia();
    renderProgress();
  });
  renderProgress(); };
function renderProgress() {
  const el = $('#media-progress'); const D = t(); const busy = batch.done < batch.total;
  el.classList.toggle('hidden', !busy); el.innerHTML = busy ? `<span class="spin" aria-hidden="true"></span>${D.processing.replace('{n}', String(Math.min(batch.total, batch.done + 1))).replace('{total}', String(batch.total))}` : '';
}
day1In.onchange = () => { day1Manual = !!day1In.value; localStorage.setItem('mr-day1', day1Manual ? day1In.value : ''); placeMedia(); };
offIn.onchange = () => { localStorage.setItem('mr-off', offIn.value); placeMedia(); };
// ---------- local persistence (IndexedDB, this device only) ----------
let storeWarn = '';
function setStoreNote(k: '' | 'storeQuota' | 'storeError') { storeWarn = k; const el = $('#media-store'); el.classList.toggle('hidden', !k); el.textContent = k ? t()[k] : ''; }
async function persist(item: MediaItem) { const r = await saveItem(item); if (r === 'quota') setStoreNote('storeQuota'); else if (r === 'error' && storeWarn !== 'storeQuota') setStoreNote('storeError'); }
$('#clear-media').onclick = async () => { for (const m of media) disposeMedia(m); media = []; pending = []; await clearSaved(); setStoreNote(''); placeMedia(); renderProgress(); };
async function restoreSaved() {
  const saved = await loadAllSaved(); if (!saved.length) return;
  const rows: Pending[] = saved.map((r, i) => ({ key: `restore-${i}`, name: r.name, stage: 'restoring' })); pending.push(...rows);
  batch = { done: 0, total: saved.length }; renderMedia(); renderProgress();
  await new Promise((r) => setTimeout(r, 0));
  for (const [i, r] of saved.entries()) {
    try { const m = restore(r, r.id); media.push(m); pending = pending.filter((p) => p !== rows[i]); }
    catch { rows[i].stage = 'error'; }
    batch.done++;
  }
  placeMedia(); renderProgress();
}
{ const d = localStorage.getItem('mr-day1'); if (d) { day1In.value = d; day1Manual = true; } const o = localStorage.getItem('mr-off'); if (o) offIn.value = o; }
/** A GPS-tagged photo counts as on the climb only within this distance of the OSM trail line (m). */
const TRAIL_RADIUS_M = 300;
/** Photos up to this long before the start / after the finish still count (waiting at the gate, the drive out). */
const TIME_MARGIN_S = 90 * 60;
/** Climb time (s from 00:00 of day 1) of a camera wall-clock time, for a given day-1 date. */
const climbTime = (wall: NonNullable<MediaItem['wall']>, day1: number, off: number) => Math.round((Date.parse(wall.date + 'T00:00:00Z') - day1) / 86400e3) * 86400 + wall.secs - off * 3600;
const inWindow = (tt: number) => tt >= I.start - TIME_MARGIN_S && tt <= I.end + TIME_MARGIN_S;
/** Day 1 is not a fixed date: the typical schedule is matched by time of day. Unless the user set it, pick the photo date
 *  (or the day before, for summit-day shots) that puts the most photos inside the climb; ties go to the earliest. */
function autoDay1(off: number) {
  const walls = media.map((m) => m.wall).filter(Boolean) as NonNullable<MediaItem['wall']>[]; if (!walls.length) return '';
  const cands = [...new Set(walls.flatMap((w) => { const d = Date.parse(w.date + 'T00:00:00Z'); return [d, d - 86400e3]; }))].sort((a, b) => a - b);
  let best = cands[0], score = -1;
  for (const c of cands) { const n = walls.filter((w) => inWindow(climbTime(w, c, off))).length; if (n > score) { score = n; best = c; } }
  return new Date(best).toISOString().slice(0, 10);
}
function placeMedia() {
  const off = +offIn.value || 0;
  if (!day1Manual) day1In.value = autoDay1(off);
  const day1 = day1In.value ? Date.parse(day1In.value + 'T00:00:00Z') : NaN;
  for (const m of media) {
    m.along = null; m.t = null; m.how = 'none';
    let tt: number | null = m.wall && Number.isFinite(day1) ? climbTime(m.wall, day1, off) : null;
    if (tt != null && inWindow(tt)) tt = Math.min(I.end, Math.max(I.start, tt)); else if (tt != null) { m.how = 'late'; tt = null; }
    if (m.lat != null && m.lon != null) {
      // GPS decides: on the trail (within TRAIL_RADIUS_M of the OSM line) it is placed, otherwise it is not placed at all
      const loc = toLocal(L, m.lat, m.lon); const near = nearestAlong(T, loc.x, loc.z);
      if (near.dist <= TRAIL_RADIUS_M) { m.along = near.along; m.how = 'gps'; m.t = tt ?? timeAtAlong(I, near.along); } else m.how = 'offtrail';
      continue;
    }
    // no GPS: placed by time of day on the typical schedule, else not placed
    if (tt != null) { m.t = tt; m.along = alongAt(I, tt); m.how = 'time'; }
  }
  const noGps = media.filter((m) => m.kind === 'image' && m.lat == null).length;
  $('#media-hint').classList.toggle('hidden', !noGps); $('#media-hint').textContent = noGps ? t().noGpsHint.replace('{n}', String(noGps)) : '';
  media.sort((a, b) => (a.t ?? 1e12) - (b.t ?? 1e12) || +a.id.slice(1) - +b.id.slice(1)); // stable: ties keep file order
  renderMedia(); buildLabels(); refreshChartMarkers();
}
function renderMedia() {
  const D = t(); const ul = $('#media-list');
  const pend = pending.map((p) => { const err = p.stage === 'error' || p.stage === 'unsupported';
    return `<li class="pending${err ? ' failed' : ''}" data-p="${p.key}"><span class="th">${err ? '<span class="ph err">!</span>' : '<span class="shimmer"></span>'}</span><span class="mi"><b>${p.name}</b><i>${err ? '' : '<span class="spin" aria-hidden="true"></span>'}${(D.stage as Record<string, string>)[p.stage]}</i></span>${err ? '<button class="rm" aria-label="remove">×</button>' : '<span></span>'}</li>`; }).join('');
  if (!media.length && !pending.length) { ul.innerHTML = `<li class="empty">${D.mediaNone}</li>`; return; }
  const how = { gps: D.placedGps, time: D.placedTime, none: D.unplaced, late: D.unplacedTime, offtrail: D.offTrail };
  ul.innerHTML = pend + media.map((m) => `<li data-m="${m.id}" class="${m.how}"><span class="th">${m.thumb ? `<img src="${m.thumb}" alt="">` : `<span class="ph">${m.heic ? 'HEIC' : m.kind === 'video' ? '▶' : '◻'}</span>`}</span><span class="mi"><b>${m.name}</b><i>${how[m.how]}${m.t != null ? ` · ${D.day} ${m.t >= 86400 ? 2 : 1} ${fmtClock(m.t)}` : ''}${m.heic && !m.thumb ? ` · ${D.heicNote}` : ''}</i></span><button class="rm" aria-label="remove">×</button></li>`).join('');
  for (const li of ul.querySelectorAll<HTMLElement>('li[data-p]')) li.querySelector('.rm')?.addEventListener('click', (e) => { e.stopPropagation(); pending = pending.filter((p) => p.key !== li.dataset.p); renderMedia(); });
  for (const li of ul.querySelectorAll<HTMLElement>('li[data-m]')) {
    const m = media.find((x) => x.id === li.dataset.m)!;
    li.querySelector('.rm')!.addEventListener('click', (e) => { e.stopPropagation(); disposeMedia(m); void deleteSaved(m.id); media = media.filter((x) => x !== m); renderMedia(); buildLabels(); refreshChartMarkers(); });
    li.onclick = () => { if (m.t != null) { clock = m.t; update(); } openViewer(m); };
  }
}
let viewing: MediaItem | null = null; let viewerFrom: Element | null = null;
const placedMedia = () => media.filter((m) => m.t != null);
function viewerStep(d: number) { if (!viewing) return; const list = placedMedia(); const i = list.indexOf(viewing); const n = list[i + d]; if (!n) return; clock = n.t!; update(); openViewer(n); }
$('#viewer-prev').onclick = () => viewerStep(-1); $('#viewer-next').onclick = () => viewerStep(1);
function openViewer(m: MediaItem) {
  const body = $('#viewer-body'); const D = t(); if ($('#viewer').classList.contains('hidden')) viewerFrom = document.activeElement; viewing = m;
  const list = placedMedia(); const i = list.indexOf(m);
  $<HTMLButtonElement>('#viewer-prev').disabled = i <= 0; $<HTMLButtonElement>('#viewer-next').disabled = i < 0 || i >= list.length - 1;
  $('#viewer-idx').textContent = i >= 0 ? `${i + 1} / ${list.length}` : '';
  const how = { gps: D.placedGps, time: D.placedTime, none: D.unplaced, late: D.unplacedTime, offtrail: D.offTrail };
  $('#viewer-meta').textContent = `${m.t != null ? `${D.day} ${m.t >= 86400 ? 2 : 1} · ${fmtClock(m.t)} · ` : ''}${how[m.how]}`;
  body.innerHTML = m.kind === 'video' ? `<video src="${m.url}" controls playsinline></video>` : m.heic && !m.thumb ? `<div class="ph big">HEIC<br><small>${D.heicNote}</small></div>` : `<img src="${m.url}" alt="">`;
  $('#viewer-cap').textContent = `${m.name}${m.lat != null ? ` · ${m.lat.toFixed(5)}, ${m.lon!.toFixed(5)}` : ''}`;
  $('#viewer').classList.remove('hidden'); $<HTMLButtonElement>('#viewer-close').focus();
}
function closeViewer() { if ($('#viewer').classList.contains('hidden')) return; $('#viewer').classList.add('hidden'); $('#viewer-body').innerHTML = ''; viewing = null; (viewerFrom as HTMLElement | null)?.focus?.(); }
$('#viewer-close').onclick = closeViewer; $('#viewer').onclick = (e) => { if (e.target === $('#viewer')) closeViewer(); };

// ---------- map overlays: altitude ruler + scan cursor, scan readout, camera readout ----------
const RULER = { top: 4200, bottom: 1400 };
{ const r = $('#alt-ruler'); r.innerHTML = Array.from({ length: (RULER.top - RULER.bottom) / 400 + 1 }, (_, i) => RULER.top - i * 400).map((h) => `<span style="top:${(((RULER.top - h) / (RULER.top - RULER.bottom)) * 100).toFixed(2)}%">${h.toLocaleString('en')}</span>`).join('') + '<b id="alt-cursor">▶</b>'; }
let lastCam = '', lastScan = '';
function renderOverlays() {
  const { az, el } = view.angles(); const cam = `AZ ${az}° / EL ${el}°`; if (cam !== lastCam) { $('#cam-readout').textContent = cam; lastCam = cam; }
  const h = view.scanAlt; const cur = $('#alt-cursor');
  if (h == null) { cur.style.display = 'none'; if (lastScan) { $('#scan-readout').textContent = ''; lastScan = ''; } return; }
  cur.style.display = ''; cur.style.top = `${Math.max(0, Math.min(100, ((RULER.top - h) / (RULER.top - RULER.bottom)) * 100)).toFixed(2)}%`;
  const sc = t().scanAlt.replace('{h}', (Math.round(h / 10) * 10).toLocaleString('en')); if (sc !== lastScan) { $('#scan-readout').textContent = sc; lastScan = sc; }
}

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
  placeLabels(); renderOverlays();
  requestAnimationFrame(frame);
}
setLang(getLang()); applyText(); update(); void restoreSaved();
if (params.get('view')) view.setView(params.get('view') as View, true);
else if (!reduced) view.setView('auto');
requestAnimationFrame(frame);
(window as unknown as { __mr: unknown }).__mr = { view, I, get clock() { return clock; }, set clock(v: number) { clock = v; update(); }, media: () => media, pending: () => pending, ready: true };
