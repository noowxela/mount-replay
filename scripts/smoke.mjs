// Smoke check (Playwright + local Chrome): desktop 1600x900 and mobile 390x844, EN/zh/ms, no console errors,
// replay advances, night card shows and is skipped, views switch, a photo with EXIF time is placed; screenshots.
// Usage: npm run build && npx vite preview --port 4173 &  then  node scripts/smoke.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:4173/'; const out = process.argv[3] || 'shots'; mkdirSync(out, { recursive: true });
const exe = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--ignore-gpu-blocklist', '--use-angle=metal'] });
const errors = [], bad = []; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// a tiny JPEG with EXIF DateTimeOriginal 2024:05:11 09:40:00 (day 1, on the way up)
function exifJpeg(when = '2024:05:11 09:40:00') {
  const dt = Buffer.from(when + '\0', 'latin1');
  const ifd = Buffer.alloc(2 + 12 + 4); ifd.writeUInt16BE(1, 0); ifd.writeUInt16BE(0x8769, 2); ifd.writeUInt16BE(4, 4); ifd.writeUInt32BE(1, 6); ifd.writeUInt32BE(8 + 18, 10); ifd.writeUInt32BE(0, 14);
  const sub = Buffer.alloc(2 + 12 + 4); sub.writeUInt16BE(1, 0); sub.writeUInt16BE(0x9003, 2); sub.writeUInt16BE(2, 4); sub.writeUInt32BE(dt.length, 6); sub.writeUInt32BE(8 + 18 + 18, 10); sub.writeUInt32BE(0, 14);
  const tiff = Buffer.concat([Buffer.from('MM\0\x2a\0\0\0\x08', 'latin1'), ifd, sub, dt]);
  const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]); const len = Buffer.alloc(2); len.writeUInt16BE(app1.length + 2);
  // 1x1 baseline JPEG body (SOI ... EOI) with the APP1 inserted after SOI
  const px = Buffer.from('ffd8ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbd3ffd9', 'hex');
  return Buffer.concat([px.subarray(0, 2), Buffer.from([0xff, 0xe1]), len, app1, px.subarray(2)]);
}
writeFileSync(`${out}/_test.jpg`, exifJpeg());
// JPEG with EXIF time + GPS (IFD0 -> Exif IFD + GPS IFD), for the on-trail placement check
function gpsJpeg(when, lat, lon) {
  const dt = Buffer.from(when + '\0', 'latin1'); const e = (b, o, tag, type, n, v) => { b.writeUInt16BE(tag, o); b.writeUInt16BE(type, o + 2); b.writeUInt32BE(n, o + 4); b.writeUInt32BE(v, o + 8); };
  const ifd0 = Buffer.alloc(2 + 2 * 12 + 4), exif = Buffer.alloc(2 + 12 + 4), gps = Buffer.alloc(2 + 4 * 12 + 4);
  const o0 = 8, oE = o0 + ifd0.length, oG = oE + exif.length, oDt = oG + gps.length, oLat = oDt + dt.length, oLon = oLat + 24;
  ifd0.writeUInt16BE(2, 0); e(ifd0, 2, 0x8769, 4, 1, oE); e(ifd0, 14, 0x8825, 4, 1, oG);
  exif.writeUInt16BE(1, 0); e(exif, 2, 0x9003, 2, dt.length, oDt);
  gps.writeUInt16BE(4, 0); e(gps, 2, 1, 2, 2, 0x4e000000); e(gps, 14, 2, 5, 3, oLat); e(gps, 26, 3, 2, 2, 0x45000000); e(gps, 38, 4, 5, 3, oLon);
  const rat = (deg) => { const b = Buffer.alloc(24); const d = Math.floor(deg), m = Math.floor((deg - d) * 60), sec = Math.round(((deg - d) * 60 - m) * 60 * 1e4); [d, 1, m, 1, sec, 1e4].forEach((v, i) => b.writeUInt32BE(v, i * 4)); return b; };
  const tiff = Buffer.concat([Buffer.from('MM\0\x2a\0\0\0\x08', 'latin1'), ifd0, exif, gps, dt, rat(lat), rat(lon)]);
  const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]); const len = Buffer.alloc(2); len.writeUInt16BE(app1.length + 2);
  const px = exifJpeg().subarray(0); const soi = px.subarray(0, 2); const rest = px.subarray(4 + px.readUInt16BE(4)); // drop the plain APP1
  return Buffer.concat([soi, Buffer.from([0xff, 0xe1]), len, app1, rest]);
}
writeFileSync(`${out}/_ontrail.jpg`, gpsJpeg('2024:05:11 13:05:00', 6.0589492, 116.5658497)); // Laban Rata
// more photos for the chart markers, incl. near-simultaneous shots that must cluster rather than overlap
const extra = ['2024:05:11 08:20:00', '2024:05:11 10:15:00', '2024:05:11 10:16:00', '2024:05:11 10:17:30', '2024:05:11 11:30:00', '2024:05:11 12:40:00', '2024:05:12 04:10:00', '2024:05:12 05:40:00', '2024:05:12 05:44:00', '2024:05:12 07:30:00', '2024:05:12 12:00:00'];
const extraFiles = extra.map((w, i) => { const f = `${out}/_p${i}.jpg`; writeFileSync(f, exifJpeg(w)); return f; });
const heicFile = new URL('./fixtures/heic-iphone7.heic', import.meta.url).pathname; // iPhone 7 HEIC with GPS + time (exifr test fixture, MIT)
async function open(name, q, vp) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width < 500 ? 3 : 1, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
  const p = await ctx.newPage();
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${name}] ${m.type()}: ${m.text()}`); });
  p.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  await p.goto(`${base}?${q}`, { waitUntil: 'networkidle', timeout: 120000 });
  await p.waitForFunction(() => window.__mr?.ready, null, { timeout: 60000 }); await sleep(2500); return p;
}
// desktop EN: replay runs, night card, views, media
const d = await open('desktop-en', 'lang=en', { width: 1600, height: 900 });
const c0 = await d.evaluate(() => window.__mr.clock); await sleep(2000); const c1 = await d.evaluate(() => window.__mr.clock);
if (!(c1 > c0)) bad.push('replay does not advance');
await d.screenshot({ path: `${out}/01-desktop-en-auto.png` });
await d.evaluate(() => { window.__mr.clock = window.__mr.I.gap.from - 300; }); await sleep(1500);
const nightShown = await d.evaluate(() => !document.getElementById('night').classList.contains('hidden'));
if (!nightShown) bad.push('night card not shown at the overnight gap'); else await d.screenshot({ path: `${out}/02-desktop-night-card.png` });
await sleep(3500); const after = await d.evaluate(() => window.__mr.clock); if (!(after >= 86400 + 2.5 * 3600 - 1)) bad.push(`overnight not skipped (clock ${after})`);
await d.click('#play'); await d.click('[data-view="oblique"]'); await sleep(2200); await d.screenshot({ path: `${out}/03-desktop-oblique-paused.png` });
await d.setInputFiles('#file', `${out}/_test.jpg`); await sleep(1500);
const placed = await d.evaluate(() => window.__mr.media().map((m) => ({ how: m.how, t: m.t, along: m.along })));
if (placed[0]?.how !== 'time') bad.push(`test photo not placed by time: ${JSON.stringify(placed)}`);
// HEIC: decoded to JPEG for display (heic2any in Chrome), metadata from the original file
await d.setInputFiles('#file', heicFile);
// loading state: a pending row with a spinner/shimmer and stage text, plus the overall indicator, before the swap
const loading = await d.waitForFunction(() => { const li = document.querySelector('#media-list li.pending'); const pr = document.getElementById('media-progress');
  return li && li.querySelector('.shimmer') && /HEIC/i.test(li.textContent) && /Converting HEIC/.test(li.textContent) && !pr.classList.contains('hidden') && /Processing 1 of 1/.test(pr.textContent) ? li.textContent : null; }, null, { timeout: 20000, polling: 50 }).then((h) => h.jsonValue()).catch(() => null);
if (!loading) bad.push('HEIC loading state not shown'); else { await d.locator('.panel.media').scrollIntoViewIfNeeded(); await d.locator('.panel.media').screenshot({ path: `${out}/11-upload-loading.png` }); }
await d.waitForFunction(() => window.__mr.media().length >= 2, null, { timeout: 60000 });
const heicHow = await d.evaluate(() => window.__mr.media().find((x) => x.heic)?.how);
if (heicHow !== 'offtrail') bad.push(`HEIC with Italy GPS not excluded (how=${heicHow})`);
await d.setInputFiles('#file', `${out}/_ontrail.jpg`); await d.waitForFunction(() => window.__mr.media().some((m) => m.name === '_ontrail.jpg'), null, { timeout: 20000 });
const onTrail = await d.evaluate(() => { const m = window.__mr.media().find((x) => x.name === '_ontrail.jpg'); return { how: m.how, along: m.along, lat: m.lat }; });
if (onTrail.how !== 'gps' || !(onTrail.along > 5300 && onTrail.along < 5700)) bad.push(`on-trail photo not placed: ${JSON.stringify(onTrail)}`);
const ticks = await d.evaluate(() => ({ labels: [...document.querySelectorAll('#chart .ytick')].map((t) => +t.textContent.replace(/,/g, '')), grid: [...document.querySelectorAll('#chart .grid')].map((g) => +g.dataset.h) }));
if (!ticks.labels.length || ticks.labels.some((h) => h % 100) || ticks.grid.some((h) => h % 100) || ticks.grid.length < 25) bad.push(`y ticks not every 100 m: ${JSON.stringify(ticks)}`);
await d.evaluate(() => document.querySelector('.panel.media').scrollIntoView()); await sleep(300); await d.screenshot({ path: `${out}/12-filter-ticks.png` });
const loadingGone = await d.evaluate(() => !document.querySelector('#media-list li.pending') && document.getElementById('media-progress').classList.contains('hidden'));
if (!loadingGone) bad.push('loading state not cleared after import');
const heic = await d.evaluate(() => { const m = window.__mr.media().find((x) => x.heic); return m && { decoded: m.decoded, thumb: !!m.thumb, lat: m.lat, lon: m.lon, wall: m.wall }; });
if (!heic?.decoded || !heic.thumb) bad.push(`HEIC not decoded: ${JSON.stringify(heic)}`);
if (!(heic?.lat > 38 && heic?.lat < 38.1) || heic?.wall?.date !== '2019-10-20') bad.push(`HEIC metadata not read: ${JSON.stringify(heic)}`);
await d.evaluate(() => { const li = [...document.querySelectorAll('#media-list li')].find((l) => /heic/i.test(l.textContent)); li?.click(); }); await sleep(800);
const heicShown = await d.evaluate(() => { const img = document.querySelector('#viewer-body img'); return !!img && img.naturalWidth > 0; });
if (!heicShown) bad.push('HEIC not shown in the viewer'); else await d.screenshot({ path: `${out}/09-desktop-heic-viewer.png` });
await d.click('#viewer-close');
await d.setInputFiles('#file', extraFiles); await sleep(1500);
const overlaps = await d.evaluate(() => { const r = [...document.querySelectorAll('#chart .media circle')].map((c) => c.getBoundingClientRect()); let n = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (r[i].left < r[j].right - 1 && r[j].left < r[i].right - 1 && r[i].top < r[j].bottom - 1 && r[j].top < r[i].bottom - 1) n++; return { n, markers: r.length, clusters: document.querySelectorAll('#chart .cluster').length }; });
if (overlaps.n) bad.push(`chart media markers overlap: ${JSON.stringify(overlaps)}`);
const cpLabels = await d.evaluate(() => [...document.querySelectorAll('#chart .cp .cplabel')].map((t) => t.textContent));
if (cpLabels[0] && !/START/.test(cpLabels[0]) || !cpLabels.some((l) => /^CP1/.test(l)) || !cpLabels.some((l) => /SUMMIT/.test(l))) bad.push(`checkpoint codes wrong: ${cpLabels}`);
await d.evaluate(() => { window.__mr.clock = 11 * 3600 + 5 * 60; }); await sleep(300);
await d.locator('.bottom').screenshot({ path: `${out}/10-desktop-bottom-panel.png` });
// batching: 25 HEIC copies -> first batch of 20 runs concurrently while 5 wait; final order follows file order
const batchFiles = Array.from({ length: 25 }, (_, i) => { const f = `${out}/_b${String(i).padStart(2, '0')}.heic`; copyFileSync(heicFile, f); return f; });
const before = await d.evaluate(() => window.__mr.media().length); const tb = Date.now();
await d.setInputFiles('#file', batchFiles);
const batchSeen = await d.waitForFunction(() => { const p = window.__mr.pending().filter((x) => /^_b/.test(x.name)); const active = p.filter((x) => x.stage !== 'queued').length, queued = p.filter((x) => x.stage === 'queued').length;
  return active > 1 && active <= 20 && queued >= 5 ? { active, queued } : null; }, null, { timeout: 30000, polling: 20 }).then((h) => h.jsonValue()).catch(() => null);
await d.waitForFunction((n) => window.__mr.media().length >= n, before + 25, { timeout: 300000 });
const batchMs = Date.now() - tb;
const order = await d.evaluate(() => window.__mr.media().map((m) => m.name).filter((n) => /^_b/.test(n)));
if (!batchSeen) bad.push('batch concurrency not observed'); if (order.join() !== order.slice().sort().join() || order.length !== 25) bad.push(`batch order unstable: ${order}`);
const progCleared = await d.evaluate(() => document.getElementById('media-progress').classList.contains('hidden')); if (!progCleared) bad.push('progress indicator not cleared after batch');
await d.click('#btn-next'); await sleep(200); await d.click('#btn-back'); await sleep(200);
await d.click('[data-view="follow"]'); await sleep(2500); await d.screenshot({ path: `${out}/04-desktop-follow-media.png` });
await d.click('#btn-mono'); await d.click('[data-view="top"]'); await sleep(2200); await d.screenshot({ path: `${out}/05-desktop-top-mono.png` });
// zh + ms text present
for (const lg of ['zh', 'ms']) { const p = await open(`desktop-${lg}`, `lang=${lg}&autoplay=0`, { width: 1440, height: 900 }); const h = await p.textContent('.cps h2'); if (!h || /Checkpoints/.test(h)) bad.push(`${lg} not translated (${h})`); if (lg === 'zh') await p.screenshot({ path: `${out}/06-desktop-zh.png` }); }
// mobile
const m = await open('mobile', 'lang=en', { width: 390, height: 844 }); await m.screenshot({ path: `${out}/07-mobile-390x844.png` }); await m.screenshot({ path: `${out}/08-mobile-390x844-full.png`, fullPage: true });
const mticks = await m.evaluate(() => { const ys = [...document.querySelectorAll('#chart .ytick')].map((t) => t.getBoundingClientRect().top).sort((a, b) => a - b); return { n: ys.length, minGap: Math.min(...ys.slice(1).map((v, i) => v - ys[i])) }; });
if (mticks.minGap < 12) bad.push(`mobile y labels overlap: ${JSON.stringify(mticks)}`);
await m.setInputFiles('#file', [`${out}/_test.jpg`, ...extraFiles]); await sleep(1500); await m.locator('.bottom').screenshot({ path: `${out}/10-mobile-bottom-panel.png` });
for (const lg of ['zh', 'ms']) { const p = await open(`bottom-${lg}`, `lang=${lg}&autoplay=0&t=30`, { width: 1440, height: 900 }); await p.locator('.bottom').screenshot({ path: `${out}/10-desktop-bottom-${lg}.png` }); }
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (overflow > 1) bad.push(`mobile horizontal overflow ${overflow}px`);
await browser.close();
console.log(JSON.stringify({ c0, c1, nightShown, after, placed, loading, heic, heicHow, onTrail, ticks, mticks, batchSeen, batchMs, overlaps, cpLabels }));
console.log(bad.length ? 'BAD\n' + bad.join('\n') : 'smoke OK');
console.log(errors.length ? errors.join('\n') : 'No console errors or warnings.');
process.exit(bad.length || errors.length ? 1 : 0);
