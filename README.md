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
