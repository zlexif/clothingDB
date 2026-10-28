# clothingdb — ped clothing directory for FiveM

Waku (minimal React, RSC) + Node build + Bun as package manager.
RexaDB-coloured dark UI with Fumadocs-style dithered pixel art (dark mode only).

## 1. Goals / non-goals

Goals (V1):
- Clothing directory with filters by category (masks, shirts, jackets/tops, legs, shoes, etc.), gender, drawable search.
- See-through pictures of every item on our own CDN, as the piece alone and worn by the ped.
- Built-in web image creator: upload `ydr/ydd + ytd` (plus `glb/fbx/obj` fallback) -> 3D studio viewer -> take studio pic -> download local PNG (never uploads anywhere).
- Cursor-style dark UI: warm palette, weight-400 headlines, 4px corners, window-chrome mockups.

Non-goals (V1):
- No FiveM game bridge, no NUI round-trip, no server-side chroma pipeline.
- No full YDR WASM parser in V1 (header inspect + GLB real render; WASM conversion lands in P2).
- No auth, no uploads to CDN, no retexture painting (P2).

## 2. Theme spec (RexaDB colours, dark only)

Layout follows the Cursor-style redesign; colours, type and shapes follow
rexadb.app. No light theme. Tokens live in `src/styles.css` as rgb channels and
map to Tailwind colours in `tailwind.config.js`.

```css
--canvas: #0a0a0a;  --card: #171717;  --elevated: #262626;
--fg: #fafafa;  --fg-2: #a1a1a1;  --fg-3: #949494;  --icon: #737373;
--primary: #e5e5e5;  --primary-ink: #171717;   /* pill buttons */
--ember: #ff5c00;                                /* links, switches, slider fill */
border: rgb(255 255 255 / .1)
```

Type: DM Sans (headings 500, tracking -0.025em), system `ui-monospace` for code.
Shape: buttons and chips are full pills; cards and panels 18px with a 1px
white/10 border; small inner elements 10px.

Art: live dithered pixel art (`components/ui/dither`, WebGL, no deps), with
presets in `components/site/art.tsx`. `field` mode is per-pixel noise grain
through a black → olive → orange ramp with a Bayer-dithered sun; `image` mode
Bayer-dithers `public/art/landscape.jpg`. It pauses off-screen and stays still
under reduced motion.

## 3. IA / routes (Waku file router `src/pages/`)

- `_root.tsx` (static) — html/head/body shell.
- `_layout.tsx` (static) — sidebar + main, global CSS import.
- `index.tsx` (static) — directory: gender toggle, category sidebar (28), drawable search, texture stepper, virtual grid, item modal.
- `browse/[category].tsx` (static + staticPaths from manifest) — deep-linkable category page, same grid.
- `creator.tsx` (dynamic) — Creator Lab: dropzone, file inspector, studio viewport, camera/lighting controls, capture bar.
- `_api/manifest.ts` (dynamic, edge-cached) — serves `manifest.json` subset + counts.
- `_api/health.ts` — ok probe.

## 4. Data model (own CDN, Cloudflare R2)

URL: `https://cdn.auradevelopment.xyz/clothingdb/{garment|ped}/{male|female}/{slug}/{drawable}/{texture}.webp`
(`WAKU_PUBLIC_CDN_BASE` = the `clothingdb` folder). Rendered from the exported peds by `bun run render-cdn`.
Manifest: `src/lib/manifest-data.json`, rebuilt from the bucket by `bun run build-manifest` -> `{ version, gameBuild, genders: { male, female: { [slug]: { type: component|prop|overlay, id, drawables: number[] } } } }` where `drawables[d]` = texture count, 0 for the game's empty placeholder items (hidden in the UI).

28 slugs: 11 components (masks, hair, torsos, legs, bags, shoes, accessories, undershirts, armor, decals, tops), 5 props (hats, glasses, ears, watches, bracelets), 12 overlays (blemishes, facial-hair, eyebrows, ageing, makeup, blush, complexion, sun-damage, lipstick, moles, chest-hair, body-blemishes). Game build 3889: 38,394 pictures per kind. Item and colour numbers match the ped.clothing set slot for slot; newer builds only add items at the end.

## 5. Creator Lab

Two modes, both entirely in the browser:

1. **Ped studio** (default): the real male and female peds, exported from the
   game files by `tools/ped-export` and served from `WAKU_PUBLIC_PEDS_BASE`.
   Dress them slot by slot with Directory numbers, save the current view, or
   batch a range of items in every colour. Batch shots show only the garment
   on a transparent background, framed to fit, and come back as a ZIP laid out
   like the picture addresses. A first-run walkthrough explains the studio and
   replays from the ? button.
2. **Key captures**: removes a green or magenta background from screenshots
   taken in game (`src/lib/chroma.ts`), frames them and exports PNG/WebP or a
   ZIP.

## 6. Performance (fastest modules, no bloat)

- Waku static prerender for directory/browse; creator `three` lazy-imported (`React.lazy` + `Suspense`) so directory bundle <80kb client.
- `hono/etag` + `compress` via Waku middleware, `Cache-Control: public, max-age=31536000, immutable` on CDN images, `loading=lazy` + `content-visibility:auto` + `@tanstack/react-virtual` grid.
- No extra API wrapper: Waku `_api` (Hono under the hood) + native `fetch`. `fflate` for ZIP (fastest pure-JS), `three` only on `/creator`.
- Bun for install/scripts; Node 24 for `waku dev/build/start` (Waku engines requirement).

## 7. Phases

- P0: scaffold, theme, manifest fetch, directory + modal + copy Lua. (this build)
- P1: creator studio (upload inspect + three viewport + PNG/ZIP). (this build, V1 functional)
- P2: WASM YDR/YDD->GLB worker, YTD DDS decode, retexture layers, own CDN migration.
