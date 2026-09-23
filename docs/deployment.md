# Deployment

## What ships

The production build emits a fully static site. There is no server-side code at
request time: public pages are prerendered to HTML, and the live board reads and
writes the hosted Postgres database directly from the visitor's browser.

```sh
bun install                                        # install
bun run build                                      # vite build && node scripts/copy-static-output.mjs
# serve: dist/client
```

| What | Path |
| ---- | ---- |
| Static output directory (serve this) | `dist/client` |
| Raw prerender output, on toolchains that emit it | `.output/public` |

`scripts/copy-static-output.mjs` copies `.output/public` into `dist/client` when
that folder exists. With the currently pinned TanStack version the prerender pass
writes straight into `dist/client`, so the script reports "nothing to copy" and
exits 0. It is idempotent and safe to keep in the build command.

Prerendered routes:

- `/` → `dist/client/index.html`
- `/licenses` → `dist/client/licenses/index.html`

Also shipped from `public/`: `favicon.png`, `robots.txt` (allows all crawlers,
points at the sitemap), `sitemap.xml` (the two public routes), `_redirects`.

## URL fallback (required)

Board rooms live at `/b/<CODE>`. The code only exists once someone starts a
board, so those pages cannot be prerendered. The host must serve `index.html`
for unknown paths and let the app resolve the code client-side.

```
/*  /index.html  200
```

That is the contents of `public/_redirects`, which Netlify-style hosts (including
Spacefast) read automatically. On hosts that ignore it, enable the equivalent
"serve index.html for unknown paths" / SPA-fallback setting. Without it, deep
links and QR scans 404.

## Static host (Spacefast) settings

| Setting | Value |
| ------- | ----- |
| Install command | `bun install` (or `npm install`) |
| Build command | `vite build && node scripts/copy-static-output.mjs` |
| Output directory | `dist/client` |
| Environment | the three `VITE_SUPABASE_*` values (see [environment.md](environment.md)) |

Environment variables are inlined at **build** time, so the build environment
must have them; changing one requires a rebuild.

### Troubleshooting: "Cloudflare Worker entrypoints are not converted"

The repo keeps a Cloudflare config (`wrangler.dev.jsonc`, deliberately **not**
named `wrangler.jsonc`) and the `@cloudflare/vite-plugin` dependency for the
Lovable preview build only — the static build never uses either. If a build pack
still flags it (it may key off the dependency in `package.json`), enable the
"allow unsupported platform features" option in the host's build settings (the
equivalent of `--allow-unsupported-platform-features`). The worker is then
skipped and the static output in `dist/client` ships complete.

## Lovable preview build

`bun run build:dev` keeps the original Cloudflare Worker output used by the
Lovable preview environment. It is intentionally untouched by the static-hosting
setup; changing one build path should not affect the other.

## Domain and DNS

The public site is served at `https://mikedemo.one`. Point the domain at the
static host per that host's instructions — typically an `A`/`ALIAS` record for the
apex and a `CNAME` for `www`, both supplied by the host's dashboard. Two things
follow the domain:

- `public/sitemap.xml` and the `Sitemap:` line in `public/robots.txt` contain
  absolute `https://mikedemo.one` URLs. Update them if the domain changes.
- QR codes are generated from `window.location`, so they always point at whatever
  host the page was loaded from — no configuration needed.

Lovable also publishes to `https://pridejot.lovable.app`, which serves the same
app from the Lovable pipeline. DNS, TLS and any publish/login steps are handled
outside this repository.

## Database

The database (Postgres + realtime, provisioned through Lovable Cloud) is a
separate hosted service and is not deployed by this build. It must exist and hold
the `boards`/`notes` schema, RLS policies and the hourly `delete_expired_boards`
job described in [architecture.md](architecture.md) for the board to work. Static
hosting changes only how pages are delivered, not where ideas are stored.
