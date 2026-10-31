import { inflateSync } from 'fflate';

export type GameFileProblem = 'escrowed' | 'enhanced' | 'not-gta' | 'damaged' | 'empty' | 'too-large';

export const MAX_UNPACKED_BYTES = 256 * 1024 * 1024;

export class GameFileError extends Error {
  constructor(
    public readonly problem: GameFileProblem,
    message: string,
  ) {
    super(message);
    this.name = 'GameFileError';
  }
}

const RSC7 = 0x37435352;
const RSC8 = 0x38435352;
const FXAP = 0x50415846;

const SYSTEM = 0x50000000;
const GRAPHICS = 0x60000000;

export function sizeFromFlags(flags: number): number {
  const s0 = ((flags >>> 27) & 0x1) << 0;
  const s1 = ((flags >>> 26) & 0x1) << 1;
  const s2 = ((flags >>> 25) & 0x1) << 2;
  const s3 = ((flags >>> 24) & 0x1) << 3;
  const s4 = ((flags >>> 17) & 0x7f) << 4;
  const s5 = ((flags >>> 11) & 0x3f) << 5;
  const s6 = ((flags >>> 7) & 0xf) << 6;
  const s7 = ((flags >>> 5) & 0x3) << 7;
  const s8 = ((flags >>> 4) & 0x1) << 8;
  const base = 0x200 << (flags & 0xf);
  return base * (s0 + s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8);
}

export class Resource {
  readonly view: DataView;
  readonly bytes: Uint8Array;

  constructor(
    data: Uint8Array,
    private readonly systemSize: number,
    readonly version: number,
  ) {
    this.bytes = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  offset(pointer: number): number | null {
    if (!pointer) return null;
    const region = pointer & 0xf0000000;
    const local = pointer & 0x0fffffff;
    let at: number;
    if (region === SYSTEM) at = local;
    else if (region === GRAPHICS) at = this.systemSize + local;
    else return null;
    return at < this.bytes.length ? at : null;
  }

  pointer(at: number): number {
    return this.view.getUint32(at, true);
  }

  u8(at: number): number {
    return this.view.getUint8(at);
  }

  u16(at: number): number {
    return this.view.getUint16(at, true);
  }

  u32(at: number): number {
    return this.view.getUint32(at, true);
  }

  f32(at: number): number {
    return this.view.getFloat32(at, true);
  }

  string(pointer: number): string {
    const at = this.offset(pointer);
    if (at === null) return '';
    let end = at;
    while (end < this.bytes.length && this.bytes[end] !== 0) end++;
    return new TextDecoder().decode(this.bytes.subarray(at, end));
  }

  slice(pointer: number, length: number): Uint8Array | null {
    const at = this.offset(pointer);
    if (at === null || at + length > this.bytes.length) return null;
    return this.bytes.subarray(at, at + length);
  }
}

export function openResource(file: Uint8Array, kind: string): Resource {
  if (file.length < 16) throw new GameFileError('empty', `This ${kind} file is empty.`);

  const head = new DataView(file.buffer, file.byteOffset, 16);
  const magic = head.getUint32(0, true);

  if (magic === FXAP) {
    throw new GameFileError('escrowed', 'This file is escrowed (encrypted). It only opens inside FiveM.');
  }
  if (magic === RSC8) {
    throw new GameFileError('enhanced', 'This file is for GTA V Enhanced, which is not supported yet.');
  }
  if (magic !== RSC7) {
    throw new GameFileError('not-gta', `This is not a GTA V ${kind} file.`);
  }

  const version = head.getUint32(4, true);
  const systemSize = sizeFromFlags(head.getUint32(8, true));
  const graphicsSize = sizeFromFlags(head.getUint32(12, true));
  if (systemSize + graphicsSize > MAX_UNPACKED_BYTES) {
    throw new GameFileError('too-large', `This ${kind} file is too large to open here (over 256 MB unpacked).`);
  }

  let data: Uint8Array;
  try {
    data = inflateSync(file.subarray(16), { out: new Uint8Array(systemSize + graphicsSize) });
  } catch {
    throw new GameFileError('damaged', `This ${kind} file is damaged and could not be opened.`);
  }
  return new Resource(data, systemSize, version);
}
