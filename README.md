# S.C.R.U.B. Robotics website

Vite + React + TypeScript single-page site, with a three.js showroom on `/products`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally (port 4173) |
| `npm run check` | Type-check, lint and build: run before every deploy |
| `npm run images` | Rebuild the WebP photos and textures from `media-src/` |

## Deploying to Vercel

Import the `scrub-site` folder as a project (set it as the **Root Directory** if the repository holds the
whole `SCRUB` folder). `vercel.json` already sets everything:

- the build (`npm run build`, output `dist`)
- SPA routing: every page URL is served `index.html`, so `/products?bot=v2` or a refresh on `/impact` works
- caching: hashed files in `/assets` are cached for a year; photos, textures and the HDR for 30 days
- basic security headers

## Adding or replacing photos

Put the original JPG/PNG in `media-src/` at the same path as the site uses (for example
`media-src/impact/new-photo.jpg`), run `npm run images`, then reference `/media/impact/new-photo.webp`
in `src/data/content.ts`. The script writes a full-size WebP (max 1600 px), 480 px and 800 px versions,
and their sizes in `src/data/images.gen.ts`, which `<img>` uses for `srcset` so phones download the small file.

## What keeps it fast

- Only the landing page ships in the first download (~92 KB gzipped JS); other pages load on demand and are
  prefetched when a visitor points at their link. three.js (~267 KB gzipped) loads only on `/products`.
- Fonts are self-hosted and the two first-screen fonts are preloaded.
- The mission video waits until the first screen has loaded and only plays while it is on screen.
- The 3D showroom stops drawing when scrolled out of view, lowers its resolution (and then its frame rate) on
  slow devices, falls back to photo cards on devices without a real GPU, builds the robots one at a time and
  compiles shaders and uploads textures behind the loading screen.

## The 3D robots

The three robots (V1, V2, V4) are built in code from the team's Fusion CAD views, one file each in
`src/three/models/`, from small shared parts (`parts.tsx`) and a PBR material palette (`mat.ts`) that uses CC0
photo-scanned textures from `public/textures`. There is no model file to download.

- **Proportions:** `src/three/sizes.ts` holds each robot's size relative to V1. The products grid uses the real
  ratios; the home journey softens them (it shows one robot at a time). Replace them with measured dimensions
  when they are known.
- **Home page leaf sweep:** V1's conveyor geometry lives in `src/three/v1Belt.ts`, shared by the model and by the
  leaf animation, so the leaves ride the real belt into the basket.
- **Ambient occlusion:** `src/three/ao.ts` adds a half-resolution screen-space AO pass (about 2 ms a frame on a
  discrete GPU). It switches itself off when the frame rate drops, and falls back to plain rendering on GPUs
  without float render targets. Add `?ao=0` to the first URL to disable it, or `?ao=debug` to see the AO term.
- **Text and specs:** hotspot labels are in `src/three/hotspots.ts`; everything else is in `src/data/content.ts`.
  Items marked `draft` there are placeholders for the team to confirm.

## Lint

`npm run lint` (oxlint) is clean. The React-compiler rules about mutation and refs are switched off for
`src/three/` only (see `.oxlintrc.json`): a three.js scene mutates three.js objects and reads refs inside the
frame loop by design.
