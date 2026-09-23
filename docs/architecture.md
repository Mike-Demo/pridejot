# Architecture

## Codebase layout

| Path | Responsibility |
| ---- | -------------- |
| `src/routes/__root.tsx` | Root shell: `<html>` classes for the design system, stylesheet/favicon links, sitewide head defaults, `QueryClientProvider`. Providers only — mockup preview routes render inside it, so any chrome here leaks into every frame. |
| `src/routes/index.tsx` | Start screen: "Start a new board" and "Join with code". |
| `src/routes/b.$code.tsx` | Board room at `/b/CODE`. Resolves the code, then renders `Whiteboard`. Handles loading, unknown/expired code ("This board has ended") and error states. |
| `src/routes/licenses.tsx` | `/licenses`, rendering the design system's `LicensesPage` pattern. |
| `src/routes/[__mockup].preview.$.tsx`, `[__component].preview.$.tsx` | Lovable editor preview routes. Not part of the public site and excluded from prerendering. |
| `src/components/Whiteboard.tsx` | The board itself: notes, drag, hearts, editing, presentation mode, Invite/QR dialog, export controls, realtime subscription. |
| `src/components/PrivacyBadge.tsx` | "No analytics, no tracking" pill. |
| `src/lib/board-service.ts` | All database access for boards and notes. |
| `src/lib/note-colors.ts` | The ten-colour note palette and `colorAt()`. Notes store a palette index, never a raw colour. |
| `src/lib/board-export.ts` | PNG and PDF export: capture, crop, pride header band, download. |
| `src/integrations/supabase/` | Generated database client and types. Do not edit. |
| `src/design-system/font-awsome-web-awesome-171158/` | Vendored Web Awesome design system. Owned by the library project; never edit locally (updates overwrite it). |
| `src/styles.css` | Small app-level rules only (presentation-mode overlays, QR card), all in `--wa-*` tokens. |
| `scripts/copy-static-output.mjs` | Post-build: copies `.output/public` into `dist/client` when a toolchain emits it. Idempotent. |
| `public/` | `favicon.png`, `robots.txt`, `sitemap.xml`, `_redirects`. |

## Data model

Two tables in the hosted Postgres database:

- `boards` — `id uuid pk`, `code text unique` (6 chars), `created_at`,
  `expires_at` (defaults to `now() + interval '24 hours'`).
- `notes` — `id uuid pk`, `board_id uuid references boards(id) on delete cascade`,
  `x`, `y`, `rotation`, `color_index`, `text`, `hearts`, `created_at`,
  `updated_at` (trigger-maintained). Indexed on `board_id`.

Row-level security is on for both tables, with policies for the anonymous role:

- Creating a board is open by design, but the insert check requires
  `code ~ '^[A-Z2-9]{6}$'` and an `expires_at` between now and ~25 hours out, so
  junk rows can't be written.
- Reading a board requires it to be unexpired.
- All note policies are scoped to a board whose `expires_at > now()`.

Realtime: `notes` has `replica identity full` and is in the realtime
publication. Cleanup: a `delete_expired_boards()` SECURITY DEFINER function
(EXECUTE granted to the service role only) runs hourly via pg_cron; the cascade
removes notes.

## Design decisions

- **No server at request time.** There are no server functions and no edge
  functions. The browser talks to Postgres directly with the publishable key, so
  every page can ship as identical static HTML. Access control lives entirely in
  RLS policies, which is why those policies are the security boundary and must
  stay reviewed.
- **Room code in the URL, not in state.** `/b/$code` is the single source of
  truth for which board you are on, so links, QR codes, refreshes and deep links
  all behave. Nothing about the board is stored in query params or local
  storage; a reload re-reads the board from the database.
- **Local state, server echo.** `Whiteboard` keeps notes in React state and
  subscribes to `postgres_changes` filtered by `board_id`. Incoming rows are
  merged, except for a note the local user is currently dragging or editing —
  that note keeps its local `x`/`y`/`text` so remote echoes never yank the cursor
  or the note out from under a hand. Conflict resolution is last-write-wins per
  note; nothing more was needed for a room-sized group.
- **Throttled drags.** Dragging renders locally every frame but writes at most
  every 120 ms (`DRAG_SYNC_MS`), with a final write on pointer-up. Hearts, text
  commits and clear write immediately.
- **Palette by index.** Notes store `color_index` into `NOTE_COLORS`, so the
  palette stays owned by code and can be retuned without a data migration.
- **TanStack Query is a provider, not a data layer.** Board reads happen in the
  component through `board-service.ts`. Leaving the `QueryClient` without an
  explicit `gcTime` also matters for the build — see the prerender gotcha below.
- **Design system only.** Every colour, space, radius and font size comes from a
  `--wa-*` token or a Web Awesome component prop. Deliberate exceptions, all in
  export code: the export title/date font sizes are computed from the captured
  image's pixel dimensions (a fixed token can't scale with the canvas), and the
  PDF margin is in millimetres because it is document geometry, not screen
  styling.

## Gotchas and lessons learned

- **The design system is vendor code.** Anything under
  `src/design-system/<library>/` is replaced wholesale when the library updates.
  Customise by composing in app code, never by editing those files.
- **Web Awesome dialogs are imperative.** Setting `open` as a React prop does
  nothing; set the property on the element ref (`dialogRef.current.open = true`)
  and listen for the element's own `wa-hide` event. Web Awesome form controls fire
  `wa-input` / `wa-change`, not React's `onChange`.
- **Never statically import the component bundle in SSR-evaluated code.** It
  touches `document` at module scope. `<WebAwesomeLoader />` imports it after
  hydration; keep it inside routed page content.
- **Export always captures the editor board.** The presentation board is scaled
  and clipped, so capturing it cuts notes off. Only the note delete button is
  marked `data-export-hide`; heart counts stay visible.
- **Prerender and the Cloudflare worker plugin cannot both run.** The worker
  bundle layout breaks the prerender preview server. `vite.config.ts` therefore
  enables the worker plugin only for `build:dev` (the Lovable preview) and
  prerendering only for the production build.
- **The wrangler config is deliberately named `wrangler.dev.jsonc`.** A
  root-level `wrangler.jsonc` makes static-host build packs flag an
  unconvertible Cloudflare Worker entrypoint and abort, even though the static
  build never uses it. The plugin is pointed at the renamed file via
  `configPath`.
- **Room pages are not prerenderable.** `pages` accepts concrete paths only and
  a board code exists only after a board starts, so `/b/CODE` relies on the SPA
  fallback.
- **Watch for timers during prerender.** A timer armed while the build renders
  pages holds the build process open after every file is written. Avoid
  module-scope timers, pollers and clients, and avoid setting an explicit
  `gcTime` on the `QueryClient` (the server default, `Infinity`, arms none).
- **Read browser-only state after hydration.** Anything from `window` (the board
  URL used by the QR code, fullscreen state) is read in an effect, not in a
  `useState` initialiser, or the server and client markup disagree.
- **Room codes avoid lookalikes.** The alphabet is `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
  — no `O`/`0` or `I`/`1` — because codes get read aloud. Generation retries on a
  unique violation (`23505`).
