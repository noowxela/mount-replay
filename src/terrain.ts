// The 3D view: GLO-30 terrain as a dot cloud plus contour lines, the OSM trail, the walker and the camera modes.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { heightAt, type Loaded } from './data';

/** Vertical exaggeration. DESIGN.md reports 2.4× for the reference demo but does not prescribe it; Kinabalu's ~2.4 km of
 *  relief already reads well at 1.6×, so this stays (also stated in the credits). */
export const EXAGGERATION = 1.6;
const CONTOUR_M = 25, INDEX_M = 100;
/** Motion timings (DESIGN.md §8): camera fly 1.3 s smoothstep, follow smoothing rate 6/s, light band period 20 s. */
const FLY_MS = 1300, FOLLOW_RATE = 6, SCAN_PERIOD_MS = 20000;
export type View = 'auto' | 'follow' | 'oblique' | 'top' | 'manual';
const Y = (h: number) => h * EXAGGERATION;

const dotVert = /* glsl */ `
attribute float aH; attribute float aShade; attribute float aRand;
uniform float uScan; uniform float uSize; uniform float uPx; uniform float uTime;
varying float vH; varying float vShade; varying float vScan; varying float vTwinkle;
void main() {
  vH = aH; vShade = aShade; vScan = 1.0 - smoothstep(0.0, 140.0, abs(aH - uScan));
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  // slow per-dot shimmer (uTime is frozen under reduced motion)
  vTwinkle = 0.86 + 0.14 * sin(uTime * (0.6 + aRand * 1.4) + aRand * 40.0);
  gl_PointSize = clamp(uSize * uPx / -mv.z * (1.0 + vScan * 0.6) * (0.92 + 0.16 * aRand), 1.0, 4.0 * uPx);
}`;
const dotFrag = /* glsl */ `
uniform float uMono; uniform vec3 uBg;
varying float vH; varying float vShade; varying float vScan; varying float vTwinkle;
vec3 ramp(float h) {
  vec3 a = vec3(0.16, 0.42, 0.30), b = vec3(0.45, 0.62, 0.36), c = vec3(0.70, 0.62, 0.45), d = vec3(0.70, 0.70, 0.72), e = vec3(0.97, 0.97, 1.0);
  return h < 1500.0 ? mix(a, b, h / 1500.0) : h < 2800.0 ? mix(b, c, (h - 1500.0) / 1300.0) : h < 3500.0 ? mix(c, d, (h - 2800.0) / 700.0) : mix(d, e, clamp((h - 3500.0) / 550.0, 0.0, 1.0));
}
void main() {
  vec2 q = gl_PointCoord - 0.5; if (dot(q, q) > 0.25) discard;
  vec3 base = uMono > 0.5 ? vec3(0.86) : ramp(vH);
  vec3 col = base * (0.25 + 0.95 * vShade) + vec3(1.0, 0.72, 0.42) * vScan * 0.9;
  gl_FragColor = vec4(col, (0.55 + 0.45 * vShade + 0.3 * vScan) * vTwinkle);
}`;
const lineVert = /* glsl */ `
attribute float aH; attribute float aIndex; uniform float uScan; varying float vScan; varying float vIndex;
void main() { vScan = 1.0 - smoothstep(0.0, 120.0, abs(aH - uScan)); vIndex = aIndex; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const lineFrag = /* glsl */ `
uniform float uMono; varying float vScan; varying float vIndex;
void main() { vec3 c = uMono > 0.5 ? vec3(0.9) : vec3(0.85, 0.80, 0.66); gl_FragColor = vec4(mix(c, vec3(1.0, 0.7, 0.4), vScan), (vIndex > 0.5 ? 0.42 : 0.07) + vScan * 0.5); }`;

export class TerrainView {
  renderer: THREE.WebGLRenderer; scene = new THREE.Scene(); camera: THREE.PerspectiveCamera; controls: OrbitControls;
  private uniforms = { uScan: { value: -1000 }, uSize: { value: 26 }, uPx: { value: 1 }, uTime: { value: 0 }, uMono: { value: 0 }, uBg: { value: new THREE.Color('#0b0d0e') } };
  private lineUniforms = { uScan: this.uniforms.uScan, uMono: this.uniforms.uMono };
  private passed: Line2; private passedGeo = new LineGeometry(); private trailPts: THREE.Vector3[] = [];
  private walker = new THREE.Group(); private ring: THREE.Mesh;
  view: View = 'oblique'; private tween: { p0: THREE.Vector3; t0: THREE.Vector3; p1: THREE.Vector3; t1: THREE.Vector3; s: number; d: number } | null = null;
  private walkerPos = new THREE.Vector3(); private heading = new THREE.Vector3(1, 0, 0); private autoAz = 0;
  onViewChange: (v: View) => void = () => {};
  constructor(private el: HTMLElement, private L: Loaded, private reduced: boolean, mobile: boolean) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, devicePixelRatio)); this.renderer.setClearColor(0x0b0d0e);
    el.appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(32, 1, 50, 120000);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !reduced; this.controls.maxPolarAngle = 1.45; this.controls.minDistance = 600; this.controls.maxDistance = 60000;
    this.controls.addEventListener('start', () => { this.tween = null; if (this.view !== 'manual') { this.view = 'manual'; this.onViewChange('manual'); } });
    this.uniforms.uPx.value = this.renderer.getPixelRatio();
    this.buildDots(mobile ? 2 : 1); this.buildContours();
    { let lo = Infinity; for (const h of L.heights) if (h > -100 && h < lo) lo = h; const gs = L.meta.halfSize * 2.4;
      const grid = new THREE.GridHelper(gs, 36, 0x29393e, 0x1e2b2f); grid.position.y = Y(lo) - 120; (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = 0.55; this.scene.add(grid); }

    // trail: full route (thin, beige) and walked part (thick, orange); 12 m above the ground so it reads over the dots
    for (const p of L.trail.trail.points) this.trailPts.push(new THREE.Vector3(p[0], Y(heightAt(L, p[0], p[1])) + 14, p[1]));
    const full = new LineGeometry(); full.setPositions(this.trailPts.flatMap((v) => [v.x, v.y, v.z]));
    const fullMat = new LineMaterial({ color: 0xd9c7a3, linewidth: 1.6, transparent: true, opacity: 0.8, depthTest: false });
    const fl = new Line2(full, fullMat); fl.renderOrder = 5; this.scene.add(fl);
    this.passedGeo.setPositions(this.trailPts.flatMap((v) => [v.x, v.y, v.z]));
    this.passed = new Line2(this.passedGeo, new LineMaterial({ color: 0xff8a3d, linewidth: 4, depthTest: false })); this.passed.renderOrder = 6; this.scene.add(this.passed);
    this.mats.push(fullMat, this.passed.material as LineMaterial);
    const dot = new THREE.Mesh(new THREE.SphereGeometry(55, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffe2c4, depthTest: false }));
    this.ring = new THREE.Mesh(new THREE.RingGeometry(80, 110, 40), new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, depthTest: false, side: THREE.DoubleSide }));
    this.ring.rotation.x = -Math.PI / 2; dot.renderOrder = this.ring.renderOrder = 7; this.walker.add(dot, this.ring); this.scene.add(this.walker);
    new ResizeObserver(() => this.resize()).observe(el); this.resize();
    this.setView('oblique', true);
  }
  private mats: LineMaterial[] = [];
  private buildDots(step: number) {
    const { n, halfSize } = this.L.meta; const H = this.L.heights; const s = (2 * halfSize) / (n - 1);
    const pos: number[] = [], hh: number[] = [], shade: number[] = [], rnd: number[] = [];
    const lx = -0.55, lz = -0.45, ly = 0.7; // light from the north-west
    for (let j = 1; j < n - 1; j += step) for (let i = 1; i < n - 1; i += step) {
      const h = H[j * n + i]; const dx = (H[j * n + i + 1] - H[j * n + i - 1]) / (2 * s), dz = (H[(j + 1) * n + i] - H[(j - 1) * n + i]) / (2 * s);
      const nx = -dx * EXAGGERATION, nz = -dz * EXAGGERATION, len = Math.hypot(nx, 1, nz);
      shade.push(Math.max(0, (nx * lx + ly + nz * lz) / len / Math.hypot(lx, ly, lz)));
      pos.push(-halfSize + i * s, Y(h), -halfSize + j * s); hh.push(h); rnd.push(((i * 73856093) ^ (j * 19349663)) % 1000 / 1000);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aH', new THREE.Float32BufferAttribute(hh, 1)); g.setAttribute('aShade', new THREE.Float32BufferAttribute(shade, 1)); g.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd.map(Math.abs), 1));
    const m = new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: dotVert, fragmentShader: dotFrag, transparent: true, depthWrite: false });
    this.scene.add(new THREE.Points(g, m));
  }
  /** Contours every CONTOUR_M by marching squares on the DEM grid; every INDEX_M drawn brighter (DESIGN.md: 25 m / 100 m). */
  private buildContours() {
    const { n, halfSize } = this.L.meta; const H = this.L.heights; const s = (2 * halfSize) / (n - 1);
    const pos: number[] = [], hh: number[] = [], idx: number[] = [];
    const P = (i: number, j: number) => [-halfSize + i * s, -halfSize + j * s];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = H[j * n + i], b = H[j * n + i + 1], c = H[(j + 1) * n + i + 1], d = H[(j + 1) * n + i];
      const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
      for (let L = Math.ceil(lo / CONTOUR_M) * CONTOUR_M; L <= hi; L += CONTOUR_M) {
        if (L === lo) continue;
        const e: number[][] = []; const [x0, z0] = P(i, j), [x1, z1] = P(i + 1, j + 1);
        const cut = (h1: number, h2: number, p1: number[], p2: number[]) => { if ((h1 < L) !== (h2 < L)) { const f = (L - h1) / (h2 - h1); e.push([p1[0] + (p2[0] - p1[0]) * f, p1[1] + (p2[1] - p1[1]) * f]); } };
        cut(a, b, [x0, z0], [x1, z0]); cut(b, c, [x1, z0], [x1, z1]); cut(c, d, [x1, z1], [x0, z1]); cut(d, a, [x0, z1], [x0, z0]);
        for (let k = 0; k + 1 < e.length; k += 2) { pos.push(e[k][0], Y(L) + 3, e[k][1], e[k + 1][0], Y(L) + 3, e[k + 1][1]); hh.push(L, L); const ix = L % INDEX_M === 0 ? 1 : 0; idx.push(ix, ix); }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('aH', new THREE.Float32BufferAttribute(hh, 1)); g.setAttribute('aIndex', new THREE.Float32BufferAttribute(idx, 1));
    this.scene.add(new THREE.LineSegments(g, new THREE.ShaderMaterial({ uniforms: this.lineUniforms, vertexShader: lineVert, fragmentShader: lineFrag, transparent: true, depthWrite: false })));
  }
  setMono(on: boolean) { this.uniforms.uMono.value = on ? 1 : 0; }
  /** Height (m, real, not exaggerated) of the light band, or null when the band is off. */
  get scanAlt() { const v = this.uniforms.uScan.value; return v < 0 ? null : v; }
  /** Camera azimuth / elevation in degrees, for the AZ / EL readout. */
  angles() { const o = this.camera.position.clone().sub(this.controls.target); const az = Math.round((Math.atan2(o.x, o.z) * 180) / Math.PI); const el = Math.round((Math.asin(Math.min(1, o.y / o.length())) * 180) / Math.PI); return { az, el }; }
  private resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    for (const m of this.mats) m.resolution.set(w, h);
  }
  /** Walker at trail index `k` (fractional) and its world position. */
  setWalker(k: number) {
    const i = Math.min(this.trailPts.length - 2, Math.max(0, Math.floor(k))); const f = Math.min(1, Math.max(0, k - i));
    const a = this.trailPts[i], b = this.trailPts[i + 1];
    this.walkerPos.lerpVectors(a, b, f); this.walker.position.copy(this.walkerPos);
    const d = new THREE.Vector3().subVectors(b, a).setY(0); if (d.lengthSq() > 1) this.heading.lerp(d.normalize(), 0.05).normalize();
    this.passedGeo.instanceCount = Math.max(0, Math.ceil(k)); // segments drawn up to the walker
  }
  worldOf(x: number, z: number, lift = 0) { return new THREE.Vector3(x, Y(heightAt(this.L, x, z)) + lift, z); }
  project(v: THREE.Vector3) {
    const p = v.clone().project(this.camera); const w = this.el.clientWidth, h = this.el.clientHeight;
    return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h, visible: p.z > -1 && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1 };
  }
  private desired(v: View): { pos: THREE.Vector3; target: THREE.Vector3 } | null {
    const sph = (t: THREE.Vector3, dist: number, polar: number, az: number) => ({ target: t, pos: t.clone().add(new THREE.Vector3().setFromSphericalCoords(dist, polar, az)) });
    const mid = this.worldOf(1200, -1200, 0); mid.y = Y(2600);
    if (v === 'oblique') return sph(mid, 17000, 1.02, -2.35);
    if (v === 'top') return sph(new THREE.Vector3(0, Y(2000), 0), 30000, 0.001, 0);
    if (v === 'follow') { const back = this.heading.clone().multiplyScalar(-1); return sph(this.walkerPos.clone(), 2600, 1.08, Math.atan2(back.x, back.z) + 0.35); }
    if (v === 'auto') return sph(this.walkerPos.clone(), 5200, 1.0, this.autoAz);
    return null;
  }
  setView(v: View, instant = this.reduced) {
    this.view = v; this.onViewChange(v); const d = this.desired(v); if (!d) return;
    if (v === 'auto') { const off = this.camera.position.clone().sub(this.walkerPos); this.autoAz = Math.atan2(off.x, off.z); }
    if (instant) { this.camera.position.copy(d.pos); this.controls.target.copy(d.target); this.tween = null; }
    else this.tween = { p0: this.camera.position.clone(), t0: this.controls.target.clone(), p1: d.pos, t1: d.target, s: performance.now(), d: FLY_MS };
    this.controls.update();
  }
  render(now: number, dt: number, animate: boolean) {
    // light sweep: a band climbing from 500 m to 4,100 m every 20 s, plus the dot shimmer (both off under reduced motion)
    this.uniforms.uScan.value = animate ? 500 + ((now / SCAN_PERIOD_MS) % 1) * 3600 : -1000; if (animate) this.uniforms.uTime.value = now / 1000;
    this.ring.scale.setScalar(animate ? 1 + 0.6 * ((now / 1400) % 1) : 1); (this.ring.material as THREE.MeshBasicMaterial).opacity = animate ? 1 - ((now / 1400) % 1) : 0.8;
    if (this.view === 'auto' && animate) this.autoAz += dt * 0.06;
    if (this.tween) {
      const k = Math.min(1, (now - this.tween.s) / this.tween.d), e = k * k * (3 - 2 * k);
      const d = this.desired(this.view); if (d && (this.view === 'follow' || this.view === 'auto')) { this.tween.p1 = d.pos; this.tween.t1 = d.target; }
      this.camera.position.lerpVectors(this.tween.p0, this.tween.p1, e); this.controls.target.lerpVectors(this.tween.t0, this.tween.t1, e);
      if (k >= 1) this.tween = null;
    } else if (this.view === 'follow' || this.view === 'auto') {
      const d = this.desired(this.view)!; const a = this.reduced ? 1 : 1 - Math.exp(-dt * FOLLOW_RATE);
      this.camera.position.lerp(d.pos, a); this.controls.target.lerp(d.target, a);
    }
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
}
