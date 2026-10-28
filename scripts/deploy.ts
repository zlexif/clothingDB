import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const TARGETS = {
  staging: { worker: 'clothingdb-staging', domain: 'clothingdb-staging.auradevelopment.xyz' },
  production: { worker: 'clothingdb', domain: 'clothingdb.auradevelopment.xyz' },
} as const;

type Target = keyof typeof TARGETS;

const args = process.argv.slice(2);
const target = args[0] as Target;

if (!(target in TARGETS)) {
  console.error('Usage: bun run deploy <staging|production> [--preview <alias>] [--dry]');
  process.exit(1);
}

const previewAt = args.indexOf('--preview');
const preview = previewAt >= 0 ? args[previewAt + 1] : undefined;
const dry = args.includes('--dry');
const { worker, domain } = TARGETS[target];
const distDir = 'dist-cf';

const env = {
  ...process.env,
  CLOUDFLARE: '1',
  WAKU_DIST_DIR: distDir,
  WAKU_PUBLIC_SITE_ENV: target,
  WAKU_PUBLIC_SITE_URL: `https://${domain}`,
  WAKU_PUBLIC_PEDS_BASE: process.env.WAKU_PUBLIC_PEDS_BASE ?? 'https://cdn.auradevelopment.xyz/clothingdb/peds',
};

const run = (cmd: string, cmdArgs: string[]) => {
  const r = spawnSync(cmd, cmdArgs, { stdio: 'inherit', env, shell: process.platform === 'win32' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run('bunx', ['waku', 'build']);

const configPath = `${distDir}/server/wrangler.json`;
const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.name = worker;
config.routes = [{ pattern: domain, custom_domain: true }];
config.preview_urls = true;
writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);

mkdirSync('.wrangler/deploy', { recursive: true });
writeFileSync('.wrangler/deploy/config.json', JSON.stringify({ configPath: `../../${configPath}` }));

if (dry) run('bunx', ['wrangler', 'deploy', '--dry-run']);
else if (preview) run('bunx', ['wrangler', 'versions', 'upload', '--preview-alias', preview]);
else run('bunx', ['wrangler', 'deploy']);
