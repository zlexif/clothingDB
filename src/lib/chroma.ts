// Chroma-key pipeline for green or magenta game screenshots.
//
// Third-party code: keyness(), removeChromaKey() (keying, despill, feathering)
// and centreCrop() are adapted from uz_AutoShot by uz-scripts:
//   https://github.com/uz-scripts/uz_AutoShot  (resources/src/lib/shot.js)
//   Copyright uz-scripts, licensed under the Apache License, Version 2.0
//   http://www.apache.org/licenses/LICENSE-2.0
// Changes: ported to TypeScript, works on ImageData instead of a canvas
// element, and takes its settings from KeySettings. detectKey(),
// subjectCrop() and processCapture() are clothingDB's own. See NOTICE.

export type KeyColour = 'green' | 'magenta';
export type Framing = 'centre' | 'subject';
export type OutFormat = 'png' | 'webp';

export interface KeySettings {
  key: KeyColour | 'auto';
  feather: number;
  passes: number;
  framing: Framing;
  padding: number;
  size: number;
  format: OutFormat;
}

export const DEFAULT_SETTINGS: KeySettings = {
  key: 'auto',
  feather: 2,
  passes: 2,
  framing: 'subject',
  padding: 0.08,
  size: 512,
  format: 'webp',
};

function keyness(r: number, g: number, b: number, magenta: boolean): number {
  if (magenta) {
    const rOverG = r - g;
    const bOverG = b - g;
    const minOver = Math.min(rOverG, bOverG);
    const primary = Math.min(r, b);
    if (minOver <= 0 || primary <= 10) return 0;
    const edge = minOver < 20 ? minOver / 20 : 1;
    const soft = primary < 40 ? (primary - 10) / 30 : 1;
    return Math.min(1, (rOverG + bOverG) / (r + b + 1)) * edge * soft;
  }
  const gOverR = g - r;
  const gOverB = g - b;
  const minOver = Math.min(gOverR, gOverB);
  if (minOver <= 0 || g <= 10) return 0;
  const edge = minOver < 20 ? minOver / 20 : 1;
  const soft = g < 40 ? (g - 10) / 30 : 1;
  return Math.min(1, (gOverR + gOverB) / (g + 1)) * edge * soft;
}

export function detectKey(image: ImageData): KeyColour {
  const { data: d, width: w, height: h } = image;
  let green = 0;
  let magenta = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    green += keyness(d[i], d[i + 1], d[i + 2], false);
    magenta += keyness(d[i], d[i + 1], d[i + 2], true);
  };
  const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
  for (let x = 0; x < w; x += step) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y += step) {
    sample(0, y);
    sample(w - 1, y);
  }
  return magenta > green ? 'magenta' : 'green';
}

export function removeChromaKey(image: ImageData, key: KeyColour, feather: number, passes: number): void {
  const d = image.data;
  const { width: w, height: h } = image;
  const magenta = key === 'magenta';

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const k = keyness(r, g, b, magenta);
    if (k <= 0) continue;
    d[i + 3] = 255 * (1 - k) + 0.5;
    if (magenta) {
      d[i] = r - (r - g) * k + 0.5;
      d[i + 2] = b - (b - g) * k + 0.5;
    } else {
      d[i + 1] = g - (g - Math.max(r, b)) * k + 0.5;
    }
  }

  if (feather <= 0) return;
  const kernel = (feather * 2 + 1) ** 2;
  const alpha = new Uint8Array(w * h);
  for (let pass = 0; pass < passes; pass++) {
    for (let i = 0; i < alpha.length; i++) alpha[i] = d[(i << 2) + 3];
    for (let y = feather; y < h - feather; y++) {
      for (let x = feather; x < w - feather; x++) {
        const idx = y * w + x;
        const a = alpha[idx];
        const flat = alpha[idx - 1] === a && alpha[idx + 1] === a && alpha[idx - w] === a && alpha[idx + w] === a;
        if ((a === 0 || a === 255) && flat) continue;
        let sum = 0;
        for (let ky = -feather; ky <= feather; ky++) {
          const row = (y + ky) * w + x;
          for (let kx = -feather; kx <= feather; kx++) sum += alpha[row + kx];
        }
        d[(idx << 2) + 3] = sum / kernel + 0.5;
      }
    }
  }
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function centreCrop(srcW: number, srcH: number): Rect {
  const side = Math.min(srcW, srcH);
  return { x: Math.round((srcW - side) / 2), y: Math.round((srcH - side) / 2), w: side, h: side };
}

function subjectCrop(image: ImageData, padding: number): Rect {
  const { data: d, width: w, height: h } = image;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return centreCrop(w, h);
  const side = Math.round(Math.max(x1 - x0, y1 - y0) * (1 + padding * 2));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { x: Math.round(cx - side / 2), y: Math.round(cy - side / 2), w: side, h: side };
}

export interface Processed {
  key: KeyColour;
  blob: Blob;
  url: string;
}

export async function processCapture(file: Blob, s: KeySettings): Promise<Processed> {
  const bitmap = await createImageBitmap(file);
  const source = document.createElement('canvas');
  source.width = bitmap.width;
  source.height = bitmap.height;
  const sctx = source.getContext('2d', { willReadFrequently: true })!;
  sctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pixels = sctx.getImageData(0, 0, source.width, source.height);
  const key = s.key === 'auto' ? detectKey(pixels) : s.key;
  removeChromaKey(pixels, key, s.feather, s.passes);
  sctx.putImageData(pixels, 0, 0);

  const crop = s.framing === 'subject' ? subjectCrop(pixels, s.padding) : centreCrop(source.width, source.height);
  const out = document.createElement('canvas');
  out.width = s.size;
  out.height = s.size;
  const octx = out.getContext('2d')!;
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, s.size, s.size);

  const blob = await new Promise<Blob>((resolve, reject) =>
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), `image/${s.format}`, 0.92),
  );
  return { key, blob, url: URL.createObjectURL(blob) };
}
