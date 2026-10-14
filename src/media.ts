// Client-side photo/video import: metadata (exifr for images incl. HEIC; a tiny QuickTime/MP4 atom reader for video),
// thumbnails, and placement on the trail. Nothing leaves the browser: files are read with the File API only.
import exifr from 'exifr';

export interface MediaItem {
  id: string; file: File; name: string; kind: 'image' | 'video'; heic: boolean;
  url: string; thumb: string | null;          // object URLs (revoked on remove); for HEIC, url is the decoded JPEG
  decoded: boolean;                            // HEIC/HEIF decoded to JPEG in the browser (heic2any)
  lat: number | null; lon: number | null;      // from GPS metadata
  wall: { date: string; secs: number } | null; // camera wall-clock time: YYYY-MM-DD + seconds of day
  utc: boolean;                                // wall clock derived from a UTC timestamp (video), shown in UTC+8
  along: number | null; t: number | null; how: 'gps' | 'time' | 'none' | 'late' | 'offtrail';
}

const pad = (n: number) => String(n).padStart(2, '0');
function wallFromExif(s: unknown): MediaItem['wall'] {
  if (typeof s !== 'string') return null;
  const m = /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s); if (!m) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, secs: +m[4] * 3600 + +m[5] * 60 + +m[6] };
}
function wallFromUtc(ms: number, tzHours = 8): MediaItem['wall'] {
  const d = new Date(ms + tzHours * 3600e3);
  return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, secs: d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds() };
}

/** QuickTime / MP4: creation time from the mvhd atom (UTC, seconds since 1904) and an ISO 6709 location string
 *  (©xyz or com.apple.quicktime.location.ISO6709), searched in the first and last 4 MB where the moov atom lives. */
async function readQuickTime(file: File) {
  const chunks = [file.slice(0, 4 << 20), file.size > 8 << 20 ? file.slice(file.size - (4 << 20)) : null].filter(Boolean) as Blob[];
  let created: number | null = null, lat: number | null = null, lon: number | null = null;
  for (const c of chunks) {
    const b = new Uint8Array(await c.arrayBuffer()); const dv = new DataView(b.buffer);
    for (let i = 4; i < b.length - 32 && created == null; i++) {
      if (b[i] === 0x6d && b[i + 1] === 0x76 && b[i + 2] === 0x68 && b[i + 3] === 0x64) { // 'mvhd'
        const ver = b[i + 4]; const secs = ver === 1 ? Number(dv.getBigUint64(i + 8)) : dv.getUint32(i + 8);
        if (secs > 0) created = (secs - 2082844800) * 1000; // 1904 -> 1970
      }
    }
    if (lat == null) {
      const text = new TextDecoder('latin1').decode(b);
      const m = /([+-]\d{1,2}\.\d{3,})([+-]\d{1,3}\.\d{3,})/.exec(text);
      if (m) { lat = +m[1]; lon = +m[2]; }
    }
  }
  return { created, lat, lon };
}

async function thumbnail(item: MediaItem): Promise<string | null> {
  const size = 160; const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d')!;
  const draw = (src: CanvasImageSource, w: number, h: number) => {
    const k = size / Math.max(w, h); canvas.width = Math.round(w * k); canvas.height = Math.round(h * k);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    return new Promise<string | null>((res) => canvas.toBlob((bl) => res(bl ? URL.createObjectURL(bl) : null), 'image/jpeg', 0.8));
  };
  try {
    if (item.kind === 'image') { const src = item.decoded ? await fetch(item.url).then((r) => r.blob()) : item.file; const bmp = await createImageBitmap(src); const r = await draw(bmp, bmp.width, bmp.height); bmp.close(); return r; }
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'metadata'; v.src = item.url;
    await new Promise<void>((res, rej) => { v.onloadeddata = () => res(); v.onerror = () => rej(new Error('video')); setTimeout(() => rej(new Error('timeout')), 8000); });
    v.currentTime = Math.min(0.5, (v.duration || 1) / 2); await new Promise<void>((res) => { v.onseeked = () => res(); setTimeout(res, 2000); });
    return await draw(v, v.videoWidth, v.videoHeight);
  } catch { return null; } // e.g. HEIC in a browser without HEIC decoding: a placeholder is shown
}

/** Files are processed in batches of BATCH_SIZE: metadata reads, HEIC decodes and thumbnails run concurrently inside a batch. */
export const BATCH_SIZE = 20;
const POOL = Math.max(1, Math.min(4, navigator.hardwareConcurrency || 2));

/** Small pool of HEIC decode workers (libheif WASM + OffscreenCanvas), created lazily on the first HEIC. */
let workers: { w: Worker; busy: boolean }[] | null = null; let wseq = 0;
const waiting: (() => void)[] = []; const replies = new Map<number, (r: { blob?: Blob; error?: string }) => void>();
function pool() {
  if (!workers) workers = Array.from({ length: POOL }, () => { const w = new Worker(new URL('./heic.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e) => { replies.get(e.data.id)?.(e.data); replies.delete(e.data.id); }; return { w, busy: false }; });
  return workers;
}
async function workerDecode(file: File): Promise<Blob> {
  const ws = pool(); let slot = ws.find((x) => !x.busy);
  while (!slot) { await new Promise<void>((r) => waiting.push(r)); slot = ws.find((x) => !x.busy); }
  slot.busy = true;
  try { const buf = await file.arrayBuffer(); const id = ++wseq;
    const r = await new Promise<{ blob?: Blob; error?: string }>((res) => { replies.set(id, res); slot!.w.postMessage({ id, buf }, [buf]); });
    if (!r.blob) throw new Error(r.error || 'decode'); return r.blob;
  } finally { slot.busy = false; waiting.shift()?.(); }
}
const nativeHeic = (async () => { try { const probe = await fetch('data:image/heic;base64,AAAAGGZ0eXBoZWljAAAAAG1pZjFoZWlj').then((r) => r.blob()); await createImageBitmap(probe); return true; } catch { return false; } })();
/** HEIC/HEIF -> JPEG blob: the browser's own decoder when it has one (Safari), else the worker pool, else heic2any.
 *  Metadata is always read from the ORIGINAL file. */
async function decodeHeic(file: File): Promise<Blob | null> {
  if (await nativeHeic) { try { const bmp = await createImageBitmap(file); const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d')!.drawImage(bmp, 0, 0); bmp.close();
    const b = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.9)); if (b) return b; } catch { /* fall through */ } }
  try { return await workerDecode(file); } catch (e) { console.info('HEIC worker decode failed, trying heic2any', e); }
  try { const { default: heic2any } = await import('heic2any'); const r = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }); return Array.isArray(r) ? r[0] : r; }
  catch (e) { console.info('HEIC decode failed', e); return null; }
}

async function readMeta(item: MediaItem) {
  const file = item.file;
  try {
    if (item.kind === 'image') {
      const [tags, gps] = await Promise.all([
        exifr.parse(file, { reviveValues: false, pick: ['DateTimeOriginal', 'CreateDate', 'DateTimeDigitized'] }).catch(() => null),
        exifr.gps(file).catch(() => null)]);
      item.wall = wallFromExif(tags?.DateTimeOriginal ?? tags?.CreateDate ?? tags?.DateTimeDigitized);
      if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) { item.lat = gps.latitude; item.lon = gps.longitude; }
    } else {
      const q = await readQuickTime(file);
      if (q.created) { item.wall = wallFromUtc(q.created); item.utc = true; }
      item.lat = q.lat; item.lon = q.lon;
    }
  } catch { /* unreadable metadata: the item stays unplaced (no guessing from the file date) */ }
}

/** Unique across sessions (also the IndexedDB key); numeric part keeps file order for ties. */
let seq = Date.now() * 1000;
export const nextId = () => `m${++seq}`;
export type Stage = 'restoring' | 'queued' | 'reading' | 'converting' | 'thumb' | 'done' | 'unsupported' | 'error';
/** Imports files in batches of BATCH_SIZE, concurrently inside a batch, reporting each file's stage by its index.
 *  Ids are assigned in file order up front, so the result order is stable whatever finishes first. */
export async function importFiles(files: FileList | File[], onStage: (i: number, stage: Stage, item?: MediaItem) => void = () => {}): Promise<MediaItem[]> {
  const list = Array.from(files); const out: (MediaItem | null)[] = list.map(() => null);
  const ids = list.map(() => nextId());
  const one = async (file: File, i: number) => {
    try {
      const isVideo = file.type.startsWith('video/') || /\.(mov|mp4|m4v)$/i.test(file.name);
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|heic|heif|webp)$/i.test(file.name);
      if (!isVideo && !isImage) { onStage(i, 'unsupported'); return; }
      onStage(i, 'reading');
      const item: MediaItem = { id: ids[i], file, name: file.name, kind: isVideo ? 'video' : 'image', heic: /\.(heic|heif)$/i.test(file.name) || /hei[cf]/.test(file.type),
        url: URL.createObjectURL(file), thumb: null, decoded: false, lat: null, lon: null, wall: null, utc: false, along: null, t: null, how: 'none' };
      await readMeta(item);
      if (item.heic) { onStage(i, 'converting'); const jpg = await decodeHeic(file); if (jpg) { URL.revokeObjectURL(item.url); item.url = URL.createObjectURL(jpg); item.decoded = true; } }
      onStage(i, 'thumb'); item.thumb = await thumbnail(item);
      out[i] = item; onStage(i, 'done', item);
    } catch (e) { console.info('import failed', file.name, e); onStage(i, 'error'); }
  };
  for (let b = 0; b < list.length; b += BATCH_SIZE) await Promise.all(list.slice(b, b + BATCH_SIZE).map((f, k) => one(f, b + k)));
  return out.filter((x): x is MediaItem => !!x);
}
export function disposeMedia(m: MediaItem) { URL.revokeObjectURL(m.url); if (m.thumb) URL.revokeObjectURL(m.thumb); }
