// Smoke check (Playwright + local Chrome): desktop 1600x900 and mobile 390x844, EN/zh/ms, no console errors,
// replay advances, night card shows and is skipped, views switch, a photo with EXIF time is placed; screenshots.
// Usage: npm run build && npx vite preview --port 4173 &  then  node scripts/smoke.mjs [baseUrl] [shotsDir]
import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:4173/'; const out = process.argv[3] || 'shots'; mkdirSync(out, { recursive: true });
const exe = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--ignore-gpu-blocklist', '--use-angle=metal'] });
const errors = [], bad = []; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// a tiny JPEG with EXIF DateTimeOriginal 2024:05:11 09:40:00 (day 1, on the way up)
function exifJpeg() {
  const dt = Buffer.from('2024:05:11 09:40:00\0', 'latin1');
  const ifd = Buffer.alloc(2 + 12 + 4); ifd.writeUInt16BE(1, 0); ifd.writeUInt16BE(0x8769, 2); ifd.writeUInt16BE(4, 4); ifd.writeUInt32BE(1, 6); ifd.writeUInt32BE(8 + 18, 10); ifd.writeUInt32BE(0, 14);
  const sub = Buffer.alloc(2 + 12 + 4); sub.writeUInt16BE(1, 0); sub.writeUInt16BE(0x9003, 2); sub.writeUInt16BE(2, 4); sub.writeUInt32BE(dt.length, 6); sub.writeUInt32BE(8 + 18 + 18, 10); sub.writeUInt32BE(0, 14);
  const tiff = Buffer.concat([Buffer.from('MM\0\x2a\0\0\0\x08', 'latin1'), ifd, sub, dt]);
  const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]); const len = Buffer.alloc(2); len.writeUInt16BE(app1.length + 2);
  // 1x1 baseline JPEG body (SOI ... EOI) with the APP1 inserted after SOI
  const px = Buffer.from('ffd8ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffc0000b080001000101011100ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffda0008010100003f00fbd3ffd9', 'hex');
  return Buffer.concat([px.subarray(0, 2), Buffer.from([0xff, 0xe1]), len, app1, px.subarray(2)]);
}
writeFileSync(`${out}/_test.jpg`, exifJpeg());
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
await d.click('[data-view="follow"]'); await sleep(2500); await d.screenshot({ path: `${out}/04-desktop-follow-media.png` });
await d.click('#btn-mono'); await d.click('[data-view="top"]'); await sleep(2200); await d.screenshot({ path: `${out}/05-desktop-top-mono.png` });
// zh + ms text present
for (const lg of ['zh', 'ms']) { const p = await open(`desktop-${lg}`, `lang=${lg}&autoplay=0`, { width: 1440, height: 900 }); const h = await p.textContent('.cps h2'); if (!h || /Checkpoints/.test(h)) bad.push(`${lg} not translated (${h})`); if (lg === 'zh') await p.screenshot({ path: `${out}/06-desktop-zh.png` }); }
// mobile
const m = await open('mobile', 'lang=en', { width: 390, height: 844 }); await m.screenshot({ path: `${out}/07-mobile-390x844.png` }); await m.screenshot({ path: `${out}/08-mobile-390x844-full.png`, fullPage: true });
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (overflow > 1) bad.push(`mobile horizontal overflow ${overflow}px`);
await browser.close();
console.log(JSON.stringify({ c0, c1, nightShown, after, placed }));
console.log(bad.length ? 'BAD\n' + bad.join('\n') : 'smoke OK');
console.log(errors.length ? errors.join('\n') : 'No console errors or warnings.');
process.exit(bad.length || errors.length ? 1 : 0);
