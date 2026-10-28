import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { chromium } from 'playwright-core';

type Gender = 'male' | 'female';
type Variant = 'garment' | 'ped';

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const pick = <T extends string>(v: string | undefined, all: T[]): T[] =>
  !v || v === 'all' ? all : (v.split(',') as T[]);

const genders = pick<Gender>(flag('gender'), ['male', 'female']);
const variants = pick<Variant>(flag('variant'), ['garment', 'ped']);
const onlySlots = flag('slots')?.split(',');
const from = Number(flag('from', '0'));
const limit = Number(flag('limit', 'Infinity'));
const size = Number(flag('size', '512'));
const local = flag('local');
const site = flag('site', 'http://localhost:8080');
const peds = flag('peds', 'http://localhost:3100');
const headed = args.includes('--headed');

const SKIP = new Set(['head']);

interface PedManifest {
  slots: Record<string, { drawables: number[] }>;
}

const prefix = (process.env.R2_PREFIX ?? 'clothingdb').replace(/^\/+|\/+$/g, '');
const bucket = process.env.R2_BUCKET ?? '';
const s3 = local
  ? null
  : new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });
if (
  s3 &&
  (!bucket || !process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY)
) {
  console.error('Missing R2 settings. Run with node --env-file=.env, or pass --local DIR.');
  process.exit(1);
}

async function uploaded() {
  const keys = new Set<string>();
  if (!s3) return keys;
  for (const variant of variants)
    for (const gender of genders) {
      let token: string | undefined;
      do {
        const r = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: `${prefix}/${variant}/${gender}/`,
            ContinuationToken: token,
          }),
        );
        for (const o of r.Contents ?? []) if (o.Key) keys.add(o.Key);
        token = r.IsTruncated ? r.NextContinuationToken : undefined;
      } while (token);
    }
  return keys;
}

const MAX_IN_FLIGHT = 24;
const inFlight = new Set<Promise<void>>();
let failed = 0;

async function put(key: string, body: Buffer) {
  for (let attempt = 1; ; attempt++) {
    try {
      await s3!.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: 'image/webp',
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      return;
    } catch (e) {
      if (attempt >= 4) {
        failed++;
        console.error(`upload failed ${key}: ${(e as Error).message}`);
        return;
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
}

async function store(key: string, body: Buffer) {
  if (local) {
    const file = join(local, ...key.split('/'));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
    return;
  }
  while (inFlight.size >= MAX_IN_FLIGHT) await Promise.race(inFlight);
  const p = put(key, body).finally(() => inFlight.delete(p));
  inFlight.add(p);
}

const have = await uploaded();
console.log(local ? `writing to ${local}` : `${have.size} pictures already in ${bucket}/${prefix}`);

const browser = await chromium.launch({
  channel: 'msedge',
  headless: !headed,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
page.on('pageerror', (e) => console.error('page error:', e.message));
await page.goto(`${site}/render`);
await page.waitForFunction(() => window.__clothingdbReady === true, null, { timeout: 60_000 });

let done = 0;
let skipped = 0;
const missing: string[] = [];
const started = Date.now();

for (const gender of genders) {
  const manifest = (await (await fetch(`${peds}/${gender}/manifest.json`)).json()) as PedManifest;
  const ov = await fetch(`${peds}/${gender}/overlays.json`)
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  for (const [slug, o] of Object.entries(ov as Record<string, { count: number }>))
    manifest.slots[slug] = { drawables: Array(o.count).fill(1) };
  const slots = Object.keys(manifest.slots).filter((s) => !SKIP.has(s) && (!onlySlots || onlySlots.includes(s)));
  for (const slot of slots) {
    const counts = manifest.slots[slot].drawables;
    const last = Math.min(counts.length, from + limit);
    for (let drawable = from; drawable < last; drawable++) {
      for (let texture = 0; texture < counts[drawable]; texture++) {
        for (const variant of variants) {
          const key = `${prefix}/${variant}/${gender}/${slot}/${drawable}/${texture}.webp`;
          if (have.has(key) || (local && existsSync(join(local, ...key.split('/'))))) {
            skipped++;
            continue;
          }
          const b64 = await page.evaluate((job) => window.__clothingdbRender!(job), {
            gender,
            slot,
            drawable,
            texture,
            variant,
            size,
          });
          if (!b64) {
            missing.push(key);
            continue;
          }
          await store(key, Buffer.from(b64, 'base64'));
          done++;
          if (done % 100 === 0) {
            const rate = done / ((Date.now() - started) / 1000);
            console.log(
              `${gender} ${slot} ${drawable}/${counts.length - 1}  done ${done}, skipped ${skipped}, missing ${missing.length}  (${rate.toFixed(1)}/s)`,
            );
          }
        }
      }
    }
    console.log(`done ${gender} ${slot}`);
  }
}

await browser.close();
await Promise.all(inFlight);
const secs = (Date.now() - started) / 1000;
console.log(
  `finished: ${done} pictures, skipped ${skipped}, missing ${missing.length}, upload failures ${failed} in ${secs.toFixed(0)}s`,
);
if (missing.length)
  console.log(
    `no model exported for:\n  ${missing.slice(0, 40).join('\n  ')}${missing.length > 40 ? `\n  …and ${missing.length - 40} more` : ''}`,
  );
