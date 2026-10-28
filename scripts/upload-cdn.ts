import { readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const args = process.argv.slice(2);
const flag = (name: string, fallback?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const need = (k: string) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing ${k} in .env`);
    process.exit(1);
  }
  return v;
};

const bucket = need('R2_BUCKET');
const prefix = (process.env.R2_PREFIX ?? 'clothingdb').replace(/^\/+|\/+$/g, '');
const dir = flag('dir', process.env.CDN_RENDER_DIR || join(homedir(), 'clothingdb-cdn'))!;
const only = flag('only');
const concurrency = Number(flag('concurrency', '24'));
const dry = args.includes('--dry');

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${need('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: need('R2_ACCESS_KEY_ID'), secretAccessKey: need('R2_SECRET_ACCESS_KEY') },
});

function walk(d: string, acc: string[] = []) {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (name.endsWith('.webp')) acc.push(p);
  }
  return acc;
}

async function existing() {
  const keys = new Set<string>();
  let token: string | undefined;
  do {
    const r = await s3.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/`, ContinuationToken: token }),
    );
    for (const o of r.Contents ?? []) if (o.Key) keys.add(o.Key);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

const roots = only ? [join(dir, only)] : [join(dir, 'garment'), join(dir, 'ped')];
const files = roots.flatMap((r) => {
  try {
    return walk(r);
  } catch {
    return [];
  }
});
const have = await existing();
const todo = files
  .map((f) => ({ f, key: `${prefix}/${relative(dir, f).split(sep).join('/')}` }))
  .filter((x) => !have.has(x.key));

console.log(`${files.length} local pictures, ${have.size} already in ${bucket}/${prefix}, ${todo.length} to upload`);
if (dry) process.exit(0);

let sent = 0;
let failed = 0;
const started = Date.now();
let next = 0;

async function worker() {
  while (next < todo.length) {
    const { f, key } = todo[next++];
    for (let attempt = 1; ; attempt++) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: readFileSync(f),
            ContentType: 'image/webp',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        );
        sent++;
        break;
      } catch (e) {
        if (attempt >= 4) {
          failed++;
          console.error(`failed ${key}: ${(e as Error).message}`);
          break;
        }
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
    if (sent % 500 === 0 && sent) {
      const rate = sent / ((Date.now() - started) / 1000);
      console.log(`uploaded ${sent}/${todo.length} (${rate.toFixed(0)}/s)`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
console.log(`finished: uploaded ${sent}, failed ${failed} in ${((Date.now() - started) / 1000).toFixed(0)}s`);
