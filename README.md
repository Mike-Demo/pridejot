# Queerboard

A pride-themed shared idea whiteboard for conference rooms. One screen starts a
board and gets a short room code; everyone else scans the QR code or types the
code on a phone and lands on the same board. Sticky notes, drags, hearts and
deletions appear on every screen within a moment. No accounts, no names, no
analytics — and boards delete themselves 24 hours after they start.

- Production site: <https://mikedemo.one>
- Lovable-published address (secondary): <https://pridejot.lovable.app>

## Key features

- **Start or join a board** — `/` offers "Start a new board" (creates a
  six-character code such as `4RKWF6`) and "Join with code".
- **Live shared notes** — add, type, drag, heart and delete; everything syncs to
  every participant over Postgres realtime. Last write wins per note.
- **Join by QR** — an Invite dialog shows a large QR code plus the board's
  address; presentation mode keeps a small "Scan to join" QR on screen.
- **Presentation mode** — true fullscreen, enlarged notes, editing chrome
  hidden, Escape to exit. Built for room displays.
- **Export** — polished PNG or printable A4-landscape PDF of the current board,
  pride header band included.
- **Self-cleaning boards** — each board expires 24 hours after creation; an
  hourly database job removes expired boards and their notes. "Clear board"
  empties one immediately.
- **No analytics, no tracking** — the app ships zero tracking code, and says so
  with a badge above the footer.
- **Static delivery** — public pages are prerendered to HTML at build time; the
  board talks to the database straight from the browser.

## Attribution

Built on open source; the app also ships a `/licenses` page with the same
credits.

- [Web Awesome](https://webawesome.com) 3.12.0 — MIT (Font Awesome team). Used
  as the design system: components, tokens and layout utilities.
- [Font Awesome Free](https://fontawesome.com) 7.3.1 — icons (CC BY 4.0), fonts
  (SIL OFL 1.1), code (MIT).
- [React](https://react.dev) 19 — MIT.
- [TanStack Start / Router / Query](https://tanstack.com) — MIT.
- [html2canvas-pro](https://github.com/yorickshan/html2canvas-pro) and
  [jsPDF](https://github.com/parallax/jsPDF) — MIT, used for board export.
- [Supabase JS](https://supabase.com) — MIT, database and realtime client.

The design system sources under `src/design-system/` are a vendored copy owned by
the library project — do not edit them locally.

## Tech stack

| Area | Choice |
| ---- | ------ |
| Framework | TanStack Start (React 19, TypeScript) |
| Router | TanStack Router, file-based under `src/routes/` |
| Build tool | Vite |
| Styling | Web Awesome design system (`--wa-*` CSS tokens, web components). No Tailwind, no CSS-in-JS |
| Data | Postgres + realtime (Supabase, provisioned through Lovable Cloud), reached from the browser |
| Server state | TanStack Query (provider only; board reads are direct client calls) |
| Package manager | Bun (npm works too) |

## Local development

Prerequisites: **Bun 1.1+** (or Node.js 20+ with npm). TypeScript and all tooling
come from the lockfile.

```sh
bun install
cp .env.example .env   # then fill in the three values
bun run dev            # http://localhost:8080
```

`.env` needs the project's database URL, publishable key and project id — see
[docs/environment.md](docs/environment.md). Only publishable (public) values are
used; there are no secrets in the bundle.

Other scripts:

```sh
bun run lint       # ESLint
bunx tsgo --noEmit # typecheck
bun run build      # production static build
bun run build:dev  # Lovable preview build (Cloudflare worker output)
```

## Build & deployment

```sh
bun run build   # vite build && node scripts/copy-static-output.mjs
```

The production build prerenders `/` and `/licenses` to real HTML and writes the
whole site to **`dist/client`**. Serve that folder from any static host. Room
pages (`/b/CODE`) cannot be prerendered — the code only exists once a board
starts — so the host must serve `index.html` for unknown paths;
`public/_redirects` (`/*  /index.html  200`) does this on hosts that read it.

The database is a separate hosted service that the built site calls from the
browser, so the static output stays fully static. Details, troubleshooting and
DNS notes: [docs/deployment.md](docs/deployment.md).

## Documentation index

- [docs/architecture.md](docs/architecture.md) — codebase layout, design
  decisions, gotchas.
- [docs/deployment.md](docs/deployment.md) — hosting, fallback rules, domains.
- [docs/environment.md](docs/environment.md) — every environment variable.
- [roadmap.md](roadmap.md) — completed milestones and open items.
