function colour565(c: number, out: number[], i: number) {
  const r = (c >> 11) & 0x1f;
  const g = (c >> 5) & 0x3f;
  const b = c & 0x1f;
  out[i] = (r << 3) | (r >> 2);
  out[i + 1] = (g << 2) | (g >> 4);
  out[i + 2] = (b << 3) | (b >> 2);
}

function colourBlock(src: Uint8Array, at: number, alpha1bit: boolean, palette: number[]) {
  const c0 = src[at] | (src[at + 1] << 8);
  const c1 = src[at + 2] | (src[at + 3] << 8);
  colour565(c0, palette, 0);
  colour565(c1, palette, 4);
  palette[3] = 255;
  palette[7] = 255;
  if (!alpha1bit || c0 > c1) {
    for (let k = 0; k < 3; k++) {
      palette[8 + k] = (2 * palette[k] + palette[4 + k]) / 3;
      palette[12 + k] = (palette[k] + 2 * palette[4 + k]) / 3;
    }
    palette[11] = 255;
    palette[15] = 255;
  } else {
    for (let k = 0; k < 3; k++) palette[8 + k] = (palette[k] + palette[4 + k]) / 2;
    palette[11] = 255;
    palette[12] = 0;
    palette[13] = 0;
    palette[14] = 0;
    palette[15] = 0;
  }
}

function alphaBlock(src: Uint8Array, at: number, out: number[]) {
  const a0 = src[at];
  const a1 = src[at + 1];
  const table = [a0, a1];
  if (a0 > a1) for (let k = 1; k < 7; k++) table.push(((7 - k) * a0 + k * a1) / 7);
  else {
    for (let k = 1; k < 5; k++) table.push(((5 - k) * a0 + k * a1) / 5);
    table.push(0, 255);
  }
  const low = src[at + 2] | (src[at + 3] << 8) | (src[at + 4] << 16);
  const high = src[at + 5] | (src[at + 6] << 8) | (src[at + 7] << 16);
  for (let p = 0; p < 8; p++) out[p] = table[(low >> (3 * p)) & 7];
  for (let p = 0; p < 8; p++) out[p + 8] = table[(high >> (3 * p)) & 7];
}

export type BlockFormat = 'dxt1' | 'dxt3' | 'dxt5';

export function decodeBlocks(src: Uint8Array, width: number, height: number, format: BlockFormat): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  const blockBytes = format === 'dxt1' ? 8 : 16;
  const bw = Math.max(1, Math.ceil(width / 4));
  const bh = Math.max(1, Math.ceil(height / 4));
  const palette = new Array<number>(16).fill(0);
  const alphas = new Array<number>(16).fill(255);

  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      const at = (by * bw + bx) * blockBytes;
      if (at + blockBytes > src.length) return out;
      const colourAt = format === 'dxt1' ? at : at + 8;

      if (format === 'dxt3') {
        for (let p = 0; p < 16; p++) {
          const nibble = (src[at + (p >> 1)] >> ((p & 1) * 4)) & 0xf;
          alphas[p] = nibble * 17;
        }
      } else if (format === 'dxt5') {
        alphaBlock(src, at, alphas);
      }

      colourBlock(src, colourAt, format === 'dxt1', palette);
      const codes =
        src[colourAt + 4] | (src[colourAt + 5] << 8) | (src[colourAt + 6] << 16) | (src[colourAt + 7] << 24);

      for (let p = 0; p < 16; p++) {
        const x = bx * 4 + (p & 3);
        const y = by * 4 + (p >> 2);
        if (x >= width || y >= height) continue;
        const code = (codes >>> (2 * p)) & 3;
        const o = (y * width + x) * 4;
        out[o] = palette[code * 4];
        out[o + 1] = palette[code * 4 + 1];
        out[o + 2] = palette[code * 4 + 2];
        out[o + 3] = format === 'dxt1' ? palette[code * 4 + 3] : alphas[p];
      }
    }
  }
  return out;
}
