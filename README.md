# clothingDB

**The FiveM ped clothing directory, by Aura Development.**

A picture of every clothing item, prop and face overlay for the freemode male
and female ped, each at an address that never changes, plus a Creator Lab that
renders the real peds in the browser so you can take your own pictures.

- **Directory**: browse all 28 slots, find an item by number, see every colour
  and copy its picture address.
- **Creator Lab**: dress the real ped, take a see-through picture of one piece
  (with or without the body), or batch a whole range into a ZIP.
- **Docs**: picture addresses, the slot reference, hosting and the Creator Lab,
  built with Fumadocs.
- **Picture pipeline**: exports the peds from a local GTA V install, renders
  every picture in two variants and uploads them to Cloudflare R2.

```
https://cdn.auradevelopment.xyz/clothingdb/garment/male/tops/245/0.webp   just the piece
https://cdn.auradevelopment.xyz/clothingdb/ped/male/tops/245/0.webp       worn by the ped
                                           variant/ped/slot/item/colour
```

## Stack

| Area       | Tools                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------- |
| Site       | [Waku](https://waku.gg) (React 19 server components) on Vite, TypeScript                              |
| Styling    | Tailwind CSS 4, DM Sans, a WebGL dither shader for the pixel art                                      |
| Docs       | [Fumadocs](https://fumadocs.dev) with MDX in `content/docs`                                           |
| 3D         | three.js (glTF peds, see-through capture)                                                             |
| Motion     | `motion` (Framer Motion)                                                                              |
| Ped export | .NET 8 (C# 12), CodeWalker.Core, SharpGLTF, Microsoft.Extensions DI / logging / configuration, MSTest |
| Rendering  | Playwright driving Microsoft Edge                                                                     |
| Storage    | Cloudflare R2 through the S3 API                                                                      |

## Getting started

Requirements: [Bun](https://bun.sh) 1.3+ (package manager) and
[Node.js](https://nodejs.org) 24+ (runs Waku and the render script).

```sh
bun install
cp .env.example .env      # fill in only what you need, see below
bun run dev               # http://localhost:3000
```

The site works on its own; the Creator Lab additionally needs the exported peds
(see [Picture pipeline](#picture-pipeline)).

### Scripts

| Script                    | What it does                                                                     |
| ------------------------- | -------------------------------------------------------------------------------- |
| `bun run dev`             | Development server                                                               |
| `bun run build`           | Production build into `dist/`                                                    |
| `bun run start`           | Serve the production build on http://localhost:8080                              |
| `bun run typecheck`       | TypeScript, strict, no unused code                                               |
| `bun run check`           | Typecheck and build, the same as CI                                              |
| `bun run build-manifest`  | Rebuild `src/lib/manifest-data.json` (items and colours) from what is in the CDN |
| `bun run make-favicon`    | Regenerate `public/favicon.svg` from the pixel logo                              |
| `bun run export-peds`     | Export clothing and props from GTA V (Windows, .NET 8)                           |
| `bun run export-overlays` | Export the head overlays from GTA V                                              |
| `bun run test-exporter`   | Run the exporter's unit tests (MSTest)                                           |
| `bun run serve-peds`      | Serve the exported peds on http://localhost:3100                                 |
| `bun run render-cdn`      | Render every picture and upload it to R2                                         |
| `bun run upload-cdn`      | Upload an already rendered folder to R2                                          |

### Environment

Copy `.env.example` to `.env`. `.env` and `*.local` files are git-ignored;
never commit keys.

| Variable                                                    | Used by        | Purpose                                                                                                        |
| ----------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| `WAKU_PUBLIC_CDN_BASE`                                      | site           | Folder holding the `garment` and `ped` picture sets (defaults to `https://cdn.auradevelopment.xyz/clothingdb`) |
| `WAKU_PUBLIC_PEDS_BASE`                                     | Creator Lab    | Where the exported peds are served (`http://localhost:3100` locally)                                           |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | render, upload | Cloudflare R2 API token (Object Read & Write, one bucket)                                                      |
| `R2_BUCKET`, `R2_PREFIX`                                    | render, upload | Bucket and folder the pictures go into                                                                         |
| `CDN_PUBLIC_BASE`                                           | render, upload | Public address of that folder                                                                                  |

## Picture pipeline

1. **Export** the peds from a legacy GTA V install (Windows):
   `bun run export-peds` and `bun run export-overlays`. Output goes to
   `%USERPROFILE%\clothingdb-peds` (several GB, kept outside the repo). See
   [`tools/ped-export`](tools/ped-export/README.md).
2. **Serve** them: `bun run serve-peds`, and build and start the site:
   `bun run build && bun run start`.
3. **Render and upload**: `bun run render-cdn`. It opens `/render` in Edge,
   photographs every item and colour in both variants and uploads each picture
   straight to R2 with a one-year immutable cache header. Pictures already in
   the bucket are skipped, so it can be stopped and resumed.
4. **Update the site's item list**: `bun run build-manifest -- --build <game build>`
   reads what is in the bucket and rewrites `src/lib/manifest-data.json`, so the
   Directory lists exactly the pictures that exist.

## Project structure

```
content/docs/            Docs pages (MDX), sidebar order in meta.json
docs/                    Internal notes (design system)
public/                  Static files (favicon, dither source image)
scripts/                 Build and pipeline scripts (Bun / Node)
src/
  pages/                 Waku file router
    _root.tsx            <html> shell, fonts, metadata
    index.tsx            /             homepage
    (app)/               pages with the sidebar shell: /browse, /creator, /changelog
    docs/                /docs         Fumadocs layout and pages
    render.tsx           /render       render target for the picture pipeline
    _api/                /health, /manifest, /api/search
  components/
    site/                homepage: nav, footer, FAQ, art, home/ (one file per section)
    directory/           the Directory app
    studio/              Creator Lab: ped studio, viewport, keyer, render harness
    changelog/  docs/    changelog timeline, Fumadocs wiring
    shell/               app sidebar
    ui/                  primitives: button, dither, flip counter, logo, tour
  lib/                   clothing data and addresses, chroma keying, utilities
  styles.css             Tailwind 4 entry, design tokens, Fumadocs theme
tools/ped-export/        .NET 8 exporter (CodeWalker) for peds, props and overlays, with tests
```

Conventions: pages are async server components and interactivity lives in
`'use client'` components. Each `ui/` primitive has its own folder with an
`index.ts`. Visitor copy stays plain: picture, item, colour, address.

## Contributing and security

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Commits
and pull request titles follow
[Conventional Commits](https://www.conventionalcommits.org), for example
`feat(studio): add an only-the-garment switch`.

## License

[MIT](LICENSE) © 2026 Aura Development. Third-party code is credited in
[NOTICE](NOTICE). GTA V and its assets belong to Rockstar Games; this project is
not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.
