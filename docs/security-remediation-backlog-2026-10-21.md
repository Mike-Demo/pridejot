# Security audit remediation backlog — 2026-10-21

Issue creation was unavailable from this session, so the drafts below are ready to file. Each draft links back to parent issue #2.

## Prioritization

1. **Board enumeration bypass (high).** The anonymous publishable key can directly list all live boards, exposing board IDs and codes and defeating the code-as-capability control. This is immediately reachable without a board code and also supplies the board IDs needed to exploit the notes access finding.
2. **Cross-board notes access and mutation (high).** Anonymous callers with a live board ID can read, edit, heart, delete, or bulk-clear its notes. It is similarly serious and becomes directly exploitable through the enumeration finding above. These findings are related in an exploit chain, but have distinct controls and remediation, so they remain separate issues.
3. **Analytics tracker and board-code URLs (low).** The tracker loads for every route, including board URLs containing a live room code. This contradicts the no-tracking promise and has a small, safe removal fix.

## Remediation issue drafts

### `[security][high] Prevent anonymous listing of live boards`

**Body:**

**Finding:** Anonymous callers can list every live board without supplying its room code.

**Evidence:** `GRANT SELECT` on `public.boards` to `anon`, combined with a SELECT policy that only checks `expires_at > now()`, allows a direct PostgREST query with no code filter to return every unexpired board's ID, code, and expiry. The code filter in `getBoardByCode` is client-side and does not constrain direct API callers. Fingerprint: `anon-board-enumeration-bypasses-room-code`.

**Root cause:** The boards SELECT RLS policy checks only expiry, while direct anonymous SELECT is granted; no server-side check requires possession of the board code.

**Smallest fix:** Revoke direct anonymous SELECT on `public.boards`. Expose a `SECURITY DEFINER` RPC, `get_board_by_code(p_code text)`, that returns at most the single matching board and returns nothing for missing or expired codes. Update `getBoardByCode` to call the RPC so the publishable key cannot list boards.

Related to parent security audit issue #2.

### `[security][high] Require board credentials for note access`

**Body:**

**Finding:** An anonymous caller can read, edit, heart, delete, or bulk-clear notes on any live board without knowing its code.

**Evidence:** All notes RLS policies check only whether the parent board is unexpired, and `anon` has SELECT, INSERT, UPDATE, and DELETE grants on `public.notes`. A caller who knows a board ID can access its notes without its code; the board enumeration finding makes board IDs available without a code. Fingerprint: `cross-board-notes-read-write-delete-without-code`.

**Root cause:** Notes policies bind access only to parent-board expiry via `EXISTS` on the parent board, with no check for board-code possession or another per-board credential.

**Smallest fix:** Bind note access to code possession or a per-board random capability token issued on board lookup. Move note reads and writes behind `SECURITY DEFINER` RPCs that verify that credential, revoke direct anonymous access to `public.notes`, and authorize realtime delivery through a per-board topic using the same token.

Related to parent security audit issue #2.

### `[security][low] Remove analytics tracking from board pages`

**Body:**

**Finding:** Every page loads a third-party analytics tracker, including board pages whose URL contains the live room code.

**Evidence:** `src/routes/__root.tsx` unconditionally includes the umami-lite tracker with a fixed website ID, and the CSP allows its host in `script-src` and `connect-src`. No route exclusion prevents `/b/$code` URLs from being sent to the analytics host. This contradicts the no-tracking promise shown in `PrivacyBadge` and stated in the README. Fingerprint: `analytics-tracker-leaks-board-code-and-contradicts-no-tracking`.

**Root cause:** The root shell loads the tracker on every route and allows its host in the CSP; board URLs are not excluded.

**Smallest fix:** Remove the umami-lite script tag and its CSP allowlist entries from `src/routes/__root.tsx`. If analytics are intentionally retained instead, remove the no-tracking claims, exclude `/b/*` routes, and ensure no URL containing a room code is sent to the analytics host.

Related to parent security audit issue #2.

## Needs-validation issue draft

### `[security][needs-validation] Audit leads to validate`

**Body:**

Checklist of audit leads requiring validation. These are not confirmed findings and have no assigned severity.

- [ ] **Anonymous board and note creation has no count, size or field-range limits — possible storage, realtime and browser exhaustion.** Fingerprint: `unbounded-board-and-note-creation-resource-exhaustion`. Claimed root cause: absence of schema, RLS and client bounds on board/note count, note text size, and field ranges allegedly allows an anonymous script to exhaust operator storage/quota or participant browsers before platform throttling stops it. **Exact missing fact:** The hosted Supabase project's PostgREST/API rate-limit, per-IP throttling, request-body size limit, and database/storage quota configuration for this project — none appear anywhere in the repo, and they determine whether unbounded board/note inserts reach an exhaustion effect or are capped by the platform.

Related to parent security audit issue #2.
