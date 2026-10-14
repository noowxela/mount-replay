// Import timing: N copies of the iPhone HEIC fixture, time from file pick until all are imported.
// Usage: node scripts/bench-import.mjs [baseUrl] [N]
import { chromium } from 'playwright-core';
import { mkdirSync, copyFileSync } from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:4173/'; const N = +(process.argv[3] || 20);
const src = new URL('./fixtures/heic-iphone7.heic', import.meta.url).pathname; mkdirSync('/tmp/mr-bench', { recursive: true });
const files = Array.from({ length: N }, (_, i) => { const f = `/tmp/mr-bench/IMG_${String(i).padStart(3, '0')}.heic`; copyFileSync(src, f); return f; });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, args: ['--ignore-gpu-blocklist', '--use-angle=metal'] });
const p = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await p.goto(`${base}?autoplay=0`, { waitUntil: 'networkidle' }); await p.waitForFunction(() => window.__mr?.ready);
// longest main-thread stall while importing (rAF gaps)
await p.evaluate(() => { window.__gap = 0; let last = performance.now(); const f = (t) => { window.__gap = Math.max(window.__gap, t - last); last = t; if (!window.__stop) requestAnimationFrame(f); }; requestAnimationFrame(f); });
const t0 = Date.now(); await p.setInputFiles('#file', files);
await p.waitForFunction((n) => window.__mr.media().length >= n, N, { timeout: 600000, polling: 100 });
const ms = Date.now() - t0; const r = await p.evaluate(() => ({ gap: Math.round(window.__gap), decoded: window.__mr.media().filter((m) => m.decoded && m.thumb).length }));
console.log(JSON.stringify({ files: N, ms, perFile: Math.round(ms / N), maxFrameGapMs: r.gap, decoded: r.decoded }));
await browser.close();
