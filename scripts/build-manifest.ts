import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { CATEGORIES, type Gender, type Manifest } from '../src/lib/clothing';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const OUT = fileURLToPath(new URL('../src/lib/manifest-data.json', import.meta.url));
const prefix = (process.env.R2_PREFIX ?? 'clothingdb').replace(/^\/+|\/+$/g, '');
const variant = 'garment';

for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']) {
  if (!process.env[k]) throw new Error(`Missing ${k} in .env`);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});

async function scan(gender: Gender) {
  const colours = new Map<string, Map<number, Set<number>>>();
  let token: string | undefined;
  do {
    const r = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET,
        Prefix: `${prefix}/${variant}/${gender}/`,
        ContinuationToken: token,
      }),
    );
    for (const o of r.Contents ?? []) {
      const m = o.Key?.match(/\/([a-z-]+)\/(\d+)\/(\d+)\.webp$/);
      if (!m) continue;
      const [, slug, item, colour] = m;
      if (!colours.has(slug)) colours.set(slug, new Map());
      const items = colours.get(slug)!;
      if (!items.has(+item)) items.set(+item, new Set());
      items.get(+item)!.add(+colour);
    }
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return colours;
}

const previous = JSON.parse(await readFile(OUT, 'utf8')) as Manifest;
const manifest: Manifest = {
  version: 'clothingdb',
  gameBuild: Number(flag('build') ?? previous.gameBuild),
  generatedAt: new Date().toISOString(),
  genders: { male: {}, female: {} },
};

for (const gender of ['male', 'female'] as const) {
  const colours = await scan(gender);
  for (const c of CATEGORIES) {
    const items = colours.get(c.slug) ?? new Map<number, Set<number>>();
    const last = Math.max(-1, ...items.keys());
    manifest.genders[gender][c.slug] = {
      type: c.type,
      id: c.id,
      drawables: Array.from({ length: last + 1 }, (_, d) => items.get(d)?.size ?? 0),
    };
  }
}

await writeFile(OUT, JSON.stringify(manifest));

const total = (m: Manifest) =>
  (['male', 'female'] as const).reduce(
    (n, g) => n + Object.values(m.genders[g]).reduce((a, e) => a + e.drawables.reduce((x, t) => x + t, 0), 0),
    0,
  );
console.log(`manifest for build ${manifest.gameBuild}: ${total(manifest)} pictures per variant -> ${OUT}`);

if (args.includes('--compare')) {
  for (const gender of ['male', 'female'] as const)
    for (const c of CATEGORIES) {
      const before = previous.genders[gender][c.slug]?.drawables ?? [];
      const after = manifest.genders[gender][c.slug].drawables;
      const shared = Math.min(before.length, after.length);
      let changed = 0;
      let empty = 0;
      for (let d = 0; d < shared; d++) {
        if (after[d] === 0) empty++;
        else if (after[d] !== before[d]) changed++;
      }
      console.log(
        `${gender.padEnd(6)} ${c.slug.padEnd(15)} items ${String(before.length).padStart(4)} -> ${String(after.length).padStart(4)}` +
          `  colour counts differ ${String(changed).padStart(3)}  no picture ${String(empty).padStart(3)}`,
      );
    }
}
