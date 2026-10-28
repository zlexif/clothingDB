import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Browser, chromium, type Page } from 'playwright-core';

const SITE = 'http://localhost:8080';
const CDN = 'https://cdn.auradevelopment.xyz/clothingdb';
const OUT = resolve('previews');
const ASSETS = join(OUT, '.assets');
const BUILD = join(OUT, '.build');
const SCALE = 2;
const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

const only = (() => {
  const i = process.argv.indexOf('--only');
  return i > 0 ? new Set(process.argv[i + 1].split(',')) : null;
})();

type Counts = Record<'male' | 'female', Record<string, { drawables: number[] }>>;
const manifest = JSON.parse(readFileSync('src/lib/manifest-data.json', 'utf8')) as { genders: Counts };

const itemCount = (['male', 'female'] as const).reduce(
  (n, g) => n + Object.values(manifest.genders[g]).reduce((a, e) => a + e.drawables.reduce((x, t) => x + t, 0), 0),
  0,
);
const pictureCount = itemCount * 2;
const fmt = (n: number) => n.toLocaleString('en-US');

const pic = (slug: string, d: number, t = 0, kind = 'garment', gender = 'male') =>
  `${CDN}/${kind}/${gender}/${slug}/${d}/${t}.webp`;

function wall(n: number, seed = 7): string[] {
  const slots = ['tops', 'legs', 'shoes', 'hats', 'masks', 'glasses', 'bags', 'undershirts', 'accessories', 'watches'];
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const out: string[] = [];
  const seen = new Set<string>();
  while (out.length < n) {
    const slug = slots[Math.floor(rnd() * slots.length)];
    const ds = manifest.genders.male[slug]?.drawables ?? [];
    const d = Math.floor(rnd() * ds.length);
    if ((ds[d] ?? 0) < 4 || seen.has(`${slug}/${d}`)) continue;
    seen.add(`${slug}/${d}`);
    out.push(pic(slug, d, Math.floor(rnd() * ds[d])));
  }
  return out;
}

const asset = (name: string) => `../.assets/${name}`;

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..800&display=swap');
:root {
  --canvas: #0a0a0a; --card: #171717; --elevated: #262626; --raised: #2e2e2e;
  --fg: #fafafa; --fg2: #a1a1a1; --fg3: #949494; --ember: #ff5c00;
  --hair: rgb(255 255 255 / 0.1); --hair2: rgb(255 255 255 / 0.15);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: var(--canvas); color: var(--fg); font-family: 'DM Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased; overflow: hidden; }
.checker { background-color: #171717;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Cpath fill='%231f1f1f' d='M0 0h10v10H0zM10 10h10v10H10z'/%3E%3C/svg%3E");
  background-size: 20px 20px; }
.art { position: absolute; inset: 0; background-size: cover; background-position: center; }
.logo { display: inline-flex; align-items: center; gap: 0.5em; font-weight: 500; letter-spacing: -0.02em; }
.logo img { height: 1.35em; image-rendering: pixelated; }
.byline { display: inline-flex; align-items: center; gap: 0.6em; color: var(--fg3); font-weight: 400; letter-spacing: 0; }
.byline::before { content: ''; width: 1px; height: 0.9em; background: var(--hair2); }
.pill { display: inline-flex; align-items: center; gap: 10px; border: 1px solid var(--hair); background: rgb(23 23 23 / 0.85);
  border-radius: 999px; padding: 10px 18px; color: var(--fg); }
.h { font-weight: 500; letter-spacing: -0.035em; line-height: 1.02; }
.dim { color: var(--fg2); }
.tile { position: relative; overflow: hidden; border: 1px solid var(--hair); border-radius: 18px; }
.tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.eyebrow { text-transform: uppercase; letter-spacing: 0.16em; color: var(--fg3); font-size: 15px; }
code { font-family: inherit; }
`;

const logo = (size: number, credit = true) =>
  `<span class="logo" style="font-size:${size}px"><img src="${pathToFileURL(resolve('public/favicon.svg')).href}" alt="">clothingDB${
    credit ? `<span class="byline" style="font-size:${Math.round(size * 0.82)}px">by Aura Development</span>` : ''
  }</span>`;

const frame = (src: string, w: number, h: number, caption = true, extra = '') => `
  <div class="tile" style="width:${w}px;height:${h}px;background:var(--card);${extra}">
    <div class="art" style="background-image:url(${asset('art-landscape.png')})"></div>
    <img src="${src}" style="padding:${Math.round(h * 0.08)}px ${Math.round(h * 0.08)}px ${Math.round(h * (caption ? 0.16 : 0.08))}px">
    ${
      caption
        ? `<div style="position:absolute;left:14px;right:14px;bottom:14px;border:1px solid var(--hair);background:rgb(10 10 10 / 0.85);border-radius:999px;padding:8px 14px;font-size:14px;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><code>${src.replace('https://', '')}</code></div>`
        : ''
    }
  </div>`;

const browserWindow = (shot: string, url: string, w: number) => `
  <div style="width:${w}px;border:1px solid var(--hair2);border-radius:20px;overflow:hidden;background:var(--card);box-shadow:0 60px 120px -30px rgb(0 0 0 / 0.85), 0 0 0 1px rgb(0 0 0 / 0.6)">
    <div style="display:flex;align-items:center;gap:8px;padding:14px 18px;border-bottom:1px solid var(--hair)">
      <span style="width:12px;height:12px;border-radius:50%;background:var(--raised)"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:var(--raised)"></span>
      <span style="width:12px;height:12px;border-radius:50%;background:var(--raised)"></span>
      <span style="margin-left:16px;flex:1;max-width:520px;background:var(--canvas);border-radius:999px;padding:7px 16px;font-size:14px;color:var(--fg3)">${url}</span>
    </div>
    <img src="${asset(shot)}" style="display:block;width:100%">
  </div>`;

interface Slide {
  name: string;
  w: number;
  h: number;
  css?: string;
  body: () => string;
}

const SLIDES: Slide[] = [
  {
    name: 'teaser',
    w: 1920,
    h: 1080,
    body: () => `
      <div class="art" style="background-image:url(${asset('art-hero.png')})"></div>
      <div class="art" style="background:linear-gradient(90deg, rgb(10 10 10 / 0.92) 0%, rgb(10 10 10 / 0.7) 45%, rgb(10 10 10 / 0) 80%)"></div>
      <div style="position:absolute;left:120px;top:96px">${logo(30)}</div>
      <div style="position:absolute;left:120px;top:330px;width:1060px">
        <h1 class="h" style="font-size:100px"><span class="dim">Every clothing picture,</span><br>one address each.</h1>
        <p style="font-size:28px;line-height:1.5;color:var(--fg2);margin-top:40px;max-width:820px">
          Every item and colour in GTA, for male and female. Free to use in game UIs, websites, bots and anywhere else.
        </p>
      </div>
      <div style="position:absolute;right:120px;top:170px;width:640px;height:740px">
        <div style="position:absolute;left:0;top:90px;transform:rotate(-7deg)">${frame(pic('hats', 3), 400, 300, false)}</div>
        <div style="position:absolute;right:0;top:0;transform:rotate(6deg)">${frame(pic('shoes', 12), 400, 300, false)}</div>
        <div style="position:absolute;left:40px;bottom:0">${frame(pic('tops', 245), 560, 420)}</div>
      </div>`,
  },
  {
    name: 'numbers',
    w: 1920,
    h: 1080,
    body: () => {
      const tiles = wall(84, 11)
        .map(
          (src) =>
            `<div class="tile checker" style="width:150px;height:150px;border-radius:16px"><img src="${src}" style="padding:12px"></div>`,
        )
        .join('');
      return `
      <div style="position:absolute;inset:-40px;display:grid;grid-template-columns:repeat(12,150px);gap:14px;justify-content:center;align-content:center;opacity:0.55;
        mask-image:radial-gradient(ellipse 52% 50% at 50% 50%, transparent 30%, black 80%)">${tiles}</div>
      <div class="art" style="background:radial-gradient(ellipse 45% 45% at 50% 50%, rgb(10 10 10 / 0.96) 40%, rgb(10 10 10 / 0) 100%)"></div>
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
        <p class="eyebrow" style="font-size:18px">The picture set</p>
        <h1 class="h" style="font-size:250px;letter-spacing:-0.05em;margin-top:18px">${fmt(pictureCount)}</h1>
        <p style="font-size:44px;font-weight:500;letter-spacing:-0.02em;margin-top:6px">pictures, <span style="color:var(--ember)">ready to use</span></p>
        <p style="margin-top:40px;font-size:24px;color:var(--fg2)">28 slots · male and female · every colour · on its own or worn</p>
      </div>
      <div style="position:absolute;left:0;right:0;bottom:48px;text-align:center"><span class="pill" style="padding:14px 24px;background:rgb(10 10 10 / 0.92)">${logo(24)}</span></div>`;
    },
  },
  {
    name: 'address',
    w: 1920,
    h: 1080,
    css: `.part{display:flex;flex-direction:column;align-items:center;gap:22px}
      .part b{font-weight:500;color:var(--fg)} .part.on b{color:var(--ember)}
      .part i{font-style:normal;font-size:19px;color:var(--fg3);border-top:3px solid var(--hair2);padding-top:14px;white-space:nowrap}
      .part.on i{border-color:var(--ember);color:var(--fg)}`,
    body: () => `
      <div class="art" style="background-image:url(${asset('art-folds.png')});opacity:0.9"></div>
      <div class="art" style="background:linear-gradient(180deg, rgb(10 10 10 / 0.2), rgb(10 10 10 / 0.85) 60%, rgb(10 10 10 / 0.95))"></div>
      <div style="position:absolute;left:120px;top:96px">${logo(26)}</div>
      <div style="position:absolute;left:120px;right:120px;top:210px">
        <p class="eyebrow">How it works</p>
        <h1 class="h" style="font-size:92px;margin-top:20px"><span class="dim">One picture,</span> one address<br>that never changes.</h1>
      </div>
      <div style="position:absolute;left:120px;right:120px;top:560px;display:flex;align-items:flex-start;gap:6px;font-size:54px;letter-spacing:-0.02em">
        <span style="color:var(--fg3)">…/clothingdb/</span>
        <span class="part on"><b>garment</b><i>Picture kind</i></span><span style="color:var(--fg3)">/</span>
        <span class="part"><b>male</b><i>Male or female</i></span><span style="color:var(--fg3)">/</span>
        <span class="part"><b>tops</b><i>Slot</i></span><span style="color:var(--fg3)">/</span>
        <span class="part"><b>245</b><i>Item</i></span><span style="color:var(--fg3)">/</span>
        <span class="part"><b>0</b><i>Colour</i></span><span style="color:var(--fg3)">.webp</span>
      </div>
      <div style="position:absolute;left:120px;bottom:96px;font-size:24px;color:var(--fg2);max-width:900px;line-height:1.5">
        Change any part and you get a different picture. Put it anywhere an image goes: no key, no account, nothing to install.
      </div>
      <div style="position:absolute;right:120px;bottom:96px;display:flex;gap:18px">
        <div class="tile checker" style="width:190px;height:190px"><img src="${pic('tops', 245)}" style="padding:16px"></div>
        <div class="tile checker" style="width:190px;height:190px"><img src="${pic('tops', 245, 0, 'ped')}" style="padding:6px"></div>
      </div>`,
  },
  {
    name: 'colours',
    w: 1920,
    h: 1080,
    body: () => {
      const n = manifest.genders.male.tops.drawables[245];
      const tiles = Array.from(
        { length: n },
        (_, t) => `
        <div style="display:flex;flex-direction:column;gap:14px">
          <div class="tile checker" style="width:270px;height:270px;border-radius:22px"><img src="${pic('tops', 245, t)}" style="padding:24px"></div>
          <span style="font-size:19px;color:var(--fg3)">Colour <b style="color:var(--fg);font-weight:500">${t}</b></span>
        </div>`,
      ).join('');
      return `
      <div class="art" style="background-image:url(${asset('art-threads.png')});opacity:0.5"></div>
      <div class="art" style="background:linear-gradient(180deg, rgb(10 10 10 / 0.95) 0%, rgb(10 10 10 / 0.75) 100%)"></div>
      <div style="position:absolute;left:120px;top:96px;right:120px;display:flex;justify-content:space-between;align-items:flex-end">
        <h1 class="h" style="font-size:88px"><span class="dim">Every colour,</span><br>its own picture.</h1>
        <div style="text-align:right">${logo(24)}<p style="font-size:22px;color:var(--fg2);margin-top:16px">Top 245 · ${n} colours</p></div>
      </div>
      <div style="position:absolute;left:120px;right:120px;bottom:90px;display:grid;grid-template-columns:repeat(5,270px);justify-content:space-between;row-gap:28px">${tiles}</div>`;
    },
  },
  {
    name: 'garment-or-worn',
    w: 1080,
    h: 1350,
    body: () => `
      <div class="art" style="background-image:url(${asset('art-threads.png')})"></div>
      <div class="art" style="background:linear-gradient(180deg, rgb(10 10 10 / 0.97) 30%, rgb(10 10 10 / 0.6))"></div>
      <div style="position:absolute;left:80px;top:80px">${logo(24)}</div>
      <h1 class="h" style="position:absolute;left:80px;top:170px;font-size:84px"><span class="dim">The piece,</span><br>or the piece worn.</h1>
      <div style="position:absolute;left:80px;right:80px;bottom:80px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
        ${[
          ['garment', 'The piece on its own', pic('tops', 245), '40px'],
          ['ped', 'Worn by the ped', pic('tops', 245, 0, 'ped'), '14px'],
        ]
          .map(
            ([k, label, src, pad]) => `
          <div>
            <div class="tile checker" style="height:760px;border-radius:24px"><img src="${src}" style="padding:${pad}"></div>
            <div style="display:flex;align-items:center;gap:12px;margin-top:18px;font-size:22px">
              <span style="border:1px solid var(--hair2);border-radius:999px;padding:4px 14px;color:${k === 'garment' ? 'var(--ember)' : 'var(--fg)'}">${k}</span>
              <span class="dim">${label}</span>
            </div>
          </div>`,
          )
          .join('')}
      </div>`,
  },
  {
    name: 'directory',
    w: 1920,
    h: 1080,
    body: () => `
      <div class="art" style="background-image:url(${asset('art-threads.png')})"></div>
      <div class="art" style="background:linear-gradient(90deg, rgb(10 10 10 / 0.96) 20%, rgb(10 10 10 / 0.35) 70%)"></div>
      <div style="position:absolute;left:120px;top:96px">${logo(26)}</div>
      <div style="position:absolute;left:120px;top:350px;width:520px">
        <h1 class="h" style="font-size:96px">The<br>Directory</h1>
        <p style="font-size:25px;line-height:1.5;color:var(--fg2);margin-top:30px">Every slot, every item, every colour. Find the exact piece by its number and copy its address.</p>
      </div>
      <div style="position:absolute;left:720px;top:150px">${browserWindow('shot-directory.png', 'clothingdb · /browse/tops', 1320)}</div>`,
  },
  {
    name: 'creator-lab',
    w: 1920,
    h: 1080,
    body: () => `
      <div class="art" style="background-image:url(${asset('art-hero.png')})"></div>
      <div class="art" style="background:linear-gradient(90deg, rgb(10 10 10 / 0.96) 20%, rgb(10 10 10 / 0.4) 70%)"></div>
      <div style="position:absolute;left:120px;top:96px">${logo(26)}</div>
      <div style="position:absolute;left:120px;top:350px;width:520px">
        <h1 class="h" style="font-size:96px">Creator<br>Lab</h1>
        <p style="font-size:25px;line-height:1.5;color:var(--fg2);margin-top:30px">Dress the real male and female ped in your browser and save see-through pictures, with or without the ped.</p>
      </div>
      <div style="position:absolute;left:720px;top:150px">${browserWindow('shot-creator.png', 'clothingdb · /creator', 1320)}</div>`,
  },
  {
    name: 'use-cases',
    w: 1920,
    h: 1080,
    body: () => `
      <div class="art" style="background-image:url(${asset('art-folds.png')});opacity:0.7"></div>
      <div class="art" style="background:linear-gradient(180deg, rgb(10 10 10 / 0.9), rgb(10 10 10 / 0.97))"></div>
      <div style="position:absolute;left:120px;top:96px;right:120px;display:flex;justify-content:space-between;align-items:flex-end">
        <h1 class="h" style="font-size:84px"><span class="dim">One picture set,</span><br>many uses.</h1>
        <p style="font-size:24px;line-height:1.5;color:var(--fg2);max-width:560px;text-align:right">Clothing stores, appearance editors, inventories, outfits, websites and Discord bots.</p>
      </div>
      <div style="position:absolute;left:120px;right:120px;bottom:90px">
        <img src="${asset('shot-uses.png')}" style="display:block;width:100%;border-radius:20px">
      </div>`,
  },
  {
    name: 'square',
    w: 1080,
    h: 1080,
    body: () => {
      const tiles = wall(12, 23)
        .map(
          (src) =>
            `<div class="tile checker" style="width:200px;height:200px;border-radius:20px"><img src="${src}" style="padding:16px"></div>`,
        )
        .join('');
      return `
      <div class="art" style="background-image:url(${asset('art-hero.png')})"></div>
      <div class="art" style="background:linear-gradient(180deg, rgb(10 10 10 / 0.6), rgb(10 10 10 / 0.92) 55%)"></div>
      <div style="position:absolute;left:80px;top:80px;right:80px;display:flex;justify-content:space-between;align-items:center">
        ${logo(26)}
      </div>
      <h1 class="h" style="position:absolute;left:80px;top:180px;font-size:76px"><span class="dim">Every GTA clothing</span><br>picture, in one place.</h1>
      <div style="position:absolute;left:80px;right:80px;bottom:80px;display:grid;grid-template-columns:repeat(4,200px);gap:20px;justify-content:space-between">${tiles}</div>`;
    },
  },
  {
    name: 'social-card',
    w: 1200,
    h: 630,
    body: () => `
      <div class="art" style="background-image:url(${asset('art-hero.png')})"></div>
      <div class="art" style="background:linear-gradient(90deg, rgb(10 10 10 / 0.95) 35%, rgb(10 10 10 / 0.2))"></div>
      <div style="position:absolute;left:70px;top:64px">${logo(22)}</div>
      <h1 class="h" style="position:absolute;left:70px;top:150px;font-size:66px;width:600px"><span class="dim">Every clothing picture,</span> one address each.</h1>
      <p style="position:absolute;left:70px;bottom:64px;font-size:21px;color:var(--fg2)">${fmt(pictureCount)} pictures · male and female · free to use</p>
      <div style="position:absolute;right:70px;top:90px;display:grid;grid-template-columns:repeat(2,210px);gap:18px">
        ${[pic('tops', 245), pic('hats', 3), pic('shoes', 12), pic('tops', 245, 0, 'ped')]
          .map(
            (src, i) =>
              `<div class="tile checker" style="width:210px;height:210px"><img src="${src}" style="padding:${i === 3 ? 4 : 18}px"></div>`,
          )
          .join('')}
      </div>`,
  },
  {
    name: 'banner',
    w: 1500,
    h: 500,
    body: () => {
      const tiles = wall(30, 5)
        .map(
          (src) =>
            `<div class="tile checker" style="width:130px;height:130px;border-radius:14px"><img src="${src}" style="padding:10px"></div>`,
        )
        .join('');
      return `
      <div class="art" style="background-image:url(${asset('art-threads.png')})"></div>
      <div style="position:absolute;right:-30px;top:-20px;display:grid;grid-template-columns:repeat(6,130px);gap:12px;opacity:0.9;
        mask-image:linear-gradient(90deg, transparent, black 45%)">${tiles}</div>
      <div class="art" style="background:linear-gradient(90deg, rgb(10 10 10 / 0.97) 30%, rgb(10 10 10 / 0) 75%)"></div>
      <div style="position:absolute;left:80px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center">
        ${logo(30)}
        <h1 class="h" style="font-size:58px;margin-top:26px"><span class="dim">Every clothing picture,</span><br>one address each.</h1>
      </div>`;
    },
  },
];

async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? null
          : new Promise((done) => {
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
            }),
      ),
    );
  });
  await page.waitForTimeout(400);
}

async function captureArt(browser: Browser, index: number, file: string) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: SCALE });
  await page.goto(SITE, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.evaluate((i) => {
    const canvas = document.querySelectorAll('canvas')[i];
    const host = canvas?.parentElement;
    if (!host) throw new Error(`no canvas ${i}`);
    document.body.appendChild(host);
    host.className = '';
    Object.assign(host.style, { position: 'fixed', inset: '0', zIndex: '2147483647', borderRadius: '0' });
  }, index);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(ASSETS, file) });
  await page.close();
  console.log(`  art  ${file}`);
}

async function captureSite(browser: Browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: SCALE });
  await page.addInitScript(() => localStorage.setItem('clothingdb:ped-studio-tour', '1'));

  await page.goto(`${SITE}/browse/tops`, { waitUntil: 'load' });
  await page
    .waitForFunction(
      () =>
        [...document.images]
          .filter((img) => img.getBoundingClientRect().top < innerHeight)
          .every((img) => img.complete && img.naturalWidth > 0),
      undefined,
      { timeout: 30000 },
    )
    .catch(() => console.warn('  some Directory pictures did not load in time'));
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(ASSETS, 'shot-directory.png') });
  console.log('  shot shot-directory.png');

  const headed = await chromium.launch({ channel: 'msedge', headless: false, args: GPU_ARGS });
  const lab = await headed.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: SCALE });
  await lab.addInitScript(() => localStorage.setItem('clothingdb:ped-studio-tour', '1'));
  await lab.goto(`${SITE}/creator`, { waitUntil: 'load' });
  await lab.waitForTimeout(9000);
  const cdp = await lab.context().newCDPSession(lab);
  const { data } = (await cdp.send('Page.captureScreenshot', { format: 'png' })) as { data: string };
  writeFileSync(join(ASSETS, 'shot-creator.png'), Buffer.from(data, 'base64'));
  await headed.close();
  console.log('  shot shot-creator.png');

  await page.setViewportSize({ width: 1500, height: 1000 });
  await page.goto(SITE, { waitUntil: 'load' });
  const grid = page.locator('#uses-title').locator('xpath=ancestor::section').locator('div.grid').first();
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[data-reveal]')) el.classList.add('is-in');
  });
  await grid.scrollIntoViewIfNeeded();
  await page.getByRole('tab', { name: 'Appearance editors' }).click();
  await page.waitForTimeout(1800);
  await grid.screenshot({ path: join(ASSETS, 'shot-uses.png') });
  console.log('  shot shot-uses.png');
  await page.close();
}

mkdirSync(ASSETS, { recursive: true });
mkdirSync(BUILD, { recursive: true });

const browser = await chromium.launch({
  channel: 'msedge',
  args: GPU_ARGS,
});

try {
  if (!only || only.has('art')) {
    console.log('Capturing art');
    await captureArt(browser, 0, 'art-hero.png');
    await captureArt(browser, 1, 'art-landscape.png');
    await captureArt(browser, 6, 'art-folds.png');
    await captureArt(browser, 7, 'art-threads.png');
  }
  if (!only || only.has('shots')) {
    console.log('Capturing site shots');
    await captureSite(browser);
  }

  console.log('Rendering previews');
  for (const [n, slide] of SLIDES.entries()) {
    if (only && !only.has(slide.name)) continue;
    const file = join(BUILD, `${slide.name}.html`);
    writeFileSync(
      file,
      `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
        html, body { width: ${slide.w}px; height: ${slide.h}px; position: relative; }
        ${slide.css ?? ''}</style></head><body>${slide.body()}</body></html>`,
    );
    const page = await browser.newPage({ viewport: { width: slide.w, height: slide.h }, deviceScaleFactor: SCALE });
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await settle(page);
    const out = join(OUT, `${String(n + 1).padStart(2, '0')}-${slide.name}.png`);
    await page.screenshot({ path: out });
    await page.close();
    console.log(`  ${out}`);
  }
} finally {
  await browser.close();
}
