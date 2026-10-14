// Fails when EN / zh / ms do not have the same keys (and array lengths).
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/i18n.ts', import.meta.url), 'utf8');
const body = (name) => { const i = src.indexOf(`const ${name}`); const s = src.indexOf('{', i); let d = 0, k = s; for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) break; } } return src.slice(s, k + 1); };
const keys = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, p + k + '.') : [p + k + (Array.isArray(v) ? `[${v.length}]` : '')]));
const obj = (n) => Function(`return (${body(n)})`)();
const [en, zh, ms] = ['en', 'zh', 'ms'].map((n) => new Set(keys(obj(n))));
let bad = 0;
for (const [n, s] of [['zh', zh], ['ms', ms]]) { for (const k of en) if (!s.has(k)) { console.log(`${n} missing ${k}`); bad++; } for (const k of s) if (!en.has(k)) { console.log(`${n} extra ${k}`); bad++; } }
console.log(bad ? `i18n: ${bad} problem(s)` : `i18n OK: ${en.size} keys in EN / zh / ms`); process.exit(bad ? 1 : 0);
