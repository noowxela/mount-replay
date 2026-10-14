// HEIC/HEIF -> JPEG in a Web Worker: libheif (WASM) decodes, OffscreenCanvas encodes. Keeps the UI thread free.
// @ts-expect-error libheif-js ships no types
import libheifFactory from 'libheif-js/wasm-bundle';
interface Img { get_width(): number; get_height(): number; display(d: ImageData, cb: (d: ImageData | null) => void): void; free?(): void }
const libheif = libheifFactory as { HeifDecoder: new () => { decode(b: ArrayBuffer | Uint8Array): Img[] } };
self.onmessage = async (e: MessageEvent<{ id: number; buf: ArrayBuffer }>) => {
  const { id, buf } = e.data;
  try {
    const imgs = new libheif.HeifDecoder().decode(new Uint8Array(buf)); if (!imgs.length) throw new Error('no image');
    const img = imgs[0]; const w = img.get_width(), h = img.get_height();
    const data = await new Promise<ImageData>((res, rej) => img.display(new ImageData(w, h), (d) => (d ? res(d) : rej(new Error('display')))));
    const c = new OffscreenCanvas(w, h); c.getContext('2d')!.putImageData(data, 0, 0);
    const blob = await c.convertToBlob({ type: 'image/jpeg', quality: 0.9 }); for (const i of imgs) i.free?.();
    (self as unknown as Worker).postMessage({ id, blob });
  } catch (err) { (self as unknown as Worker).postMessage({ id, error: String(err) }); }
};
