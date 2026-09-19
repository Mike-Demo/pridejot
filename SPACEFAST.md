# Spacefast build spec

Queerboard is built as a static site. Every public page is prerendered to HTML at
build time; the live board data is fetched in the visitor's browser.

## Commands

| Step    | Command |
| ------- | ------- |
| Install | `bun install` (or `npm install`) |
| Build   | `vite build && node scripts/copy-static-output.mjs` |

The build command is also `bun run build` / `npm run build`.

## Output

| What | Path |
| ---- | ---- |
| Static output directory (serve this) | `dist/client` |
| Raw Nitro/prerender output | `.output/public` |

`scripts/copy-static-output.mjs` copies `.output/public` into `dist/client`. It is
idempotent and skips gracefully if the output already lives in `dist/client`.

## Prerendered routes

- `/` → `dist/client/index.html`
- `/licenses` → `dist/client/licenses/index.html`

Board rooms live at `/b/<CODE>`; the code only exists once a board is started, so
those pages are served through the SPA fallback in `public/_redirects`
(`/*  /index.html  200`). Make sure that rule (or Spacefast's equivalent
"serve index.html for unknown paths" setting) is active, otherwise deep links to
a room 404.

## Also shipped

- `public/sitemap.xml` — lists the public routes
- `public/robots.txt` — allows all crawlers, points at the sitemap
- `public/_redirects` — SPA fallback for board deep links

## Environment

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
`VITE_SUPABASE_PROJECT_ID` are inlined at build time. Only the publishable key is
used; no secrets are present in the bundle.
