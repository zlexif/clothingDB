import { GameFileError, openResource, type Resource } from './resource';

export interface ClothingMesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

const POSITION = 0;
const NORMAL = 3;
const TEXCOORD0 = 6;

const COMPONENT_SIZE = [0, 4, 4, 8, 0, 8, 12, 16, 4, 4, 4, 0, 0, 0, 0, 0];
const HALF2 = 1;
const FLOAT2 = 5;
const FLOAT3 = 6;
const FLOAT4 = 7;
const SNORM4 = 10;

function half(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1;
  const exp = (bits >> 10) & 0x1f;
  const frac = bits & 0x3ff;
  if (exp === 0) return sign * 2 ** -14 * (frac / 1024);
  if (exp === 31) return frac ? Number.NaN : sign * Number.POSITIVE_INFINITY;
  return sign * 2 ** (exp - 15) * (1 + frac / 1024);
}

interface Declaration {
  flags: number;
  typesLow: number;
  typesHigh: number;
}

function componentType(decl: Declaration, semantic: number): number {
  const word = semantic < 8 ? decl.typesLow : decl.typesHigh;
  return (word >>> ((semantic % 8) * 4)) & 0xf;
}

function componentOffset(decl: Declaration, semantic: number): number {
  let offset = 0;
  for (let k = 0; k < semantic; k++) {
    if ((decl.flags >>> k) & 1) offset += COMPONENT_SIZE[componentType(decl, k)];
  }
  return offset;
}

function has(decl: Declaration, semantic: number): boolean {
  return ((decl.flags >>> semantic) & 1) === 1;
}

function list(res: Resource, pointer: number): number[] {
  const at = res.offset(pointer);
  if (at === null) return [];
  const items = res.offset(res.pointer(at));
  const count = res.u16(at + 8);
  if (items === null) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(res.pointer(items + i * 8));
  return out;
}

function geometries(res: Resource, model: number): number[] {
  const at = res.offset(model);
  if (at === null) return [];
  const items = res.offset(res.pointer(at + 0x08));
  const count = res.u16(at + 0x10);
  if (items === null) return [];
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(res.pointer(items + i * 8));
  return out;
}

function lodModels(res: Resource, drawable: number): number[] {
  for (const lod of [0x50, 0x58, 0x60, 0x68]) {
    const models = list(res, res.pointer(drawable + lod));
    if (models.some((m) => geometries(res, m).length > 0)) return models;
  }
  return [];
}

export function readDrawable(file: Uint8Array): ClothingMesh {
  const res = openResource(file, 'model (.ydd)');
  const drawables = res.offset(res.pointer(0x30));
  const count = res.u16(0x38);
  const first = drawables !== null && count > 0 ? res.offset(res.pointer(drawables)) : null;
  if (first === null) throw new GameFileError('damaged', 'This model file has no clothing in it.');

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const model of lodModels(res, first)) {
    for (const geometryPointer of geometries(res, model)) {
      const g = res.offset(geometryPointer);
      if (g === null) continue;
      const vb = res.offset(res.pointer(g + 0x18));
      const ib = res.offset(res.pointer(g + 0x38));
      if (vb === null || ib === null) continue;

      const stride = res.u16(vb + 0x08);
      const vertexCount = res.u32(vb + 0x18);
      const dataPointer = res.pointer(vb + 0x10) || res.pointer(vb + 0x20);
      const info = res.offset(res.pointer(vb + 0x30));
      if (info === null || vertexCount <= 4) continue;

      const decl: Declaration = { flags: res.u32(info), typesLow: res.u32(info + 8), typesHigh: res.u32(info + 12) };
      const vertices = res.offset(dataPointer);
      if (vertices === null || !has(decl, POSITION)) continue;

      const indexCount = res.u32(ib + 0x08);
      const indexData = res.offset(res.pointer(ib + 0x10));
      if (indexData === null) continue;

      const posAt = componentOffset(decl, POSITION);
      const posType = componentType(decl, POSITION);
      const nrmAt = componentOffset(decl, NORMAL);
      const nrmType = componentType(decl, NORMAL);
      const uvAt = componentOffset(decl, TEXCOORD0);
      const uvType = componentType(decl, TEXCOORD0);
      const base = positions.length / 3;

      for (let v = 0; v < vertexCount; v++) {
        const at = vertices + v * stride;
        if (posType !== FLOAT3 && posType !== FLOAT4)
          throw new GameFileError('damaged', 'This model uses an unknown layout.');
        const x = res.f32(at + posAt);
        const y = res.f32(at + posAt + 4);
        const z = res.f32(at + posAt + 8);
        positions.push(x, z, -y);

        if (has(decl, NORMAL) && (nrmType === FLOAT3 || nrmType === FLOAT4)) {
          normals.push(res.f32(at + nrmAt), res.f32(at + nrmAt + 8), -res.f32(at + nrmAt + 4));
        } else if (has(decl, NORMAL) && nrmType === SNORM4) {
          const sn = (o: number) => Math.max(-1, ((res.u8(at + nrmAt + o) << 24) >> 24) / 127);
          normals.push(sn(0), sn(2), -sn(1));
        } else {
          normals.push(0, 1, 0);
        }

        if (has(decl, TEXCOORD0) && uvType === HALF2) {
          uvs.push(half(res.u16(at + uvAt)), half(res.u16(at + uvAt + 2)));
        } else if (has(decl, TEXCOORD0) && uvType === FLOAT2) {
          uvs.push(res.f32(at + uvAt), res.f32(at + uvAt + 4));
        } else {
          uvs.push(0, 0);
        }
      }

      for (let i = 0; i + 2 < indexCount; i += 3) {
        const a = res.u16(indexData + i * 2);
        const b = res.u16(indexData + i * 2 + 2);
        const c = res.u16(indexData + i * 2 + 4);
        if (a < vertexCount && b < vertexCount && c < vertexCount) indices.push(base + a, base + b, base + c);
      }
    }
  }

  if (!indices.length) throw new GameFileError('damaged', 'This model file has no clothing in it.');

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}
