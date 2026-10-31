import { decodeBlocks } from './dxt';
import { GameFileError, openResource } from './resource';

export type ClothingTexture =
  | { kind: 'rgba'; name: string; width: number; height: number; data: Uint8Array }
  | { kind: 'bc7'; name: string; width: number; height: number; data: Uint8Array };

const DXT1 = 0x31545844;
const DXT3 = 0x33545844;
const DXT5 = 0x35545844;
const BC7 = 0x20374342;
const A8R8G8B8 = 21;
const X8R8G8B8 = 22;
const A8B8G8R8 = 32;
const L8 = 50;

export const MAX_TEXTURE_SIZE = 4096;

function blocks(width: number, height: number, bytesPerBlock: number) {
  return Math.max(1, Math.ceil(width / 4)) * Math.max(1, Math.ceil(height / 4)) * bytesPerBlock;
}

function isDiffuse(name: string) {
  const n = name.toLowerCase();
  if (/_n$|_normal|_s$|_spec/.test(n)) return false;
  return true;
}

export function readTextures(file: Uint8Array): ClothingTexture[] {
  const res = openResource(file, 'texture (.ytd)');
  const items = res.offset(res.pointer(0x30));
  const count = res.u16(0x38);
  if (items === null || !count) throw new GameFileError('damaged', 'This texture file has no pictures in it.');

  const textures: ClothingTexture[] = [];
  let oversized = false;
  for (let i = 0; i < count; i++) {
    const t = res.offset(res.pointer(items + i * 8));
    if (t === null) continue;
    const name = res.string(res.pointer(t + 0x28));
    const width = res.u16(t + 0x50);
    const height = res.u16(t + 0x52);
    const format = res.u32(t + 0x58);
    const dataPointer = res.pointer(t + 0x70);
    if (!width || !height) continue;
    if (width > MAX_TEXTURE_SIZE || height > MAX_TEXTURE_SIZE) {
      oversized = true;
      continue;
    }

    if (format === DXT1 || format === DXT3 || format === DXT5) {
      const kind = format === DXT1 ? 'dxt1' : format === DXT3 ? 'dxt3' : 'dxt5';
      const src = res.slice(dataPointer, blocks(width, height, kind === 'dxt1' ? 8 : 16));
      if (src) textures.push({ kind: 'rgba', name, width, height, data: decodeBlocks(src, width, height, kind) });
    } else if (format === BC7) {
      const src = res.slice(dataPointer, blocks(width, height, 16));
      if (src) textures.push({ kind: 'bc7', name, width, height, data: src.slice() });
    } else if (format === A8R8G8B8 || format === X8R8G8B8 || format === A8B8G8R8) {
      const src = res.slice(dataPointer, width * height * 4);
      if (!src) continue;
      const data = new Uint8Array(width * height * 4);
      const bgr = format !== A8B8G8R8;
      for (let p = 0; p < width * height; p++) {
        data[p * 4] = src[p * 4 + (bgr ? 2 : 0)];
        data[p * 4 + 1] = src[p * 4 + 1];
        data[p * 4 + 2] = src[p * 4 + (bgr ? 0 : 2)];
        data[p * 4 + 3] = format === X8R8G8B8 ? 255 : src[p * 4 + 3];
      }
      textures.push({ kind: 'rgba', name, width, height, data });
    } else if (format === L8) {
      const src = res.slice(dataPointer, width * height);
      if (!src) continue;
      const data = new Uint8Array(width * height * 4);
      for (let p = 0; p < width * height; p++) data.set([src[p], src[p], src[p], 255], p * 4);
      textures.push({ kind: 'rgba', name, width, height, data });
    }
  }

  if (!textures.length && oversized) {
    throw new GameFileError('too-large', 'This texture is larger than 4096 × 4096, which is too large to show here.');
  }
  if (!textures.length) throw new GameFileError('damaged', 'This texture file uses a format that cannot be shown.');
  return textures;
}

export function pickDiffuse(textures: ClothingTexture[]): ClothingTexture {
  return textures.find((t) => /diff/i.test(t.name)) ?? textures.find((t) => isDiffuse(t.name)) ?? textures[0];
}
