// Smoke check against a production build served under the GitHub Pages base path (/mount-replay/), so worker/WASM/data
// URLs that ignore the base cannot regress. Usage: npm run smoke:base [shotsDir]
import { spawn, execSync } from 'node:child_process';
const port = 4175, base = '/mount-replay/', url = `http://127.0.0.1:${port}${base}`;
execSync(`npx vite build --base=${base} --outDir dist-base --emptyOutDir`, { stdio: 'inherit' });
const srv = spawn('npx', ['vite', 'preview', '--outDir', 'dist-base', '--base', base, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' });
let code = 1;
try {
  for (let i = 0; i < 50; i++) { try { if ((await fetch(url)).ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 200)); }
  code = await new Promise((res) => spawn('node', ['scripts/smoke.mjs', url, process.argv[2] || 'shots-base'], { stdio: 'inherit' }).on('exit', res));
} finally { srv.kill(); }
process.exit(code);
