# Repository hand-off documentation

Goal: someone can clone this repo, understand it, run it, and ship it without Lovable. Documentation only — no application code changes.

## What the audit found

- Queerboard: a pride-themed shared idea whiteboard. Start a board, get a 6-character room code, scan a QR code to join from a phone, add/drag/heart/delete sticky notes live, present fullscreen, export to PNG or PDF. Boards self-delete 24 hours after they start.
- TanStack Start (React 19 + TanStack Router file routes) on Vite, Web Awesome design system (tokens + web components, no Tailwind), Bun as package manager.
- Not purely static in the data sense: the pages prerender to plain HTML, but the live board reads and writes a hosted Postgres database (Supabase, provisioned by Lovable Cloud) directly from the browser using the publishable key. No login, no server functions, no edge functions. An hourly scheduled database job deletes expired boards.
- Build: `bun run build` → `vite build && node scripts/copy-static-output.mjs`, output in `dist/client`. `build:dev` keeps the Lovable preview (Cloudflare worker) path. Env: three `VITE_SUPABASE_*` values inlined at build time.

## Step 2 — Rewrite `README.md`

Replace the leftover starter-template README with real documentation: overview and live URL, key features, tech stack, attribution (Web Awesome MIT, Font Awesome Free, TanStack, React — matching the `/licenses` page), local development (Bun install, `.env` keys, `bun run dev` on port 8080), build and deployment summary, and a documentation index linking the new `docs/` files.

## Step 3 — New `docs/`

- `docs/architecture.md` — folder map (`src/routes`, `src/components`, `src/lib`, `src/design-system`, `scripts`, `public`), the database tables and access rules, how live updates work, drag write throttling, why export always captures the editor board, design-system token rules, and gotchas: design-system files are vendor-owned, the dialog `open` flag must be set on the element, the Cloudflare worker config is deliberately not named `wrangler.jsonc`, prerender and the worker plugin can't both run, room pages can't be prerendered.
- `docs/deployment.md` — static hosting on Spacefast (install/build/output), the `/*  /index.html  200` fallback that makes room links work, the Cloudflare-detection troubleshooting note, DNS/domain notes for mikedemo.one, and the fact that the database is a separate hosted service the built site talks to.
- `docs/environment.md` plus `.env.example` — each `VITE_SUPABASE_*` variable, what it controls, and that only the publishable key is used. No real secret values; the existing `.env` is untouched.

## Step 4 — `roadmap.md`

Consolidate the six archived plans in `.lovable/plan/` into one list: completed milestones checked off (whiteboard, favicon/logo, presentation mode, QR join, PNG/PDF export, live shared board, privacy badge, dependency fixes, static hosting, Spacefast build fix) and open items unchecked (confirm the hourly cleanup job actually runs, the privacy badge's shield icon not rendering, optional ideas: presence/who's on the board, larger join code on screen, boards lasting longer than 24 hours).

## Step 5 — Verification

Check every markdown link resolves to a committed file, grep the new docs for anything secret-shaped (only the publishable key may appear, and I'll reference it by name rather than value), and run the typecheck (`bunx tsgo --noEmit`) plus a build-log check.

## One thing to confirm

The sitemap and robots point at `mikedemo.one`, and Lovable also publishes to `pridejot.lovable.app`. I'll document `https://mikedemo.one` as the production site and mention the Lovable URL as the preview/secondary address — tell me if that's backwards.
