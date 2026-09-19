# Static hosting on Spacefast

## Step 0 result: it can be static

I checked every page before planning. Queerboard has no login, no per-visitor pages, no webhooks, and no server code that runs when someone opens a page — there are no server functions in the app at all. The database is reached straight from the visitor's browser, so every page can ship as the same HTML for everyone and fill itself in once it loads.

Two things worth knowing:

- The board pages (`/b/ABC234`) have a code in the address, so they can't be pre-built one by one — the code only exists once someone starts a board. They will be served by the catch-all rule (`_redirects`), which hands the site's HTML to any address and lets the app open the right board. This is the standard setup and works on Spacefast.
- The live board still needs the database it uses today. Static hosting only changes how the pages are delivered, not where the ideas are stored.

## What I'll do

1. **Pre-build the public pages.** Turn on prerendering and list `/` and `/licenses` explicitly, with auto-discovery off so Lovable's internal preview-only pages are never baked in. Then confirm each one produced its own `index.html`.
2. **Put the output where Spacefast looks.** Keep the normal build (no `static` preset — it breaks the build), and add a small script that copies the finished site into `dist/client`. The build command becomes `vite build && node scripts/copy-static-output.mjs`.
3. **Add the static files.** A `sitemap.xml` listing the two public pages, a `robots.txt` that points at it, and a `_redirects` file so deep links and board codes resolve. There's no server-generated sitemap to remove.
4. **Write `SPACEFAST.md`** with the install command, the build command, and the output folder.
5. **Verify.** Typecheck, full build, check the files exist, then open each built page in a browser and confirm it renders and that a board address still opens the right board after loading.

Page titles and descriptions are already defined per page, so they'll be baked into the built HTML — no change needed there.

## Technical notes

- `vite.config.ts`: add to the existing `tanstackStart()` call — `pages: [{ path: "/" }, { path: "/licenses" }]` and `prerender: { enabled: true, autoStaticPathsDiscovery: false }`. This project does **not** use `@lovable.dev/vite-tanstack-config` (plain `vite` `defineConfig` + `tanstackStart()` from `@tanstack/react-start/plugin/vite`, v1.168.56), so the version-2.20.0 caveat doesn't apply; the plugin's own prerender options are used instead. No `nitro: { preset: "static" }`.
- `scripts/copy-static-output.mjs`: idempotent — resolve `.output/public`; if it is missing but `dist/client/index.html` exists, exit 0 with a note; otherwise clean/create `dist/client` and recursively copy. Uses `node:fs`/`node:path` only.
- `package.json`: `"build": "vite build && node scripts/copy-static-output.mjs"`. `build:dev` left as is so Lovable preview is unaffected.
- `public/sitemap.xml`: `https://mikedemo.one/` and `https://mikedemo.one/licenses`. `public/robots.txt` keeps `User-agent: * / Allow: /` and gains `Sitemap: https://mikedemo.one/sitemap.xml`. `public/_redirects`: `/*  /index.html  200`.
- Prerender hang watch: no module-scope timers, pollers or clients in app code, and `QueryClient` is created inside `getRouter()` with no explicit `gcTime` (query-core's server default is `Infinity`, which arms no timer). If the build still hangs after writing files, add the `TSS_PRERENDERING`-guarded unref'd timeout provider in `src/router.tsx`.
- `VITE_SUPABASE_*` values are inlined at build time, which is correct for a static bundle (publishable key only).
- Verification: `bunx tsgo --noEmit`, `bun run build`, list `dist/client`, then Playwright against a `vite preview`-style static serve of `dist/client` — load `/`, `/licenses`, and a real board code to confirm hydration and URL state.

## Out of scope

GitHub, DNS, and any publishing or login steps — those stay with you.
