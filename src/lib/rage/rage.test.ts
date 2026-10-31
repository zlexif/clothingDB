import { deflateSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { decodeBlocks } from './dxt';
import { parseClothingName } from './names';
import { GameFileError, openResource, sizeFromFlags } from './resource';
import { readDrawable } from './ydd';
import { MAX_TEXTURE_SIZE, readTextures } from './ytd';

const header = (magic: string, version = 165, system = 0, graphics = 0) => {
  const h = new Uint8Array(16);
  h.set(new TextEncoder().encode(magic), 0);
  const v = new DataView(h.buffer);
  v.setUint32(4, version, true);
  v.setUint32(8, system, true);
  v.setUint32(12, graphics, true);
  return h;
};

const problemOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof GameFileError ? e.problem : 'other';
  }
  return 'none';
};

describe('parseClothingName', () => {
  it('reads a FiveM stream model name', () => {
    expect(parseClothingName('mp_m_freemode_01^jbib_012_u.ydd')).toMatchObject({
      gender: 'male',
      slot: 'tops',
      item: 12,
      colour: null,
      prop: false,
    });
  });

  it('reads the colour letter from a texture name', () => {
    expect(parseClothingName('mp_f_freemode_01^lowr_diff_003_c_uni.ytd')).toMatchObject({
      gender: 'female',
      slot: 'legs',
      item: 3,
      colour: 2,
    });
  });

  it('leaves the ped unknown when the name does not say', () => {
    expect(parseClothingName('feet_000_u.ydd')).toMatchObject({ gender: null, slot: 'shoes', item: 0 });
  });

  it('flags props and unknown names', () => {
    expect(parseClothingName('p_head_005.ydd').prop).toBe(true);
    expect(parseClothingName('my_hoodie.ydd').slot).toBeNull();
  });
});

describe('openResource', () => {
  it('recognises escrowed files', () => {
    expect(problemOf(() => openResource(header('FXAP'), 'model'))).toBe('escrowed');
  });

  it('recognises GTA V Enhanced files', () => {
    expect(problemOf(() => openResource(header('RSC8'), 'model'))).toBe('enhanced');
  });

  it('rejects files that are not GTA resources', () => {
    expect(problemOf(() => openResource(new TextEncoder().encode('just some text, not a model'), 'model'))).toBe(
      'not-gta',
    );
    expect(problemOf(() => openResource(new Uint8Array(4), 'model'))).toBe('empty');
  });

  it('works out page sizes from the flags', () => {
    expect(sizeFromFlags(0)).toBe(0);
    expect(sizeFromFlags(1 << 27)).toBe(0x200);
    expect(sizeFromFlags((1 << 4) | 2)).toBe(0x800 * 256);
  });

  it('opens a valid resource and resolves system and graphics pointers', () => {
    const page = 0x200;
    const body = new Uint8Array(page * 2);
    new DataView(body.buffer).setUint32(0, 0xdeadbeef, true);
    new DataView(body.buffer).setUint32(page, 0x12345678, true);
    const file = new Uint8Array([...header('RSC7', 13, 1 << 27, 1 << 27), ...deflateSync(body)]);
    const res = openResource(file, 'texture');
    expect(res.version).toBe(13);
    expect(res.u32(res.offset(0x50000000) ?? -1)).toBe(0xdeadbeef);
    expect(res.u32(res.offset(0x60000000) ?? -1)).toBe(0x12345678);
    expect(res.offset(0x10)).toBeNull();
  });

  it('refuses files that claim to unpack past the limit', () => {
    const huge = (0xf << 0) | (0x7f << 17);
    expect(problemOf(() => openResource(header('RSC7', 165, huge, huge), 'model'))).toBe('too-large');
  });

  it('refuses textures larger than 4096 pixels', () => {
    const page = 0x200;
    const body = new Uint8Array(page * 2);
    const v = new DataView(body.buffer);
    v.setUint32(0x30, 0x50000040, true);
    v.setUint16(0x38, 1, true);
    v.setUint32(0x40, 0x50000080, true);
    v.setUint16(0x80 + 0x50, MAX_TEXTURE_SIZE + 1, true);
    v.setUint16(0x80 + 0x52, 4, true);
    v.setUint32(0x80 + 0x58, 0x31545844, true);
    v.setUint32(0x80 + 0x70, 0x60000000, true);
    const file = new Uint8Array([...header('RSC7', 13, 1 << 27, 1 << 27), ...deflateSync(body)]);
    expect(problemOf(() => readTextures(file))).toBe('too-large');
  });

  it('reports escrowed models and textures through the readers', () => {
    expect(problemOf(() => readDrawable(header('FXAP')))).toBe('escrowed');
    expect(problemOf(() => readTextures(header('FXAP')))).toBe('escrowed');
  });
});

describe('decodeBlocks', () => {
  it('decodes a solid DXT1 block', () => {
    const block = new Uint8Array([0x00, 0xf8, 0x00, 0xf8, 0, 0, 0, 0]);
    const rgba = decodeBlocks(block, 4, 4, 'dxt1');
    expect([...rgba.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...rgba.slice(60, 64)]).toEqual([255, 0, 0, 255]);
  });

  it('decodes DXT5 alpha', () => {
    const block = new Uint8Array([128, 128, 0, 0, 0, 0, 0, 0, 0xe0, 0x07, 0xe0, 0x07, 0, 0, 0, 0]);
    const rgba = decodeBlocks(block, 4, 4, 'dxt5');
    expect([...rgba.slice(0, 4)]).toEqual([0, 255, 0, 128]);
  });

  it('crops blocks to odd sizes', () => {
    const block = new Uint8Array([0x1f, 0x00, 0x1f, 0x00, 0, 0, 0, 0]);
    const rgba = decodeBlocks(block, 2, 2, 'dxt1');
    expect(rgba.length).toBe(16);
    expect([...rgba.slice(0, 4)]).toEqual([0, 0, 255, 255]);
  });
});
