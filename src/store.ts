// Local-only persistence of imported photos/videos in IndexedDB: the original file, the decoded JPEG (HEIC), the thumbnail
// and the parsed metadata, so they survive a reload. Nothing leaves the device. Quota errors are reported, never thrown.
import type { MediaItem } from './media';
const DB = 'mount-replay', STORE = 'media', VER = 1;
export interface Saved { id: string; order: number; name: string; type: string; lastModified: number; kind: MediaItem['kind']; heic: boolean;
  file: Blob; decoded: Blob | null; thumb: Blob | null; lat: number | null; lon: number | null; wall: MediaItem['wall']; utc: boolean }
let dbp: Promise<IDBDatabase> | null = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => { if (!('indexedDB' in self)) return rej(new Error('no indexedDB'));
    const r = indexedDB.open(DB, VER); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return dbp;
}
const tx = async <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void) => { const d = await db();
  return new Promise<T | undefined>((res, rej) => { const t = d.transaction(STORE, mode); const req = fn(t.objectStore(STORE)); let v: T | undefined;
    if (req) req.onsuccess = () => { v = req.result; }; t.oncomplete = () => res(v); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); };
const blobOf = async (url: string | null) => (url ? fetch(url).then((r) => r.blob()) : null);
export const isQuota = (e: unknown) => e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED');

let order = Date.now();
/** Save one item; resolves 'ok', 'quota' (storage full) or 'error'. */
export async function saveItem(m: MediaItem): Promise<'ok' | 'quota' | 'error'> {
  try {
    const rec: Saved = { id: m.id, order: order++, name: m.name, type: m.file.type, lastModified: m.file.lastModified, kind: m.kind, heic: m.heic, file: m.file,
      decoded: m.decoded ? await blobOf(m.url) : null, thumb: await blobOf(m.thumb), lat: m.lat, lon: m.lon, wall: m.wall, utc: m.utc };
    await tx('readwrite', (s) => s.put(rec)); return 'ok';
  } catch (e) { console.info('could not save media', e); return isQuota(e) ? 'quota' : 'error'; }
}
export async function loadAllSaved(): Promise<Saved[]> {
  try { const all = (await tx<Saved[]>('readonly', (s) => s.getAll() as IDBRequest<Saved[]>)) ?? []; return all.sort((a, b) => a.order - b.order); }
  catch (e) { console.info('could not read saved media', e); return []; }
}
export async function deleteSaved(id: string) { try { await tx('readwrite', (s) => s.delete(id)); } catch { /* ignore */ } }
export async function clearSaved() { try { await tx('readwrite', (s) => s.clear()); } catch { /* ignore */ } }
/** Rebuild a MediaItem from a saved record (new object URLs; ids are re-issued by the caller). */
export function restore(r: Saved, id: string): MediaItem {
  const file = new File([r.file], r.name, { type: r.type, lastModified: r.lastModified });
  return { id, file, name: r.name, kind: r.kind, heic: r.heic, url: URL.createObjectURL(r.decoded ?? file), thumb: r.thumb ? URL.createObjectURL(r.thumb) : null,
    decoded: !!r.decoded, lat: r.lat, lon: r.lon, wall: r.wall, utc: r.utc, along: null, t: null, how: 'none' };
}
