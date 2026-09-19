# Live shared Queerboard

Turn the board from a single-screen scratchpad into a live shared session: phones scan the QR, land on the same board, and every note, drag, edit, heart and delete shows up on the conference-room screen within a moment.

## How it works for people in the room

1. The room screen opens Queerboard and gets a fresh board with a short code, e.g. `mikedemo.one/b/PRIDE42`.
2. Invite / presentation QR points at that board's address.
3. Anyone who scans joins the same board instantly. No sign-in, no names.
4. Everyone has full editing: add, type, drag, heart, delete, clear board.
5. Boards clean themselves up 24 hours after they were created. "Clear board" still empties one immediately.

## What changes on screen

- Home page becomes a small start screen: "Start a new board" plus a "Join with code" box.
- The board itself lives at `/b/CODE` and looks exactly as it does today — same pride backdrop, sticky notes, swatches, Present, Invite, Export.
- The header shows the board code so people can read it out loud.
- A small "live" indicator, and a quiet warning if the connection drops so nobody types into a dead board.
- Invite dialog and presentation QR encode the board's own address instead of the bare site.
- Notes no longer disappear on refresh; the "nothing is saved" copy in the seed notes and page description gets updated.

## Technical notes

Backend: enable Lovable Cloud (Postgres + realtime).

Schema (one migration, with GRANTs before RLS as required):

- `boards`: `id uuid pk`, `code text unique` (6 chars, unambiguous alphabet), `created_at timestamptz default now()`, `expires_at timestamptz default now() + interval '24 hours'`.
- `notes`: `id uuid pk`, `board_id uuid references boards(id) on delete cascade`, `x int`, `y int`, `rotation numeric`, `color_index int`, `text text`, `hearts int default 0`, `created_at`, `updated_at`.
- Notes store `color_index` into the existing `NOTE_COLORS` array rather than raw colors, so the palette stays code-owned.
- RLS on both tables, `TO anon` policies for select/insert/update/delete scoped to non-expired boards (`exists (select 1 from boards b where b.id = board_id and b.expires_at > now())`). This is deliberately open — the product is "anyone with the link can edit". Grants to `anon` and `service_role` accordingly.
- Realtime: `alter publication supabase_realtime add table notes;` and `replica identity full` on `notes`.
- Cleanup: a `delete_expired_boards()` SQL function plus a pg_cron hourly schedule; cascade removes notes.

Client:

- New routes `src/routes/b.$code.tsx` (the board, public, SSR default) and a rewritten `src/routes/index.tsx` start screen. Board component moves to `src/components/Whiteboard.tsx` largely unchanged; note state comes from the server instead of `useState(seedNotes)`.
- `src/lib/board.functions.ts` — `createBoard`, `getBoardByCode`, plus note mutations (`addNote`, `updateNote`, `moveNote`, `heartNote`, `deleteNote`, `clearBoard`) through `createServerFn`, using a server publishable client (no auth middleware, public by design), all input validated with Zod.
- Initial read: route loader → `ensureQueryData` → `useSuspenseQuery`, with `errorComponent` / `notFoundComponent` on the board route (unknown or expired code shows "This board has ended").
- Live updates: browser Supabase client subscribes to `postgres_changes` on `notes` filtered by `board_id`, applying insert/update/delete into local state. Subscription set up in `useEffect`, torn down on unmount.
- Dragging stays local and smooth: position updates render immediately and are written on pointer-up (plus a throttled write while dragging so other screens follow along). Text edits write on blur/Enter with light debouncing. Hearts write immediately and optimistically.
- Export, presentation mode and the favicon/logo work are untouched; export keeps capturing the editor board.
- Each route keeps its own `head()` metadata; the board route's title includes the code.

## Out of scope

- No accounts, presence avatars, or per-person attribution.
- No conflict resolution beyond last-write-wins on a per-note basis.
